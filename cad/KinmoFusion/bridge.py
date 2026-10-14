"""Loopback-only, opt-in transport. Fusion calls happen in the main-thread handler."""
import json
import os
import re
from pathlib import Path
import sys
from collections import deque
import math
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

MAX_BODY = 2 * 1024 * 1024
MAX_POINTS = 30000


def normalize_origin(value):
    parsed = urlsplit(value.strip())
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Use an origin without credentials, query or fragment.")
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("Use the HTTP(S) address of Kinematika Studio.")
    if parsed.scheme == "http" and parsed.hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("Remote application origins must use HTTPS.")
    if parsed.path not in ("", "/"):
        raise ValueError("Enter only the origin, for example https://app.example.com.")
    return parsed.scheme + "://" + parsed.netloc


def number(value, limit=100000):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or abs(value) > limit or not math.isfinite(value):
        raise ValueError("Invalid numeric geometry.")
    return float(value)


def point(value):
    if not isinstance(value, dict):
        raise ValueError("Invalid point.")
    return {"x": number(value.get("x")), "y": number(value.get("y"))}


def validate_snapshot(data):
    if not isinstance(data, dict) or data.get("format") != "KINMO-CAD" or type(data.get("version")) is not int or data.get("version") != 1 or data.get("units") != "mm" or data.get("referenceOnly") is not True:
        raise ValueError("Unsupported CAD snapshot. Expected reference geometry in millimetres.")
    name = data.get("name")
    if not isinstance(name, str) or not name.strip() or len(name) > 100:
        raise ValueError("Invalid drawing name.")
    source = data.get("entities")
    if not isinstance(source, list) or len(source) > 2000:
        raise ValueError("Too many entities.")
    entities = []
    count = 0
    for entity in source:
        if not isinstance(entity, dict):
            raise ValueError("Invalid entity.")
        kind = entity.get("kind")
        base = {"kind": kind, "name": str(entity.get("name", ""))[:100], "layer": str(entity.get("layer", ""))[:50]}
        if kind == "polyline":
            points = entity.get("points")
            if not isinstance(points, list) or len(points) < 2 or len(points) > 1001:
                raise ValueError("Invalid polyline.")
            base.update(points=[point(p) for p in points], closed=entity.get("closed") is True)
            count += len(points)
        elif kind == "circle":
            radius = number(entity.get("radius"), 5000)
            if radius <= 0:
                raise ValueError("Invalid radius.")
            base.update(center=point(entity.get("center")), radius=radius)
            count += 1
        elif kind == "text":
            text = entity.get("text")
            height = number(entity.get("height"), 100)
            if not isinstance(text, str) or len(text) > 150 or height <= 0:
                raise ValueError("Invalid dimension text.")
            base.update(at=point(entity.get("at")), text=text, height=height)
            count += 1
        else:
            raise ValueError("Unsupported entity type.")
        if count > MAX_POINTS:
            raise ValueError("Too many points.")
        entities.append(base)
    if not entities:
        raise ValueError("The drawing is empty.")
    return {"name": name.strip(), "entities": entities, "estimated": data.get("estimated") is True}


def pairing_path():
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", str(Path.home() / "AppData" / "Roaming")))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config")))
    return base / "KinematikaStudio" / "KinmoFusion" / "pairing.json"


def load_pairing(path):
    try:
        with Path(path).open("r", encoding="utf-8") as file:
            value = json.loads(file.read(4097))
        if not isinstance(value, dict) or not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", value.get("key", "")):
            return None
        return {"origin": normalize_origin(value["origin"]), "key": value["key"]}
    except (OSError, ValueError, TypeError, KeyError):
        return None


def save_pairing(path, origin, key):
    origin = normalize_origin(origin)
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", key):
        raise ValueError("Invalid pairing key.")
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_name(path.name + "." + secrets.token_hex(8) + ".tmp")
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump({"origin": origin, "key": key}, file)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def forget_pairing(path):
    Path(path).unlink(missing_ok=True)


