"""Model router — selects the right model + provider based on the task.

Per Doc 06 §7, the gateway runs a hybrid strategy:
  - Structural / classification / embedding tasks → self-hosted vLLM
    (Qwen 2.5 32B or similar) on the EKS GPU node group
  - High-stakes reasoning (assessment, planning) → hosted Claude
    (Bedrock) behind the redacting gateway

The choice is driven by the `task` field in the request, which the
agent runtime sets. The decision is logged with every call.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .config import Settings

TaskKind = Literal[
    "structural",
    "reasoning",
    "embedding",
    "classification",
    "summarisation",
    "report",
]


@dataclass(frozen=True)
class RouteDecision:
    provider: Literal["self_hosted", "bedrock", "anthropic_api"]
    model: str
    reason: str
    fallback_model: str | None = None


def decide_route(task: TaskKind, requested_model: str, settings: Settings) -> RouteDecision:
    """Pick the provider + model for a given task.

    Rules:
      - Structural, classification, embedding tasks → self-hosted
        (no PII in flight; residency guaranteed; cheapest)
      - Reasoning, summarisation, report tasks → Bedrock Claude
        (highest quality for high-stakes; redacted before egress)
      - Caller can override with `requested_model` if they have a
        good reason.
    """
    # Honour explicit requests
    if requested_model:
        if "claude" in requested_model.lower():
            return RouteDecision(
                provider="bedrock",
                model=settings.bedrock_model,
                reason="explicit_claude_request",
                fallback_model=settings.fallback_model,
            )
        if "Qwen" in requested_model or "/" in requested_model:
            return RouteDecision(
                provider="self_hosted",
                model=requested_model,
                reason="explicit_open_model_request",
            )

    # Default by task
    if task in ("structural", "classification", "embedding"):
        return RouteDecision(
            provider="self_hosted",
            model=settings.self_hosted_model,
            reason="structural_task_routes_to_self_hosted",
        )
    if task in ("reasoning", "summarisation", "report"):
        return RouteDecision(
            provider="bedrock",
            model=settings.bedrock_model,
            reason="high_stakes_reasoning_routes_to_bedrock_claude",
            fallback_model=settings.fallback_model,
        )
    # Default fallback
    return RouteDecision(
        provider="bedrock",
        model=settings.bedrock_model,
        reason="unknown_task_defaults_to_bedrock",
        fallback_model=settings.fallback_model,
    )
