#!/usr/bin/env python3
"""Build controls.json from the TypeScript control library source.

This script parses packages/control-library/src/controls.ts and emits
a JSON file the Python agent runtime can load without a TS runtime.

Run from the repo root:

    python3 services/agent-runtime/scripts/build_controls_json.py

Output: services/agent-runtime/src/axiom/data/controls.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CONTROLS_TS = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "control-library"
    / "src"
    / "controls.ts"
)
OUT_PATH = (
    Path(__file__).resolve().parents[1] / "src" / "axiom" / "data" / "controls.json"
)


def parse(ts_source: str) -> dict:
    """Very small TS → dict extractor for the controls.ts file shape.

    Rather than fully type-checking TS, we extract the literal object
    between `export const controls: Control[] = [` and the closing `]`.
    We then use a hand-rolled JSON-coercion pass. For the v0.1.0
    library (46 controls) this is robust; for future versions a
    proper TS parser (e.g. via the `typescript` PyPI package or a
    ts-to-json step) is recommended.
    """
    # Extract version constants
    version = "0.1.0"
    m = re.search(r"export const LIBRARY_VERSION\s*=\s*['\"]([^'\"]+)['\"]", ts_source)
    if m:
        version = m.group(1)

    # The controls array
    start = ts_source.find("export const controls: Control[] = [")
    if start == -1:
        raise RuntimeError("Could not find `export const controls` in controls.ts")
    # Walk braces to find the matching `];`
    i = ts_source.find("[", start)
    depth = 0
    end = -1
    in_string = False
    in_template = False
    string_char = ""
    escape = False
    for j in range(i, len(ts_source)):
        c = ts_source[j]
        if escape:
            escape = False
            continue
        if c == "\\":
            escape = True
            continue
        if in_string:
            if c == string_char:
                in_string = False
            continue
        if in_template:
            if c == "`":
                in_template = False
            continue
        if c in ('"', "'"):
            in_string = True
            string_char = c
            continue
        if c == "`":
            in_template = True
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    if end == -1:
        raise RuntimeError("Could not find end of controls array")
    controls_literal = ts_source[i:end]
    return _literal_to_python(controls_literal, version)


def _literal_to_python(literal: str, version: str) -> dict:
    """Convert the TS literal into a Python dict. This is a small,
    hand-rolled parser tailored to the shape of controls.ts — it does
    not handle all TS, only what the control library uses.
    """
    # Replace TS-specific bits with JSON-friendly equivalents
    s = literal

    # Unwrap: export const controls: Control[] = [...] → strip the prefix
    s = re.sub(r"^\s*\[", "[", s)
    s = s.rstrip().rstrip(";").rstrip()

    # Replace 'true' / 'false' / 'null'
    s = re.sub(r"\btrue\b", "true", s)
    s = re.sub(r"\bfalse\b", "false", s)
    s = re.sub(r"\bundefined\b", "null", s)

    # Remove 'as <type>' casts
    s = re.sub(r"\s+as\s+[A-Za-z_<>[\]\| ]+", "", s)
    s = re.sub(r"\s+as\s+const", "", s)

    # Remove TS-specific question marks on keys: `key?: type` → `key: type`
    s = re.sub(r"(\w+)\s*\?\s*:\s*", r"\1: ", s)

    # Remove type annotations: `: Type` after property names
    s = re.sub(r":\s*[A-Z][A-Za-z_<>[\]\| ,]*(?=[,\}\n])", "", s)
    s = re.sub(r":\s*'[A-Za-z_<>[\]\| ,]+'(?=[,\}\n])", "", s)

    # Trailing commas (TS allows them, JSON doesn't)
    s = re.sub(r",\s*([\]\}])", r"\1", s)

    # Convert to valid JSON
    return {"version": version, "controls": json.loads(s)}


def main() -> int:
    if not CONTROLS_TS.exists():
        print(f"controls.ts not found at {CONTROLS_TS}", file=sys.stderr)
        return 1
    src = CONTROLS_TS.read_text(encoding="utf-8")
    parsed = parse(src)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(parsed, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✓ Wrote {len(parsed['controls'])} controls to {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
