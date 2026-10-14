"""Stdlib tests only. No Autodesk application is opened, driven or modified."""
import http.client
import importlib.util
import json
from pathlib import Path
import sys
import threading
import types
import unittest
from unittest.mock import patch
import zipfile
import io
import subprocess
import shutil

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / "cad" / "KinmoFusion"
spec = importlib.util.spec_from_file_location("kinmo_test_bridge", FOLDER / "bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
MOCK_KEY = "mock-pairing-value-not-a-real-key"
ORIGIN = "http://127.0.0.1:5176"


def snapshot():
    return {
        "format": "KINMO-CAD", "version": 1, "units": "mm",
        "referenceOnly": True, "estimated": True, "name": "Test reference",
        "entities": [
            {"kind": "polyline", "layer": "LINK", "points": [{"x": 10, "y": -20}, {"x": 110, "y": -20}], "closed": False},
            {"kind": "circle", "layer": "BEARING", "center": {"x": 10, "y": -20}, "radius": 4},
            {"kind": "text", "layer": "DIMENSIONS", "at": {"x": 50, "y": 20}, "text": "Dĺžka 100 mm", "height": 7},
        ],
    }

def js_reference_snapshot(kind="drawer", closed=False):
    node = shutil.which("node")
    if not node:
        raise unittest.SkipTest("Node executable not available for contour test.")
    script = """
await import('./engine.js'); await import('./double-drawer.js'); await import('./editor.js');
await import('./physics.js'); await import('./slot-outline.js'); await import('./exports.js');
"""
    if closed:
        script += """
const p = Kinematics.preset('custom'), slot = Kinematics.makeElement('slot',10,20);
Object.assign(slot,{curveKind:'polyline',slotWidth:8,controls:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100},{x:0,y:0}]});
p.elements=[slot];
"""
    else:
        script += "const p = Kinematics.preset(" + json.dumps(kind) + ");"
    script += "process.stdout.write(JSON.stringify(KinmoExport.cadSnapshot(p,Kinematics.solve(p,0),{slotOutlines:true,dimensions:false,labels:false})));"
    result = subprocess.run([node, "--input-type=module", "-e", script], cwd=ROOT, check=True, stdout=subprocess.PIPE)
    return json.loads(result.stdout)


class SnapshotTests(unittest.TestCase):
    def test_browser_contours_fit_bridge_limits_and_keep_centerlines(self):
        for kind, expected in [("drawer", 1), ("double-drawer", 3)]:
            source = js_reference_snapshot(kind)
            value = bridge.validate_snapshot(source)
            outlines = [e for e in value["entities"] if e["layer"] == "SLOT_REFERENCE_OUTLINE"]
            self.assertEqual(len(outlines), expected)
            self.assertTrue(all(e["closed"] and 3 <= len(e["points"]) <= 1001 for e in outlines))
            self.assertTrue(any(e["layer"] == "SLOT" and not e["closed"] for e in value["entities"]))
            self.assertTrue(source["referenceOnly"])

    def test_valid_shape_and_safe_projection(self):
        source = snapshot()
        source["script"] = "ignored"
        value = bridge.validate_snapshot(source)
        self.assertEqual(set(value), {"name", "entities", "estimated"})
        self.assertEqual(value["entities"][0]["points"][1]["x"], 110)
        self.assertNotIn("script", value)
        self.assertEqual(source["units"], "mm")

    def test_empty_and_unknown_formats(self):
        for changes in [
            {"format": "OTHER"}, {"units": "cm"}, {"version": True}, {"version": 2},
            {"referenceOnly": False}, {"entities": []}, {"name": ""},
        ]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                bridge.validate_snapshot({**snapshot(), **changes})

    def test_invalid_numbers_and_coordinates(self):
        for value in [True, "5", float("nan"), float("inf"), 100001, 10 ** 400]:
            with self.subTest(value=str(value)[:25]), self.assertRaises(ValueError):
                data = snapshot()
                data["entities"][0]["points"][0]["x"] = value
                bridge.validate_snapshot(data)

    def test_invalid_entities(self):
        for entity in [
            {"kind": "script"}, {"kind": "polyline", "points": [{"x": 0, "y": 0}]},
            {"kind": "polyline", "points": [{"x": 0, "y": 0}] * 1002},
            {"kind": "circle", "center": {"x": 0, "y": 0}, "radius": 0},
            {"kind": "text", "at": {"x": 0, "y": 0}, "height": 1, "text": "x" * 151},
        ]:
            with self.subTest(kind=entity["kind"]), self.assertRaises(ValueError):
                bridge.validate_snapshot({**snapshot(), "entities": [entity]})

    def test_total_point_limit(self):
        entity = {"kind": "polyline", "points": [{"x": i, "y": 0} for i in range(1001)]}
        with self.assertRaises(ValueError):
            bridge.validate_snapshot({**snapshot(), "entities": [entity] * 30})

    def test_allowed_origins(self):
        for origin in [ORIGIN, "http://localhost:5173", "https://app.example.com/"]:
            self.assertEqual(bridge.normalize_origin(origin), origin.rstrip("/"))
        for origin in ["file:///index.html", "http://remote.example.com", "https://a:b@app.example.com", "https://app.example.com/path", "https://app.example.com?key=x", "null"]:
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                bridge.normalize_origin(origin)


class JobTests(unittest.TestCase):
    def test_one_pending_job_then_completion(self):
        jobs = bridge.Jobs(lambda _job: True)
        job = jobs.submit(snapshot())
        self.assertEqual(len(job), 32)
        with self.assertRaises(RuntimeError):
            jobs.submit(snapshot())
        self.assertIsNotNone(jobs.take(job))
        jobs.finish(job, True)
        self.assertIsNone(jobs.take(job))
        self.assertEqual(jobs.status(job)["state"], "done")
        self.assertNotEqual(jobs.submit(snapshot()), job)

    def test_failed_notification_does_not_leave_pending_geometry(self):
        for notify in [lambda _job: False, lambda _job: 1 / 0]:
            jobs = bridge.Jobs(notify)
            with self.assertRaises(RuntimeError):
                jobs.submit(snapshot())
            self.assertFalse(any(record["state"] == "pending" for record in jobs.records.values()))
            self.assertFalse(any("snapshot" in record for record in jobs.records.values()))

    def test_void_event_posting_waits_for_main_thread_and_diagnostics_omit_geometry(self):
        jobs = bridge.Jobs(lambda _job: None)
        job = jobs.submit(snapshot())
        self.assertEqual(jobs.status(job)["state"], "pending")
        self.assertTrue(jobs.diagnostics()["busy"])
        self.assertNotIn("entities", json.dumps(jobs.diagnostics()))
        self.assertIsNotNone(jobs.take(job))
        jobs.finish(job, True)
        self.assertFalse(jobs.diagnostics()["busy"])
        self.assertEqual(jobs.status(job)["state"], "done")

    def test_explicit_rejection_has_specific_code(self):
        jobs = bridge.Jobs(lambda _job: False)
        with self.assertRaises(bridge.DispatchError) as error:
            jobs.submit(snapshot())
        self.assertEqual(error.exception.code, "fusion_event_rejected")
        self.assertFalse(jobs.diagnostics()["busy"])

    def test_manual_fallback_can_be_claimed_once_and_blocks_duplicate_imports(self):
        jobs = bridge.Jobs(lambda _job: "manual")
        job = jobs.submit(snapshot())
        self.assertEqual(jobs.status(job)["dispatchMode"], "manual")
        self.assertEqual(jobs.pending_ids(), [job])
        self.assertIsNotNone(jobs.take(job))
        self.assertIsNone(jobs.take(job))
        self.assertTrue(jobs.is_busy())
        with self.assertRaises(bridge.DispatchError):
            jobs.submit(snapshot())
        jobs.finish(job, True)
        self.assertFalse(jobs.is_busy())

    def test_status_retention_is_bounded(self):
        jobs = bridge.Jobs(lambda _job: True)
        for _ in range(25):
            job = jobs.submit(snapshot())
            jobs.finish(job, True)
        self.assertEqual(len(jobs.records), 10)
        self.assertIsNone(jobs.status("unknown"))


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.jobs = bridge.Jobs(lambda _job: True)
        self.server = bridge.LocalServer(ORIGIN, MOCK_KEY, self.jobs, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method, path, body=None, headers=None):
        values = {"Origin": ORIGIN, "X-Kinmo-Key": MOCK_KEY}
        if body is not None:
            values["Content-Type"] = "application/json"
        values.update(headers or {})
        connection = http.client.HTTPConnection(*self.server.server_address, timeout=2)
        try:
            connection.request(method, path, body=body, headers=values)
            response = connection.getresponse()
            data = response.read()
            return response.status, dict(response.getheaders()), json.loads(data) if data else None
        finally:
            connection.close()

    def test_binding_and_read_status(self):
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        status, headers, value = self.request("GET", "/status")
        self.assertEqual(status, 200)
        self.assertTrue(value["referenceOnly"])
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(self.jobs.records, {})

    def test_origin_and_key_are_both_required(self):
        for changes, expected in [({"Origin": "https://evil.example.com"}, 403), ({"Origin": "null"}, 403), ({"X-Kinmo-Key": ""}, 401), ({"X-Kinmo-Key": "mismatch"}, 401), ({"X-Kinmo-Key": "é" * 30}, 401)]:
            status, headers, _ = self.request("GET", "/status", headers=changes)
            self.assertEqual(status, expected)
            if expected == 403:
                self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_preflight_and_private_network_header(self):
        status, headers, _ = self.request("OPTIONS", "/snapshot", headers={
            "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type, x-kinmo-key",
        })
        self.assertEqual(status, 204)
        self.assertEqual(headers["Access-Control-Allow-Private-Network"], "true")
        self.assertNotIn("Access-Control-Allow-Credentials", headers)
        for headers in [
            {"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"},
            {"Access-Control-Request-Method": "DELETE"},
            {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization"},
        ]:
            self.assertEqual(self.request("OPTIONS", "/snapshot", headers=headers)[0], 403)

    def test_post_queues_only_a_valid_snapshot(self):
        status, _, result = self.request("POST", "/snapshot", json.dumps(snapshot()))
        self.assertEqual(status, 202)
        self.assertEqual(self.request("GET", "/jobs/" + result["job"])[2]["state"], "pending")
        self.assertEqual(self.request("POST", "/snapshot", json.dumps(snapshot()))[0], 409)
        self.jobs.finish(result["job"], True)
        self.assertEqual(self.request("GET", "/jobs/" + result["job"])[2]["state"], "done")
        self.assertEqual(self.request("GET", "/jobs/missing")[0], 404)

    def test_media_size_route_and_invalid_json(self):
        for path, body, headers, expected in [
            ("/wrong", "{}", {}, 404), ("/snapshot", "{}", {"Content-Type": "text/plain"}, 415),
            ("/snapshot", "{}", {"Transfer-Encoding": "chunked"}, 415),
            ("/snapshot", "", {}, 413), ("/snapshot", "{}", {"Content-Length": str(bridge.MAX_BODY + 1)}, 413),
            ("/snapshot", "{}", {}, 400), ("/snapshot", "[", {}, 400),
            ("/snapshot", "[" * 1500 + "]" * 1500, {}, 400),
        ]:
            with self.subTest(expected=expected):
                self.assertEqual(self.request("POST", path, body, headers)[0], expected)
        self.assertEqual(self.jobs.records, {})

    def test_transport_does_not_run_fusion_api_on_worker(self):
        notifications = []
        self.jobs.notify = lambda job: notifications.append(job) or True
        self.assertEqual(self.request("POST", "/snapshot", json.dumps(snapshot()))[0], 202)
        self.assertEqual(len(notifications), 1)
        self.assertEqual(self.jobs.status(notifications[0])["state"], "pending")


class TextInput:
    def __init__(self, text, height):
        self.text, self.height, self.placement = text, height, None

    def setAsMultiLine(self, *placement):
        self.placement = placement


class Sketch:
    def __init__(self):
        self.lines, self.circles, self.texts = [], [], []
        self.isComputeDeferred = False
        def line(a, b):
            item = types.SimpleNamespace(a=a, b=b, isFixed=False)
            self.lines.append(item)
            return item
        def circle(center, radius):
            item = types.SimpleNamespace(center=center, radius=radius, isFixed=False)
            self.circles.append(item)
            return item
        self.sketchCurves = types.SimpleNamespace(sketchLines=types.SimpleNamespace(addByTwoPoints=line), sketchCircles=types.SimpleNamespace(addByCenterRadius=circle))
        self.sketchTexts = types.SimpleNamespace(createInput2=TextInput, add=self.texts.append)


class App:
    def __init__(self):
        self.old_sketches = []
        self.old_design = types.SimpleNamespace(untouched=True)
        self.activeProduct = self.old_design
        self.created, self.sketches, self.attributes = [], [], []
        def add_sketch(_plane):
            sketch = Sketch()
            self.sketches.append(sketch)
            return sketch
        self.new_design = types.SimpleNamespace(
            fusionUnitsManager=types.SimpleNamespace(distanceDisplayUnits=None),
            rootComponent=types.SimpleNamespace(
                sketches=types.SimpleNamespace(add=add_sketch), xYConstructionPlane=object(),
                attributes=types.SimpleNamespace(add=lambda *args: self.attributes.append(args)),
            ),
        )
        def document(_kind):
            result = types.SimpleNamespace(name="Untitled")
            self.created.append(result)
            self.activeProduct = self.new_design
            return result
        self.documents = types.SimpleNamespace(add=document)
        self.fitted = False
        def fit():
            if any(s.isComputeDeferred for s in self.sketches):
                raise AssertionError("Fit must follow sketch recomputation.")
            self.fitted = True
        self.activeViewport = types.SimpleNamespace(fit=fit)


def load_mock_addin():
    adsk, core, fusion = types.ModuleType("adsk"), types.ModuleType("adsk.core"), types.ModuleType("adsk.fusion")
    adsk.core, adsk.fusion = core, fusion
    core.CustomEventHandler = object
    core.CommandEventHandler = object
    core.CommandCreatedEventHandler = object
    core.CustomEventArgs = types.SimpleNamespace(cast=lambda value: value)
    core.Point3D = types.SimpleNamespace(create=lambda x, y, z: types.SimpleNamespace(x=x, y=y, z=z))
    core.DocumentTypes = types.SimpleNamespace(FusionDesignDocumentType=1)
    core.HorizontalAlignments = types.SimpleNamespace(LeftHorizontalAlignment=1)
    core.VerticalAlignments = types.SimpleNamespace(TopVerticalAlignment=1)
    fusion.Design = types.SimpleNamespace(cast=lambda value: value)
    fusion.DistanceUnits = types.SimpleNamespace(MillimeterDistanceUnits=1)
    package = types.ModuleType("kinmo_mock_package")
    package.__path__ = []
    name = "kinmo_mock_package.KinmoFusion"
    spec = importlib.util.spec_from_file_location(name, FOLDER / "KinmoFusion.py")
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"adsk": adsk, "adsk.core": core, "adsk.fusion": fusion, "kinmo_mock_package": package, "kinmo_mock_package.bridge": bridge, name: module}):
        spec.loader.exec_module(module)
    return module


