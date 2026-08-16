# Axiom Proof Model Gateway

FastAPI gateway for PII redaction, model routing, token accounting, and prompt
version management.

## Development

This service supports Python 3.11–3.13. Python 3.14 is intentionally excluded
because the pinned spaCy/Presidio dependency set does not provide a compatible
wheel for that interpreter yet.

```bash
uv sync
uv run pytest
```
