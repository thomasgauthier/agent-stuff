#!/usr/bin/env python
import json
import os
import subprocess
import sys

def main():
    manifest_path = os.path.join(os.path.dirname(__file__), "..", "manifest.json")
    if not os.path.exists(manifest_path):
        print("manifest.json not found", file=sys.stderr)
        return 1
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    source_url = manifest.get("source_url")
    if not source_url:
        print("source_url missing from manifest", file=sys.stderr)
        return 1
    cmd = ["skillgen", source_url, "--out", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))]
    print("Running:", " ".join(cmd))
    return subprocess.call(cmd)

if __name__ == "__main__":
    raise SystemExit(main())
