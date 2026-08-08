"""Local-only receiver for automated makehuman-js OBJ exports.

Run from the game worktree: python tools/characters/makehuman-export-server.py
Then open /tools/characters/generate-makehuman-models.html.  Only the six
predefined relative targets below can be written.
"""
from __future__ import annotations

import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools" / "raw-character" / "makehuman-js"
IDS = ("player-commander", "ramin", "saman", "nikan", "shahin-tali", "general-varen")
PATHS = {f"/__makehuman-export/{role}.obj": RAW / f"{role}.obj" for role in IDS}
MAX_BYTES = 18 * 1024 * 1024


class ExportHandler(SimpleHTTPRequestHandler):
    def do_PUT(self) -> None:  # noqa: N802 - inherited standard-library name
        target = PATHS.get(self.path)
        if target is None:
            self.send_error(404, "Unknown export target")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return
        if not 64 < length <= MAX_BYTES:
            self.send_error(413, "Unexpected export size")
            return
        body = self.rfile.read(length)
        if b"\x00" in body or not body.startswith(b"# Generated with makehuman-js") or b"\nv " not in body or b"\nf " not in body:
            self.send_error(400, "Invalid OBJ payload")
            return
        RAW.mkdir(parents=True, exist_ok=True)
        resolved_target = target.resolve()
        if RAW.resolve() not in resolved_target.parents:
            self.send_error(403, "Unsafe export target")
            return
        temporary = resolved_target.with_suffix(".obj.tmp")
        temporary.write_bytes(body)
        os.replace(temporary, resolved_target)
        self.send_response(204)
        self.end_headers()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8091)
    args = parser.parse_args()
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), ExportHandler)
    print(f"MakeHuman export server: http://127.0.0.1:{args.port}/tools/characters/generate-makehuman-models.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
