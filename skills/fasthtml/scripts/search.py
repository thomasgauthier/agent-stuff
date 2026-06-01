#!/usr/bin/env python
import json
import os
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: search.py <query>")
        return 1
    query = " ".join(sys.argv[1:]).lower()
    catalog_path = os.path.join(os.path.dirname(__file__), "..", "references", "catalog.json")
    if not os.path.exists(catalog_path):
        print("catalog.json not found", file=sys.stderr)
        return 1
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    hits = []
    for entry in catalog:
        hay = " ".join([
            entry.get("title") or "",
            entry.get("section") or "",
            " ".join(entry.get("headings") or []),
        ]).lower()
        if query in hay:
            hits.append(entry)
    for h in hits[:20]:
        print(f"- {h.get('title')} ({h.get('local_path')})")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