class DispatchError(RuntimeError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


class Jobs:
    def __init__(self, notify):
        self.notify = notify
        self.lock = threading.RLock()
        self.records = {}
        self.events = deque(maxlen=100)

    def submit(self, snapshot):
        with self.lock:
            if any(j["state"] in ("pending", "running") for j in self.records.values()):
                self.log("busy-rejected")
                raise DispatchError("fusion_busy")
            now = time.monotonic()
            self.records = {key: job for key, job in self.records.items() if now - job["created"] < 120}
            if len(self.records) >= 10:
                oldest = min(self.records, key=lambda key: self.records[key]["created"])
                del self.records[oldest]
            job_id = secrets.token_hex(16)
            self.records[job_id] = {"state": "pending", "snapshot": snapshot, "created": now}
        try:
            accepted = self.notify(job_id)
        except Exception as error:
            self.log("dispatch-exception", errorType=type(error).__name__)
            accepted = False
        # Some Python API wrappers return None after successfully posting a void event.
        # Only an explicit False is a rejection; completion is always confirmed by the handler.
        if accepted is False:
            self.finish(job_id, False)
            self.log("dispatch-rejected")
            raise DispatchError("fusion_event_rejected")
        if accepted == "manual":
            with self.lock:
                self.records[job_id]["dispatchMode"] = "manual"
        self.log("event-posted", callbackResult=type(accepted).__name__)
        return job_id

    def log(self, event, **details):
        with self.lock:
            self.events.append({"time": time.time(), "event": event, **details})

    def diagnostics(self):
        with self.lock:
            return {"busy": self.is_busy(), "events": list(self.events), "jobs": [{"id": key, "state": value["state"], "ageSeconds": round(time.monotonic()-value["created"], 2)} for key, value in self.records.items()]}

    def is_busy(self):
        with self.lock:
            return any(job["state"] in ("pending", "running") for job in self.records.values())

    def take(self, job_id):
        self.log("handler-started")
        with self.lock:
            record = self.records.get(job_id)
            if not record or record["state"] != "pending":
                return None
            record["state"] = "running"
            return record.get("snapshot")

    def pending_ids(self):
        with self.lock:
            return [key for key, value in self.records.items() if value["state"] == "pending"]

    def finish(self, job_id, success, message=""):
        self.log("import-finished", success=bool(success))
        with self.lock:
            if job_id in self.records:
                record = self.records[job_id]
                record["state"] = "done" if success else "error"
                record["message"] = message[:250] if message else ("Reference drawing created." if success else "Fusion import failed.")
                record.pop("snapshot", None)

    def status(self, job_id):
        with self.lock:
            record = self.records.get(job_id)
            return {"state": record["state"], "message": record.get("message", ""), "dispatchMode": record.get("dispatchMode", "automatic")} if record else None


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False
    request_queue_size = 4

    def __init__(self, origin, key, jobs, port=8765):
        self.origin = normalize_origin(origin)
        self.key = key
        self.jobs = jobs
        self.slots = threading.BoundedSemaphore(8)
        super().__init__(("127.0.0.1", port), Handler)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            request.settimeout(5)
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def log_message(self, *_args):
        pass  # Never log a pairing key, geometry, headers or user project names.

    def reply(self, status, payload, cors=False):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        if cors:
            self.send_header("Access-Control-Allow-Origin", self.server.origin)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()
        # Drain bounded rejected bodies after replying. Closing a Windows socket
        # with unread bytes can reset it before the browser receives the error.
        if self.command == "POST" and not getattr(self, "_body_read", False):
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if 0 < length <= MAX_BODY:
                    self.rfile.read(length)
                elif length > MAX_BODY or self.headers.get("Transfer-Encoding"):
                    self.rfile.read1(4096)
            except (ValueError, OSError):
                pass

    def allowed_origin(self):
        return self.headers.get("Origin") == self.server.origin

    def authorized(self):
        if not self.allowed_origin():
            self.reply(403, {"error": "Origin not allowed."})
            return False
        key = self.headers.get("X-Kinmo-Key", "")
        if len(key) > 100 or not secrets.compare_digest(key.encode("utf-8"), self.server.key.encode("ascii")):
            self.reply(401, {"error": "Invalid pairing key."}, True)
            return False
        return True

    def do_OPTIONS(self):
        if not self.allowed_origin() or self.headers.get("Access-Control-Request-Method") not in ("GET", "POST"):
            self.reply(403, {"error": "Origin or method not allowed."})
            return
        requested = {value.strip().lower() for value in self.headers.get("Access-Control-Request-Headers", "").split(",") if value.strip()}
        if requested - {"x-kinmo-key", "content-type"}:
            self.reply(403, {"error": "Headers not allowed."})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.server.origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Kinmo-Key")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "0")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self):
        if not self.authorized():
            return
        if self.path == "/status":
            self.reply(200, {"app": "KinmoFusion", "version": 1, "referenceOnly": True, "busy": self.server.jobs.is_busy(), "addonVersion": "1.2.0", "diagnostics": self.server.jobs.diagnostics()}, True)
        elif self.path.startswith("/jobs/"):
            value = self.server.jobs.status(self.path.removeprefix("/jobs/"))
            self.reply(200 if value else 404, value or {"error": "Unknown job."}, True)
        else:
            self.reply(404, {"error": "Not found."}, True)

    def do_POST(self):
        if not self.authorized():
            return
        if self.path != "/snapshot":
            self.reply(404, {"error": "Not found."}, True)
            return
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json" or self.headers.get("Transfer-Encoding"):
            self.reply(415, {"error": "Use a bounded JSON request."}, True)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                self.reply(413, {"error": "The payload must be 1 byte to 2 MB."}, True)
                return
            self._body_read = True
            body = self.rfile.read(length)
            if len(body) != length:
                raise ValueError("Incomplete request.")
            data = validate_snapshot(json.loads(body.decode("utf-8")))
            job = self.server.jobs.submit(data)
            self.reply(202, {"job": job, "state": "pending"}, True)
        except DispatchError as error:
            self.reply(409, {"error": "Fusion is busy or did not accept the import.", "code": error.code, "diagnostics": self.server.jobs.diagnostics()}, True)
        except (ValueError, TypeError, UnicodeError, RecursionError):
            self.reply(400, {"error": "Invalid CAD geometry."}, True)
        except (TimeoutError, OSError):
            self.reply(408, {"error": "The request timed out."}, True)
