"""Axiom Proof — Temporal workers.

Long-running durable workflows for the agentic platform. Temporal
solves a specific problem: surviving a human taking days to approve
a batch, resuming exactly where the workflow left off, and doing
this per-tenant at scale.

The Workflow/State Engine in Doc 04 §5.1 is implemented here. The
outer workflow is:

  discovery → classification → assessment → evidence → planning →
  dry-run → approval → execution → verification → closure

Per Doc 05 §4: Temporal Cloud, ap-south-1, Mumbai. Production-grade
durable-execution primitive that does exactly this.
"""
