# Axiom Proof

> Agents do the work. You approve. The proof is automatic.

Axiom Proof is the **agentic DPDPA compliance platform** from
[Axiom Minds Private Limited](https://axiomminds.ai). AI agents
discover your personal data, assess your gaps against the
DPDP Act 2023 + Rules 2025, propose typed remediation plans — and
**only after you approve**, execute them. Every action is sealed
into a verifiable, hash-chained audit trail.

This repository is the **implementation and audit baseline** of the platform
across:

- **Phase 0** — Foundation: corporate, control library, Parikshan
  (assessment), Prativedan (reporting), free gap-scan, workbench.
- **Phase 1** — First cash: Drishti (discovery), Vibhaag
  (classification), RoPA generator, Sudhaar (planning), Saakshi
  (evidence), policy generator, review console, playbook capture.
- **Phase 2** — Repeatability: shared discovery, classification, evidence,
  approval, ledger, model-gateway, and typed generator paths are present;
  live connector and persistence integrations remain deployment/product TODOs.
- **Phase 3 review** — quality, type-safety, schema reuse, tenant isolation,
  cross-document consistency, and coverage findings are recorded and fixed in
  `docs/audits/03-quality-and-coverage.md`.

The roadmap's Phase 3 production execution and Phases 4–5 capabilities are not
claimed as fully deployed. Karya has an approval-gated execution path, while
live connectors, production infrastructure verification, mTLS, and external
account configuration remain explicitly documented TODOs.

## Current repository status

As of 2026-08-16, `main` is at `c259c42`. Part A and Part B review Phases 0–3
are complete. CI passes lint/typecheck, TypeScript tests, both Python 3.11 test
suites, and the security scan. External deployment and GitHub verification
steps are tracked in the phase audit reports.

---

## The non-negotiable safety rules

These apply to every mutating action anywhere in the product, and
are enforced **architecturally**, not by convention (see
[`docs/04_Solution_Architecture.md`](./docs/04_Solution_Architecture.md)
and [`docs/07_SECURITY_REVIEW.md`](./docs/07_SECURITY_REVIEW.md)):

1. No mutating agent action executes without a recorded human
   approval — a signed, scope-bound token, validated per action.
2. Every executable action needs a completed dry-run with a
   readable diff before approval is even possible.
3. Every action carries a generated, validated rollback plan,
   created at planning time.
4. Every action — read or write, agent or human — is written to
   the append-only, hash-chained audit ledger.
5. The planning agent (Sudhaar) holds no write credentials.
   Separation of duties between proposing and executing.
6. Blast-radius caps are enforced pre-flight and in-flight, with
   a global kill switch.

---

## Repository layout

```
.
├── apps/                              # Next.js surfaces
│   ├── web/                           # Product app (Workbench, Approval Console, Client Portal)
│   └── marketing/                     # Public site (positioning, gap-scan, agents)
├── services/                          # Backend services
│   ├── bff/                           # Node/TypeScript BFF (Hono) — the API + execution gate
│   ├── agent-runtime/                 # Python FastAPI — 10 named agents
│   ├── model-gateway/                 # Python FastAPI — self-hosted LLM gateway with PII redaction
│   └── temporal-workers/              # Python — durable workflow orchestration
├── packages/                          # Shared libraries
│   ├── design-tokens/                 # Brand tokens, Tailwind preset
│   ├── ui/                            # React UI primitives
│   ├── types/                         # Shared TypeScript types (mirror DB schema)
│   ├── control-library/               # 46 DPDPA controls, versioned data
│   ├── ledger/                        # Append-only audit ledger client (TS)
│   ├── evidence/                      # S3 Object Lock client (TS)
│   ├── approval-engine/               # HMAC-SHA-256 signed approval tokens (TS)
│   ├── supabase/                      # Supabase client wrappers
│   └── config/                        # Shared runtime config
├── infra/                             # Deployment
│   ├── docker/                        # Dockerfiles (5 services + 2 apps)
│   ├── helm/                          # Kubernetes Helm chart
│   ├── terraform/                     # AWS infra (EKS, S3, ElastiCache, IAM)
│   └── supabase/                      # SQL migrations + seed
├── tests/                             # E2E + integration tests (Playwright)
├── docs/                              # Strategy & operations
│   ├── 00_README_Document_Index.md
│   ├── 01_Product_Naming_Branding_and_GTM.md
│   ├── 02_Phase_Wise_Implementation_Plan.md
│   ├── 03_BRD_PRD.md
│   ├── 04_Solution_Architecture.md
│   ├── 05_Technology_Stack_Analysis.md
│   ├── 06_Infrastructure_and_Lockin_Strategy.md
│   ├── DPDPA_Axiom_Minds_Strategic_Roadmap.md
│   ├── 07_SECURITY_REVIEW.md
│   ├── 08_DEPLOYMENT_GUIDE.md
│   ├── 09_RUNBOOK.md
│   └── audits/                         # Baseline, security, module, and Phase 3 reports
├── AGENTS.md
└── README.md
```

---

## Quick start (local development)

### Prerequisites

- Node.js ≥ 20.11
- pnpm ≥ 9.12 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Python ≥ 3.11
- uv (Python package manager) — `pip install uv`
- Docker (for Supabase local)
- Supabase CLI

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the local Supabase

```bash
cd infra/supabase
supabase start
# Captures anon key, service role key, DB URL.
```

### 3. Apply migrations + seed

```bash
cd ../..
pnpm db:migrate
pnpm seed:controls
```

### 4. Build the controls.json for the Python agent runtime

```bash
pnpm tsx scripts/build-controls-json.mjs
```

### 5. Start the apps and services (in separate terminals)

```bash
# BFF
pnpm --filter @axiom/bff dev

# Agent runtime
cd services/agent-runtime
uv sync
uv run python -m axiom

# Model gateway
cd ../model-gateway
uv sync
uv run python -m model_gateway

# Web (Next.js product app)
pnpm --filter @axiom/web dev
# → http://localhost:3001

# Marketing
pnpm --filter @axiom/marketing dev
# → http://localhost:3000
```

### 6. Run the tests

```bash
# Unit (TS)
pnpm test

# Unit (Python)
cd services/agent-runtime && uv run pytest
cd services/model-gateway && uv run pytest

# E2E
cd tests/e2e && pnpm test:e2e
```

---

## Deployment

For production deployment to AWS `ap-south-1` (EKS + S3 + ElastiCache

- Supabase + Temporal Cloud), see [`docs/08_DEPLOYMENT_GUIDE.md`](./docs/08_DEPLOYMENT_GUIDE.md).
  For day-2 operations, see [`docs/09_RUNBOOK.md`](./docs/09_RUNBOOK.md).
  For the security review and SDLC, see [`docs/07_SECURITY_REVIEW.md`](./docs/07_SECURITY_REVIEW.md).

---

## Architecture highlights

- **4-layer architecture** (Experience / API / Agentic Middle / Data)
  per Doc 04. The control plane (Next.js apps, BFF) and data plane
  (agent runtime, S3, Supabase) are logically separated from day one,
  so the Phase 5 split-plane deployment is a packaging change, not
  a rewrite.
- **RLS-enforced tenancy** at the database level. Application-layer
  filtering is never the only defence (ADR-8).
- **Append-only, hash-chained audit ledger** (Postgres function
  `append_ledger()`). The chain is verifiable end-to-end by an
  independent reviewer.
- **Signed approval tokens** (HMAC-SHA-256) are the gate. Unapproved
  execution is architecturally impossible (ADR-2).
- **Self-hosted LLM gateway** on the same EKS cluster, with PII
  redaction at the chokepoint. Per Doc 05 §6, no major LLM vendor
  guarantees India-only inference, so redaction is load-bearing.
- **Open engines throughout** (Postgres, Temporal, Valkey, S3
  API, vLLM). A future move off AWS, or to on-prem, is a redeploy
  not a rewrite.

---

## License

Proprietary. © 2026 Axiom Minds Private Limited.

For partnership / commercial licensing: hello@axiomminds.ai.
