"""Axiom Proof — Agent Runtime.

10 named agents that compose the agentic DPDPA compliance platform:

  drishti     — Discovery (finds personal data)
  vibhaag     — Classification (categorises by DPDPA type)
  parikshan   — Assessment (scores against the control library)
  saakshi     — Evidence (collects, timestamps, seals)
  sudhaar     — Remediation planning (proposes fixes — NO write access)
  karya       — Execution (executes approved fixes only)
  lekha       — Audit & traceability (writes the hash-chained ledger)
  nazar       — Regulatory watch (monitors MeitY/DPB/gazette)
  prativedan  — Reporting (Board, auditor, DPB-ready documents)
  sanket      — Market signal (buying-intent intelligence)

The runtime is a FastAPI service that the BFF calls. Each agent
implements a versioned contract; the model gateway abstracts the LLM
provider; the ledger client is the only sanctioned path to write
audit entries; the evidence client seals artifacts into WORM-locked S3.
"""

__version__ = "0.1.0"
