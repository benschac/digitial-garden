"""Serve only the avatar comparison and its explicitly listed dependencies."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import mimetypes

HERE = Path(__file__).resolve().parent
THREE = HERE.parents[1] / "apps/web/node_modules/three"
FILES = {"/": HERE / "compare.html"}
for name in ("avatar-surface-repaired.glb", "avatar-web.glb"):
    FILES["/" + name] = HERE / name
for name in (
    "build/three.module.js", "build/three.core.js",
    "examples/jsm/loaders/GLTFLoader.js",
    "examples/jsm/libs/meshopt_decoder.module.js",
    "examples/jsm/utils/BufferGeometryUtils.js",
    "examples/jsm/utils/SkeletonUtils.js",
):
    FILES["/vendor/three/" + name] = THREE / name


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = FILES.get(self.path.split("?", 1)[0])
        if path is None or not path.is_file():
            self.send_error(404)
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    print("Avatar comparison: http://127.0.0.1:8766", flush=True)
    HTTPServer(("127.0.0.1", 8766), Handler).serve_forever()
