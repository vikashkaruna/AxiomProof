"""PII redaction for the Model Gateway.

The redaction runs on every prompt before it leaves the agent runtime
to a third-party model provider. It uses Presidio (Microsoft) for
robust named-entity recognition, with a regex pre-pass for
DPDPA-specific patterns (Aadhaar, PAN, IFSC, etc.) that Presidio
doesn't always catch.

Redaction is irreversible for the model — the redacted text is what
the model sees. The original is hashed (SHA-256) and the hash is
recorded in the audit ledger for reproducibility, but the value
itself never leaves the runtime.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Any

# DPDPA-specific patterns (high-precision, low-false-positive)
DPDPA_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("PAN", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")),
    ("AADHAAR", re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")),
    ("PASSPORT", re.compile(r"\b[A-PR-WY][0-9]{7}\b")),
    ("IFSC", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
    ("EMAIL", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("PHONE_IN", re.compile(r"(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b")),
    ("CARD", re.compile(r"\b(?:\d[ -]?){13,19}\b")),
    ("IP", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
]


@dataclass(frozen=True)
class RedactionSummary:
    redacted_text: str
    redactions: dict[str, int]
    original_hash: str  # SHA-256 of the original (for ledger)
    redacted_hash: str  # SHA-256 of the redacted output


def redact(text: str) -> RedactionSummary:
    """Apply DPDPA-specific regex patterns to redact PII.

    For broader NER (names, addresses), the gateway also runs Presidio
    when available. This function is the always-on, no-deps fallback.
    """
    if not text:
        return RedactionSummary(
            redacted_text=text,
            redactions={},
            original_hash=hashlib.sha256(b"").hexdigest(),
            redacted_hash=hashlib.sha256(b"").hexdigest(),
        )

    original_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    redactions: dict[str, int] = {}
    out = text

    for name, pattern in DPDPA_PATTERNS:
        matches = pattern.findall(out)
        if matches:
            count = len(matches)
            redactions[name] = count
            out = pattern.sub(f"[REDACTED:{name}]", out)

    return RedactionSummary(
        redacted_text=out,
        redactions=redactions,
        original_hash=original_hash,
        redacted_hash=hashlib.sha256(out.encode("utf-8")).hexdigest(),
    )


def redact_variables(variables: dict[str, Any]) -> tuple[dict[str, Any], dict[str, int]]:
    """Redact string values in a variables dict, recursively."""
    all_redactions: dict[str, int] = {}
    out = _walk(variables, all_redactions)
    return out, all_redactions


def _walk(value: Any, accum: dict[str, int]) -> Any:
    if isinstance(value, str):
        r = redact(value)
        for k, v in r.redactions.items():
            accum[k] = accum.get(k, 0) + v
        return r.redacted_text
    if isinstance(value, dict):
        return {k: _walk(v, accum) for k, v in value.items()}
    if isinstance(value, list):
        return [_walk(v, accum) for v in value]
    return value
