# Axiom Proof — Technology Stack Analysis
### Vendor & Framework Selection Against the Doc 04 Architecture
**Axiom Minds Private Limited** · **Document:** 05 of 05 · **Date:** August 2026

---

## 0. What this document is

[`04_Solution_Architecture.md`](04_Solution_Architecture.md) already fixed the architecture — layers, agent runtime, safety chain, ADRs 1–10. Two things in it were deliberately left as an "or": API language (*"Node/TypeScript (or Python/FastAPI)"*) and orchestration (*"Temporal-class... or Postgres-backed state machine"*). It also stated infra choices generically (*"managed containers, India region"*, *"S3-compatible... India region"*) without naming vendors, and didn't cover the help/docs surface at all.

This document resolves those open items with **specific, currently-available vendors** (verified August 2026), compared against alternatives, plus one finding from that research that changes how the Model Gateway must be built. It does not revisit anything already locked by an ADR — modular monolith, Postgres+pgvector, RLS tenancy, and the append-only ledger are treated as settled.

---

## 1. The constraint that dominates every choice

**AP-7 (India data residency) is non-negotiable** and **AP-8 (read-only until explicitly granted)** — restated from Doc 04. Combined with **AP-6** (control plane / data plane must be separable), this splits every vendor decision into two very different bars:

