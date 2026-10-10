"""Autodesk Fusion add-in. Starts only when the user explicitly runs it."""
import secrets
import threading
import adsk.core
import adsk.fusion
from .bridge import Jobs, LocalServer, normalize_origin

EVENT_ID = "kinematika.studio.reference-import.v1"
_server = None
_thread = None
_event = None
_handler = None


def import_drawing(app, snapshot):
    """Create a new, unsaved reference document; never touch an existing design."""
    document = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    document.name = snapshot["name"] + " · Kinmo reference"
    design = adsk.fusion.Design.cast(app.activeProduct)
    if not design:
        raise RuntimeError("Fusion did not create a design document.")
    design.fusionUnitsManager.distanceDisplayUnits = adsk.fusion.DistanceUnits.MillimeterDistanceUnits
    root = design.rootComponent
    groups = {}
    try:
        for entity in snapshot["entities"]:
            layer = entity["layer"] or "Reference"
            if layer not in groups:
                sketch = root.sketches.add(root.xYConstructionPlane)
                sketch.name = "Kinmo · " + layer
                sketch.isComputeDeferred = True
                groups[layer] = sketch
            sketch = groups[layer]
            # Fusion API lengths are centimetres. Snapshot Y is already CAD-up.
            def position(p):
                return adsk.core.Point3D.create(p["x"] / 10, p["y"] / 10, 0)
            if entity["kind"] == "polyline":
                points = entity["points"]
                pairs = list(zip(points, points[1:]))
                if entity["closed"]:
                    pairs.append((points[-1], points[0]))
                for a, b in pairs:
                    if abs(a["x"] - b["x"]) + abs(a["y"] - b["y"]) < 0.00001:
                        continue
                    line = sketch.sketchCurves.sketchLines.addByTwoPoints(position(a), position(b))
                    line.isFixed = True
            elif entity["kind"] == "circle":
                circle = sketch.sketchCurves.sketchCircles.addByCenterRadius(position(entity["center"]), entity["radius"] / 10)
                circle.isFixed = True
            elif entity["kind"] == "text":
                at, height = entity["at"], entity["height"]
                text = sketch.sketchTexts.createInput2(entity["text"], height / 10)
                text.setAsMultiLine(
                    position(at), position({"x": at["x"] + max(30, len(entity["text"]) * height), "y": at["y"] - height * 3}),
                    adsk.core.HorizontalAlignments.LeftHorizontalAlignment,
                    adsk.core.VerticalAlignments.TopVerticalAlignment, 0,
                )
                sketch.sketchTexts.add(text)
        root.attributes.add("Kinmo", "ReferenceOnly", "true")
        root.attributes.add("Kinmo", "Estimated", "true" if snapshot["estimated"] else "false")
    finally:
        for sketch in groups.values():
            sketch.isComputeDeferred = False
    app.activeViewport.fit()
    return document


class ImportHandler(adsk.core.CustomEventHandler):
    def __init__(self, app, jobs):
        super().__init__()
        self.app = app
        self.jobs = jobs

    def notify(self, args):
        job_id = adsk.core.CustomEventArgs.cast(args).additionalInfo
        data = self.jobs.take(job_id)
        if not data:
            return
        try:
            import_drawing(self.app, data)
            self.jobs.finish(job_id, True)
        except Exception:
            self.jobs.finish(job_id, False, "Import failed; an incomplete NEW reference document may remain. Existing designs were not changed.")


def run(_context):
    global _server, _thread, _event, _handler
    app = adsk.core.Application.get()
    ui = app.userInterface
    try:
        if _server:
            ui.messageBox("KinmoFusion already runs. Stop it before pairing again.")
            return
        origin, cancelled = ui.inputBox(
            "Enter the exact Kinematika Studio origin (scheme + host + optional port).\nOnly this website will be allowed. file:// is not supported.",
            "KinmoFusion · allow application", "http://127.0.0.1:5173",
        )
        if cancelled:
            return
        origin = normalize_origin(origin)
        key = secrets.token_urlsafe(32)
        jobs = Jobs(lambda job_id: app.fireCustomEvent(EVENT_ID, job_id))
        _event = app.registerCustomEvent(EVENT_ID)
        if not _event:
            raise RuntimeError("Custom event is already registered.")
        _handler = ImportHandler(app, jobs)
        _event.add(_handler)
        _server = LocalServer(origin, key, jobs)
        _thread = threading.Thread(target=_server.serve_forever, name="KinmoFusion-loopback", daemon=True)
        _thread.start()
        ui.messageBox(
            "KinmoFusion is listening ONLY on http://127.0.0.1:8765.\n"
            "Allowed application: " + origin + "\n\n"
            "Paste this temporary pairing key into Kinematika Studio > Export > Autodesk Fusion:\n\n" + key +
            "\n\nEach explicit Send creates a NEW unsaved reference drawing. No existing design is edited, deleted or saved.\n"
            "Stop the add-in to close the connection. A new run generates a new key.",
            "KinmoFusion · local pairing",
        )
    except Exception:
        stop(_context)
        ui.messageBox("KinmoFusion could not start. Check the application origin and whether port 8765 is already in use.")


def stop(_context):
    global _server, _thread, _event, _handler
    app = adsk.core.Application.get()
    if _server:
        if _thread and _thread.is_alive():
            _server.shutdown()
        _server.server_close()
        _server = None
    if _thread:
        _thread.join(timeout=2)
        _thread = None
    if _event:
        if _handler:
            _event.remove(_handler)
        app.unregisterCustomEvent(EVENT_ID)
    _event = None
    _handler = None
