"""Canonical JSON + SHA-256 helpers.

Mirrors the TypeScript implementation in packages/ledger/src/canonicalise.ts.
Used for the hash-chained audit ledger and approval token payloads.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(value: Any) -> str:
    """Produce a deterministic JSON string for any JSON-compatible value.

    - Object keys are sorted lexicographically
    - Arrays preserve order
    - Numbers/strings/booleans/null serialise natively
    - None is treated as null
    - No whitespace
    - UTF-8 encoded

    Mirrors packages/ledger/src/canonicalise.ts so the TS-side ledger
    and Python-side agents produce identical hashes for the same input.
    """
    return json.dumps(_sort(value), separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def _sort(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [_sort(v) for v in value]
    if isinstance(value, dict):
        return {k: _sort(v) for k, v in sorted(value.items())}
    raise TypeError(f"Cannot canonicalise value of type {type(value)}")


def sha256_hex(data: str | bytes) -> str:
    """Return the lowercase hex SHA-256 digest of the input."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()