- **Control plane** (UI, orchestration metadata, plans, approvals) — global-CDN vendors are fine; nothing personal touches them.
- **Data plane** (discovery output, evidence, ledger, anything holding an actual data-principal's data) — **must run in an India AWS/GCP/Azure region with no ambiguity**, and that includes where any LLM call executes.

That second bar eliminated more vendors in research than expected — see §6, the one finding in this document worth reading even if you skip everything else.

**Second-order constraint: solo founder, AP-4.** Every "self-host vs. managed" choice below defaults to managed unless self-hosting is the only way to satisfy AP-7.

---

## 2. Frontend meta-framework — App + Site

| | Next.js (App Router) | Remix / React Router v7 | SvelteKit | Nuxt |
|---|---|---|---|---|
| SSR for report-heavy views (Doc 04 §3.3) | Excellent, mature RSC | Good | Good | Good |
| WebSocket for live agent progress | Needs a custom server or edge route | Same | Same | Same |
| Ecosystem / hiring / AI-tooling fit | Largest by far | Good | Smaller | Smaller (Vue-only talent pool) |
| India-region hosting | Vercel `bom1` confirmed live | Works anywhere Node runs | Same | Same |
| Fit with Tailwind brand tokens already in `design-system/` | Native | Native | Native | Native |

**Recommendation: Next.js, unchanged from Doc 04.** Nothing in the comparison beats it enough to justify deviating — it's what Doc 04 already specified, the design prototypes were built assuming it, and the ecosystem advantage matters more for a solo founder leaning on AI-assisted development than any per-framework performance delta.

---

## 3. API layer language — the one real "or" in Doc 04

| | Node/TypeScript | Python/FastAPI |
|---|---|---|
| Shares a language with the frontend | Yes — one language for web tier | No — third language alongside TS + Python agent runtime |
| Shares a language with the agent runtime (Python, fixed by AP-5/ecosystem) | No | Yes |
| Doc 04's own "language pragmatism" note | *"TypeScript for the web tier and Python for the agent tier is the one place where two languages is justified... everywhere else, resist adding a language."* | Would make it three |

**Recommendation: Node/TypeScript for the BFF/API layer**, exactly as Doc 04's own pragmatism note argues. This isn't a close call — picking FastAPI here means the founder is context-switching across three languages instead of two, for a BFF whose job (auth, tenant resolution, request shaping) doesn't need Python's ML ecosystem. The BFF calls into the Python agent runtime as a separate service either way (Doc 04 §5.2), so FastAPI's proximity to the agents isn't actually a wiring advantage.

---

## 4. Durable orchestration — the other "or"

The Workflow/State Engine (Doc 04 §5.1) has an unusual requirement: it must **survive a human taking days to approve a batch**, resume exactly where it left off, and do this per-tenant at scale. That's a narrow, well-known problem.

| | Temporal Cloud (`ap-south-1`, Mumbai) | Self-hosted Temporal | Postgres-backed state machine (hand-rolled) |
|---|---|---|---|
| India region | **Confirmed available** — Temporal added Mumbai in 2026 | Yes, if you run it on India-region compute yourself | Yes, it's just your own Postgres |
| Survives restarts / long waits for approval | Native (signals, timers, durable execution) — exactly the primitive needed | Same, plus you operate the cluster | Must be built and hardened by hand |
| Ops burden for a solo founder | Low — managed | High — a distributed system to run (violates AP-4) | Low to build initially, grows fast as workflows get more complex |
| Cost at Phase 0–2 scale | Free/cheap tier viable | Compute cost + your time | "Free" until the hand-rolled edge cases start costing more time than Temporal ever would |

**Recommendation: Temporal Cloud, Mumbai region.** This is the strongest, most one-sided call in this document. A hand-rolled Postgres state machine is exactly the kind of "operational burden a solo founder can't service" that Doc 04 warns against elsewhere (§6.1's note about pgvector vs. a dedicated vector DB) — except here the complexity is *harder* to hand-roll correctly, because approval-wait durability and partial-batch-failure semantics are precisely what Temporal exists to solve. Self-hosting Temporal just re-adds the ops burden Temporal Cloud exists to remove. Use it for the outer `discovery → ... → closure` state machine; keep individual agents' internal reasoning loops as plain code calling the Model Gateway — no need for a second agent-framework abstraction (LangGraph, CrewAI, etc.) on top for 10 agents with clearly scoped single responsibilities. Add one only if an agent's internal tool-use graph gets genuinely complex.

---

## 5. Database, auth, and object storage — the Supabase convergence

| | AWS RDS/Aurora Postgres (`ap-south-1`) | Supabase (`ap-south-1`, Mumbai) | Neon |
|---|---|---|---|
| India region | Yes | **Confirmed available** | **Not available** — tops out at Singapore in APAC as of 2026 |
| pgvector | Yes, manual setup | Built in | Built in (moot — no India region) |
| Row-Level Security tenancy (ADR-8) | You wire it | First-class — Supabase's whole model is built around RLS | N/A |
| Auth that also satisfies AP-7 | You still need a separate auth vendor (see below) | **Built in, same region, same Postgres instance** | N/A |
| Object storage for evidence | Separate S3 setup | Built in, same-region, S3-backed under the hood | N/A |
| Ops burden | You run more of the stack yourself | Lower — one vendor for DB + Auth + Storage + Edge Functions | N/A |

Neon is eliminated outright on AP-7. That leaves RDS vs. Supabase, and this is where a second finding matters:

**Auth data residency is its own trap.** Clerk, Auth0, and WorkOS — the default managed-auth choices — **have no confirmed India data residency region as of 2026** (research below). For a DPDPA-compliance vendor to store its own users' auth data (which is personal data) outside India would be an own-goal. The fix isn't a fourth vendor search — it's noticing that **Supabase Auth runs inside the same Mumbai Postgres project you're already provisioning for the database**, so picking Supabase for the database silently solves the auth-residency problem too, at zero extra vendor surface.

**Recommendation: Supabase, `ap-south-1` (Mumbai), for Postgres + pgvector + Auth + Storage.** Migrate pieces out to raw AWS (RDS, Cognito, S3) only if a specific limit is hit — the same "promote out only when measured" discipline Doc 04 §6.1 already applies to pgvector vs. a dedicated vector store.

**Evidence WORM specifically:** Supabase Storage is S3-backed in the project's own region, but **verify Object Lock / compliance-mode retention is available through Supabase's storage layer before committing** — if it isn't exposed, run the Evidence Vault on **raw AWS S3 (`ap-south-1`) with Object Lock in Compliance mode** instead, which is Doc 04's original spec and unambiguously supports WORM. This is the one piece worth keeping separate from the Supabase convergence if the managed layer doesn't expose Object Lock directly — evidence immutability is the product's core trust claim (Doc 04 §6.2); don't compromise on it for stack simplicity.

---

## 6. ⚠ The finding that changes the Model Gateway: no LLM vendor guarantees India-only inference

Doc 04 §5.1 already requires the Model Gateway to redact personal data **before it ever reaches a model provider** — this research confirms *why that line is doing more work than it looks like*:

- **Direct Anthropic or OpenAI APIs**: no India inference region. Full stop.
- **AWS Bedrock, `ap-south-1` (Mumbai)**: hosts Claude models, but current access for the newest Claude models is via **Global cross-Region inference (CRIS)** — AWS's own materials describe this as inference capacity routed globally to serve India-based customers, which means **the ap-south-1 endpoint does not guarantee the actual inference execution stays inside India** for those models.

So there is currently **no LLM vendor path that lets raw personal data reach a model call while staying provably India-resident.** This isn't a gap in the architecture — Doc 04 already anticipated it by requiring redaction at the gateway — but it means that requirement is load-bearing, not aspirational, and the gateway can't be a thin pass-through proxy.

**Concrete implication for the build:**

1. **Self-host the Model Gateway** on the same India-region compute as the agent workers (not a third-party hosted gateway like Portkey/Helicone, which reintroduces the same residency question one hop later).
2. Split every agent task by whether it needs actual data **values** or just **structure**: Vibhaag classifying a column as "looks like a PAN number" needs schema/metadata, not the row values — send only that. Drishti's discovery inventory is mostly structural too. Reserve raw-value exposure for the minimum set of calls that genuinely require it, and redact/tokenize those before egress.
3. **LiteLLM (self-hosted, open source)** is the pragmatic choice for the gateway's provider-routing layer — it already does what Doc 04 asks for structurally (multi-provider abstraction, cost tracking, logging hooks), and self-hosting it inside your own India-region compute is what makes the redaction step actually enforceable, versus trusting a third party's proxy to redact on your behalf.
4. Record this as its own line in the ledger schema (Doc 04 §6.2 already has `prompt_hash` and `model_id` — good) and treat "was this call redacted before egress" as an auditable fact, not an assumption.

This is worth a line in Doc 04 or a future ADR — it's exactly the kind of "never" decision (per the ADR table's "revisit when" column) that should be written down once rather than re-derived by whoever builds the Model Gateway.

---

## 7. Help / docs site

Not covered by Doc 04 at all — it's a new surface, not personal-data-bearing, so AP-7 doesn't gate this choice.

| | Mintlify | Docusaurus | Nextra | GitBook |
|---|---|---|---|---|
| Ops burden | Zero — hosted | Self-hosted (own build/deploy) | Self-hosted | Hosted |
| Cost pre-revenue | Paid (has a free tier for small projects) | Free (just hosting) | Free | Free tier, paid for custom domain/branding at scale |
| API reference generation (Phase 4 partner APIs) | Best-in-class, OpenAPI-driven | Plugin-based, more setup | Manual | Decent |
| AI/LLM citation surface (`llms.txt`, structured content) | Generates this natively | Manual | Manual | Limited |
| Fit with your GEO/AEO workflow | Direct — built for exactly this | Requires manual `llms.txt` authoring | Same | Same |

**Recommendation: Mintlify** for the public help center and (from Phase 4) the partner API reference, given the GEO/AEO/AI-citation work is already part of your toolkit and Mintlify is purpose-built for that surface with zero ops. If pre-revenue cost is a hard constraint at Phase 0, **Docusaurus is the fallback** — same underlying content model, migrate later without much rewrite. Keep the internal strategy docs (`docs/`) as plain repo markdown as they are now; they don't need a docs site.

---

## 8. Hosting split — where AP-6 actually pays off

This is the practical payoff of Doc 04's control-plane/data-plane separation, made concrete:

| Component | Touches raw personal data? | Recommended host |
|---|---|---|
| Next.js App + Site (presentation) | No — renders what the API returns | **Vercel, region pinned to `bom1` (Mumbai)** |
| Node/TS BFF/API layer | Mostly no (routing, auth, aggregation) | Vercel or a small India-region container; either is fine |
| Python agent workers (Drishti, Karya, etc.) | **Yes** | **AWS ECS Fargate, `ap-south-1`** — mature, boring, well-documented; avoid Fly.io's `bom` region for this tier (community reports of capacity/deploy issues there in 2026 — fine for low-stakes services, not for the data plane) |
| Model Gateway (self-hosted LiteLLM) | Yes (pre-redaction) | Same ECS Fargate cluster as the agent workers — keep it physically next to the data it's redacting |
| Temporal | No (orchestration metadata, not data content) | Temporal Cloud, `ap-south-1` |
| Postgres + Auth + Storage | Yes | Supabase, `ap-south-1` |
| Redis (queues, rate limits, agent state) | Transiently, maybe | **Upstash, `ap-south-1`** — confirmed live, serverless, no cluster to run |

The Vercel choice for the presentation layer is safe specifically *because* AP-6 already drew the line correctly: Vercel's global control plane (build metadata, edge routing) never needs to see a data principal's actual information as long as personal data itself never leaves the India-pinned data plane. That's the whole point of the boundary Doc 04 insisted on keeping clean "from Phase 1."

---

## 9. Monorepo tooling

| | Turborepo + pnpm workspaces | Nx | Plain workspaces, no tool |
|---|---|---|---|
| Fit with a TS-only monorepo (App, Site, shared `design-system` package, shared types/API client) | Native, minimal config | Works, but its polyglot abstractions are overkill here | Works for 2 apps, gets messy once `design-system` is shared |
| Python agent runtime | Sits alongside as a sibling directory, orchestrated by CI/Makefile — not inside the JS build graph | Has community Python support, but fighting the grain | Same as Turborepo — it's outside the JS tool's scope either way |
| Learning/ops overhead for a solo founder | Low | Higher | Lowest, until it isn't |

**Recommendation: Turborepo + pnpm workspaces** for `Axiom Proof App/`, `Axiom Proof Site/`, and a new shared `design-system` package (once tokens become real Tailwind config + components, per that folder's README). The Python agent runtime stays a sibling directory managed by `uv` or Poetry, wired in via CI rather than the JS monorepo tool — matching Doc 04's two-language stance rather than forcing one tool to pretend it's polyglot.

---

## 10. Recommended stack — summary table

| Layer | Choice | Why (one line) |
|---|---|---|
| Frontend (App + Site) | Next.js + TypeScript + Tailwind | Unchanged from Doc 04; best ecosystem fit, no reason to deviate |
| API / BFF | Node/TypeScript | Doc 04's own pragmatism note — don't add a third language |
| Agent runtime | Python, direct model-gateway calls per agent | 10 well-scoped agents don't need a second framework abstraction yet |
| Durable orchestration | **Temporal Cloud**, `ap-south-1` | Purpose-built for exactly the "survive a days-long approval wait" requirement |
| Database + Auth + Storage | **Supabase**, `ap-south-1` | One vendor, one region, solves DB + RLS + pgvector + auth-residency together |
| Evidence WORM | AWS S3 `ap-south-1` with Object Lock (Compliance mode) — or Supabase Storage if it exposes Object Lock | Immutability is the product's trust claim; don't compromise for stack simplicity |
| Model Gateway | **Self-hosted LiteLLM**, same India compute as agent workers | No LLM vendor guarantees India-only inference — redaction must happen before egress, in your own infra |
| Queue / cache | Upstash Redis, `ap-south-1` | Serverless, confirmed regional, nothing to operate |
| Agent worker compute | AWS ECS Fargate, `ap-south-1` | Boring and mature for the tier that touches raw personal data |
| Presentation hosting | Vercel, `bom1` | Safe under AP-6 since it never touches raw personal data; minimal ops |
| Docs / help center | Mintlify (Docusaurus if pre-revenue cost bites) | Zero-ops, native `llms.txt`/AEO fit with your existing GTM tooling |
| Monorepo | Turborepo + pnpm workspaces | Native TS fit; Python stays a sibling, not forced into the same tool |

This is a refinement of Doc 04, not a departure from it — every ADR in §10 of that document still holds. What changed is that the two "or"s got resolved, three vendor names got attached to "managed containers, India region," and one real risk (LLM residency) surfaced that should shape how the Model Gateway gets built from day one rather than retrofitted later.

---

## 11. Open items to verify before contracting

Vendor regional support moves fast — everything above was checked August 2026 but should be re-verified at signup, not taken on faith from this document:

- [ ] Confirm Supabase Storage's Object Lock/compliance-retention support directly with Supabase before committing the Evidence Vault to it; fall back to raw S3 `ap-south-1` if it's not exposed.
- [ ] Confirm current Bedrock/Anthropic terms on cross-region inference routing for whichever Claude model version is in use at build time — this changes over time and directly affects the redaction requirement's urgency.
- [ ] Re-check Fly.io `bom` region capacity/stability if it's ever considered for a data-plane workload — community reports in 2026 flagged intermittent issues; fine for control-plane/low-stakes use.
- [ ] Get a written data-processing/subprocessor statement from Temporal, Supabase, Vercel, and Upstash confirming India-region data handling in writing — useful for the Control Library's own evidence requirements later (this product will need to prove its *own* vendor stack is compliant, not just claim it).