class ImportTests(unittest.TestCase):
    def test_actual_js_reference_contours_close_in_cm_without_touching_old_design(self):
        source = js_reference_snapshot()
        outline = next(e for e in source["entities"] if e["layer"] == "SLOT_REFERENCE_OUTLINE")
        module, app = load_mock_addin(), App()
        module.import_drawing(app, bridge.validate_snapshot(source))
        sketch = next(s for s in app.sketches if s.name == "Kinmo · SLOT_REFERENCE_OUTLINE")
        self.assertEqual(len(sketch.lines), len(outline["points"]))
        self.assertAlmostEqual(sketch.lines[0].a.x, outline["points"][0]["x"] / 10)
        self.assertAlmostEqual(sketch.lines[0].a.y, outline["points"][0]["y"] / 10)
        self.assertAlmostEqual(sketch.lines[-1].b.x, sketch.lines[0].a.x)
        self.assertAlmostEqual(sketch.lines[-1].b.y, sketch.lines[0].a.y)
        self.assertTrue(all(line.isFixed for line in sketch.lines))
        self.assertTrue(app.old_design.untouched)
        self.assertEqual(len(app.created), 1)

    def test_closed_slot_inner_and_outer_are_separate_fixed_reference_sketches(self):
        module, app = load_mock_addin(), App()
        source = js_reference_snapshot(closed=True)
        module.import_drawing(app, bridge.validate_snapshot(source))
        for layer in ["SLOT_REFERENCE_OUTLINE", "SLOT_REFERENCE_INNER"]:
            outline = next(e for e in source["entities"] if e["layer"] == layer)
            sketch = next(s for s in app.sketches if s.name == "Kinmo · " + layer)
            self.assertEqual(len(sketch.lines), len(outline["points"]))
            self.assertTrue(all(line.isFixed for line in sketch.lines))
        self.assertTrue(app.old_design.untouched)

    def test_new_document_mm_to_cm_and_fixed_reference_geometry(self):
        module, app = load_mock_addin(), App()
        document = module.import_drawing(app, bridge.validate_snapshot(snapshot()))
        self.assertEqual(len(app.created), 1)
        self.assertIn("Kinmo reference", document.name)
        self.assertTrue(app.old_design.untouched)
        self.assertEqual(len(app.sketches), 3)
        line, circle, text = app.sketches[0].lines[0], app.sketches[1].circles[0], app.sketches[2].texts[0]
        self.assertEqual((line.a.x, line.a.y, line.b.x), (1, -2, 11))
        self.assertTrue(line.isFixed and circle.isFixed)
        self.assertAlmostEqual(circle.radius, .4)
        self.assertAlmostEqual(text.height, .7)
        self.assertTrue(app.fitted)
        self.assertTrue(all(not sketch.isComputeDeferred for sketch in app.sketches))
        self.assertIn(("Kinmo", "ReferenceOnly", "true"), app.attributes)

    def test_closed_paths_close_and_zero_length_edges_are_skipped(self):
        data = snapshot()
        data["entities"] = [{"kind": "polyline", "layer": "TEST", "closed": True, "points": [{"x": 0, "y": 0}, {"x": 0, "y": 0}, {"x": 10, "y": 0}, {"x": 10, "y": 10}]}]
        module, app = load_mock_addin(), App()
        module.import_drawing(app, bridge.validate_snapshot(data))
        self.assertEqual(len(app.sketches[0].lines), 3)

    def test_handler_completes_a_main_thread_job_only_once(self):
        module, app = load_mock_addin(), App()
        jobs = bridge.Jobs(lambda _job: True)
        job = jobs.submit(bridge.validate_snapshot(snapshot()))
        handler = module.ImportHandler(app, jobs)
        handler.notify(types.SimpleNamespace(additionalInfo=job))
        handler.notify(types.SimpleNamespace(additionalInfo=job))
        self.assertEqual(jobs.status(job)["state"], "done")
        self.assertEqual(len(app.created), 1)

    def test_manual_toolbar_completion_creates_exactly_one_document(self):
        module, app = load_mock_addin(), App()
        jobs = bridge.Jobs(lambda _job: "manual")
        job = jobs.submit(bridge.validate_snapshot(snapshot()))
        execute = module.ManualExecute(module.ImportHandler(app, jobs), jobs)
        execute.notify(None)
        execute.notify(None)
        self.assertEqual(jobs.status(job)["state"], "done")
        self.assertEqual(len(app.created), 1)

    def test_error_releases_deferred_compute_and_reports_partial_new_document(self):
        module, app = load_mock_addin(), App()
        jobs = bridge.Jobs(lambda _job: True)
        job = jobs.submit(bridge.validate_snapshot(snapshot()))
        original = app.new_design.rootComponent.sketches.add
        def broken(plane):
            sketch = original(plane)
            sketch.sketchCurves.sketchLines.addByTwoPoints = lambda *_args: 1 / 0
            return sketch
        app.new_design.rootComponent.sketches.add = broken
        module.ImportHandler(app, jobs).notify(types.SimpleNamespace(additionalInfo=job))
        self.assertEqual(jobs.status(job)["state"], "error")
        self.assertTrue(all(not s.isComputeDeferred for s in app.sketches))
        self.assertTrue(app.old_design.untouched)
        self.assertEqual(len(app.created), 1)

    def test_zip_opens_with_stdlib_and_has_valid_crc(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node executable not available for archive test.")
        script = "import { fusionArchive } from './scripts/archive.mjs'; process.stdout.write(await fusionArchive(process.cwd()));"
        result = subprocess.run([node, "--input-type=module", "-e", script], cwd=ROOT, check=True, stdout=subprocess.PIPE)
        with zipfile.ZipFile(io.BytesIO(result.stdout)) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(len(archive.namelist()), 4)
            self.assertTrue(all(name.startswith("KinmoFusion/") and ".." not in name for name in archive.namelist()))


class PairingPersistenceTests(unittest.TestCase):
    def test_saved_pairing_survives_restart_and_can_be_revoked(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "private" / "pairing.json"
            self.assertIsNone(bridge.load_pairing(path))
            bridge.save_pairing(path, ORIGIN, MOCK_KEY)
            self.assertEqual(bridge.load_pairing(path), {"origin": ORIGIN, "key": MOCK_KEY})
            if sys.platform != "win32":
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            bridge.forget_pairing(path)
            self.assertIsNone(bridge.load_pairing(path))
            bridge.forget_pairing(path)

    def test_corrupted_or_invalid_saved_pairing_is_not_trusted(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "pairing.json"
            for value in ["invalid", json.dumps({"origin": ORIGIN, "key": 5}), json.dumps({"origin": "file:///tmp", "key": MOCK_KEY})]:
                path.write_text(value)
                self.assertIsNone(bridge.load_pairing(path))


if __name__ == "__main__":
    unittest.main(testRunner=unittest.TextTestRunner(stream=sys.stdout, verbosity=2))
