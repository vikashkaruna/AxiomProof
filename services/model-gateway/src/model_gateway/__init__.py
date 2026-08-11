"""Axiom Proof — Model Gateway.

Self-hosted LLM routing with PII redaction, token accounting, and
prompt-version registry. Per Doc 05 §6 and Doc 06 §7, the gateway is
the single chokepoint for every LLM call in the platform.

Architecture:
  - LiteLLM is the provider-routing layer
  - PII redaction runs before any egress to a third-party model
  - The hybrid strategy routes structural tasks to a self-hosted
    vLLM and high-stakes reasoning to hosted Claude (Bedrock)
  - The cache is Redis-backed (ElastiCache for Valkey in production)
  - Every call is recorded with prompt hash + model version
"""

__version__ = "0.1.0"
