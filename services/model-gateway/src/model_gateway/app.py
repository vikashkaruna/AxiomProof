"""FastAPI app for the Model Gateway."""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Literal

import structlog
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from .config import Settings, get_settings
from .redaction import redact, redact_variables
from .router import TaskKind, decide_route


# ─── Request / response shapes ───────────────────────────────────────


class CompleteRequest(BaseModel):
    model: str = ""  # optional override
    prompt: str
    task: TaskKind = "reasoning"
    temperature: float = 0.2
    max_tokens: int = 4096
    variables: dict[str, Any] = {}
    pii_redact: bool = True
    response_format: dict[str, Any] | None = None
    prompt_hash: str | None = None  # computed by the caller; recorded for the ledger


class CompleteResponse(BaseModel):
    text: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    latency_ms: int
    model_id: str
    pii_redacted: bool
    redactions: dict[str, int] = {}
    prompt_hash: str
    route_reason: str
    correlation_id: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ]
    )
    log = structlog.get_logger()
    log.info("model_gateway.startup", env=settings.environment, port=settings.http_port)
    app.state.settings = settings
    app.state.log = log
    yield


app = FastAPI(
    title="Axiom Proof — Model Gateway",
    version="0.1.0",
    description=(
        "Self-hosted LLM routing with PII redaction. Per Doc 05 §6 and "
        "Doc 06 §7, the gateway is the single chokepoint for every LLM call."
    ),
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    settings: Settings = app.state.settings
    return {
        "status": "ready",
        "providers": {
            "self_hosted": bool(settings.self_hosted_base_url),
            "bedrock": bool(settings.aws_region),
        },
        "redaction_enabled": settings.pii_redaction_enabled,
    }


@app.post("/v1/complete", response_model=CompleteResponse)
async def complete(req: CompleteRequest, request: Request):
    settings: Settings = app.state.settings
    log = structlog.get_logger()
    correlation_id = str(uuid.uuid4())

    # Auth
    if settings.api_key:
        provided = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
        if provided != settings.api_key:
            raise HTTPException(status_code=401, detail="invalid api key")

    # PII redaction — applied to the prompt and to all variables. Hosted
    # routes are always redacted even if a caller asks for pii_redact=false;
    # raw personal data must never cross the gateway boundary.
    redactions: dict[str, int] = {}
    pii_redacted = False
    redacted_prompt = req.prompt
    redacted_variables = req.variables
    decision = decide_route(req.task, req.model, settings)
    must_redact = decision.provider != "self_hosted"
    if settings.pii_redaction_enabled and (req.pii_redact or must_redact):
        r = redact(req.prompt)
        redacted_prompt = r.redacted_text
        pii_redacted = True
        for k, v in r.redactions.items():
            redactions[k] = redactions.get(k, 0) + v
        redacted_variables, var_red = redact_variables(req.variables)
        for k, v in var_red.items():
            redactions[k] = redactions.get(k, 0) + v

    log.info(
        "model_gateway.route_decision",
        task=req.task,
        requested=req.model,
        provider=decision.provider,
        model=decision.model,
        reason=decision.reason,
        pii_redacted=pii_redacted,
        correlation_id=correlation_id,
    )

    # Compose the actual prompt (variables substituted)
    composed_prompt = redacted_prompt
    for k, v in (redacted_variables or {}).items():
        composed_prompt = composed_prompt.replace(f"{{{{{k}}}}}", str(v))

    t0 = time.monotonic()
    try:
        text, input_tokens, output_tokens = await _dispatch(
            composed_prompt,
            decision,
            req,
            settings,
            log,
        )
    except Exception as e:
        log.error("model_gateway.dispatched_error", err=str(e))
        raise HTTPException(status_code=502, detail=f"provider_error: {e}") from e

    latency_ms = int((time.monotonic() - t0) * 1000)
    cost_in = settings.cost_per_input_token.get(decision.model, 0)
    cost_out = settings.cost_per_output_token.get(decision.model, 0)
    cost_usd = input_tokens * cost_in + output_tokens * cost_out

    return CompleteResponse(
        text=text,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        cost_usd=cost_usd,
        latency_ms=latency_ms,
        model_id=decision.model,
        pii_redacted=pii_redacted,
        redactions=redactions,
        prompt_hash=req.prompt_hash or _hash(redacted_prompt),
        route_reason=decision.reason,
        correlation_id=correlation_id,
    )


async def _dispatch(
    prompt: str,
    decision,
    req: CompleteRequest,
    settings: Settings,
    log,
) -> tuple[str, int, int]:
    """Dispatch to the chosen provider. For Phase 0/1, this is a stub
    that returns a deterministic response. The real LiteLLM-based
    dispatch is in `litellm_dispatch.py` (Phase 2+).
    """
    # Phase 0/1 stub — return a synthesised response so the rest of
    # the system is testable end-to-end.
    text = _stub_completion(prompt, decision, req)
    input_tokens = max(1, len(prompt) // 4)
    output_tokens = max(1, len(text) // 4)
    return text, input_tokens, output_tokens


def _stub_completion(prompt: str, decision, req: CompleteRequest) -> str:
    # A small, deterministic stub that varies by task. The agent
    # runtime can be tested end-to-end without a real model.
    if req.task == "classification":
        return '{"category": "other", "confidence": 0.5, "rationale": "stub"}'
    if req.task == "structural":
        return '{"ok": true}'
    if req.task == "embedding":
        # Return 8-dim zero vector as a placeholder
        return "[" + ",".join(["0.0"] * 8) + "]"
    return (
        f"[Model Gateway stub · {decision.provider}/{decision.model} · task={req.task}] "
        f"Acknowledged. (Phase 0/1 — replace with real LiteLLM call in Phase 2.)"
    )


def _hash(s: str) -> str:
    import hashlib

    return hashlib.sha256(s.encode("utf-8")).hexdigest()
