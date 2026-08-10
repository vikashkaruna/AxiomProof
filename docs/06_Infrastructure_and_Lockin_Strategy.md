# Axiom Proof — Infrastructure & Vendor Lock-In Strategy
### Single-CSP Consolidation, Self-Hosted vs. Managed, and a Local-Model Strategy
**Axiom Minds Private Limited** · **Document:** 06 of 06 · **Date:** August 2026

> **Supersedes the specific vendor picks in [`05_Technology_Stack_Analysis.md`](05_Technology_Stack_Analysis.md) §5, §7, §8** (Supabase, S3, Upstash, ECS Fargate) after a second pass focused on lock-in, cost trajectory, and CSP consolidation. Doc 05's *architecture-level* conclusions (Next.js, Node/TS BFF, Temporal for durable orchestration, the LLM-redaction finding) all still hold — this document refines *how* those get deployed, not what they are.

---

## 0. The lock-in framing, stated once so it doesn't need repeating per section

"No vendor lock-in" and "don't scatter across providers" are in tension unless you separate two different things:

- **Where it runs** (which CSP) — consolidating onto one CSP is good ops hygiene: one VPC, one IAM boundary, one bill, private networking between services instead of public-internet hops between vendors.
- **What it's built from** (which software) — this is where lock-in actually lives. A managed service built on an **open, self-hostable engine** (Postgres, Temporal, Valkey, the S3 API, vLLM) can move CSPs or come in-house later by redeploying the same artifact. A managed service built on a **proprietary engine** (Firebase, DynamoDB-only patterns, Clerk's auth model, ECS task definitions) can't — moving it is a rewrite.

So the answer to "consolidate on one CSP, but no lock-in" is: **pick one CSP for where things run, and prefer open/portable software for what runs on it.** Every recommendation below is scored on both axes separately.

---

## 1. Which single CSP — AWS, GCP, or Azure

| | AWS (`ap-south-1`, Mumbai) | GCP (`asia-south1`, Mumbai) | Azure (Central India) |
|---|---|---|---|
| India region maturity | Oldest (since 2016), broadest service parity of the three | Newer, smaller catalog in-region | Mature, strong enterprise footprint |
| Kubernetes quality | EKS — solid, very widely used | **GKE — best-in-class**, Google originated Kubernetes | AKS — solid, historically a step behind GKE |
| GPU availability in-region (for self-hosted models, §4) | Broadest — AWS reached ~100% regional GPU coverage by late 2025; L4-class (G6f) confirmed live in Mumbai | Limited APAC coverage for current-gen GPUs (H200/B200) as of mid-2026 | H100-class available APAC-wide via ND-series; no confirmed Central India specifics |
| Native path to Claude | **Amazon Bedrock** — Claude available in-region with AWS-native IAM/billing (see Doc 05 §6 caveat on cross-region inference) | No native Claude hosting | No native Claude hosting |
| Redis-family story | ElastiCache **defaults to Valkey** (open, BSD-licensed) since 2024 | Memorystore **defaults to Valkey** too, GA across major regions in early 2026 | Still commercial Redis; Microsoft is **retiring** Azure Cache for Redis (2027–2028) in favor of a new "Azure Managed Redis" — the migration path is less settled |
| India govt/BFSI empanelment (MeitY) | Empanelled, including a second India region specifically empanelled for government workloads | Empanelled | Empanelled, historically strong enterprise/BFSI relationships in India |
| Ecosystem depth (Terraform providers, community, hiring pool) | Largest | Large | Large |

**Recommendation: AWS, `ap-south-1`.** Three independent reasons converge on the same answer rather than one: it has the most mature India region by any measure, it has the broadest confirmed GPU catalog in-region (which matters directly for §4), and it's the only one of the three with a native path to the actual model family this product is built around (Bedrock's Claude access), which keeps the Model Gateway's provider list, IAM, and billing inside one boundary instead of a second cross-border relationship with Anthropic directly. GCP would be the right call if Kubernetes ergonomics were the deciding factor — they're not decisive enough here to outweigh AWS's regional maturity and GPU availability. Azure's Redis transition being unsettled is a small but real mark against it for a service you'd depend on long-term.

**What this doesn't mean:** it doesn't mean every service must be AWS-proprietary. The rest of this document deliberately picks *open* engines to run on top of that AWS choice, specifically so a future move off AWS — or a Phase 5 on-prem appliance, which Doc 04 §8 already anticipates — is a redeploy, not a rewrite.

---

## 2. Why Temporal, and why Cloud vs. self-hosted

**Why Temporal at all** (restating Doc 05 §4 briefly): the Workflow/State Engine has to survive a human taking days to approve a batch, resume exactly where it left off, and do this per-tenant at scale. That's a durable-execution problem, not a generic task-queue problem — Temporal (or a close peer) is purpose-built for exactly that primitive (signals, timers, replay-based durability), where a hand-rolled Postgres state machine would be reinventing a hard, well-solved problem under time pressure.

**Lock-in check — this is the important part.** Temporal the *product* is open source (Apache 2.0). Your application code is written against the Temporal SDK's workflow/activity model, not against "Temporal Cloud" specifically — **the exact same code runs against a self-hosted Temporal server with only a connection-string change.** That's a fundamentally different lock-in profile than, say, AWS Step Functions (whose workflow definitions are AWS-proprietary and don't move) or a SaaS-only orchestrator with no self-host option at all.

| | Temporal Cloud (`ap-south-1`) | Self-hosted Temporal (on your EKS cluster) | Alternatives (Restate, Hatchet) |
|---|---|---|---|
| Code portability if you switch | **Total — same SDK, change the connection target** | N/A (you're already there) | Different SDK — real rewrite |
| Ops burden | None — managed | You run a Cassandra/Postgres-backed cluster (their Helm chart is well-maintained, but it's still a stateful distributed system to operate) | Restate: lighter, newer (2023+), smaller ecosystem, self-hosted by default. Hatchet: Postgres-backed, lower ops than Temporal, less battle-tested at this workflow complexity |
| India residency | Confirmed regional | Trivially — it's on your own India-region cluster | Same, if self-hosted in-region |
| Maturity for this use case (long-running, human-in-the-loop, high-stakes correctness) | Most battle-tested option for exactly this pattern | Same engine, same maturity | Promising but earlier-stage; wouldn't bet the approval-execution chain on a 2023-era project yet |

**Recommendation: start on Temporal Cloud, `ap-south-1`, with a named trigger to self-host later.** For a solo founder (AP-4), managed is correct at Phase 0–2 — operating a stateful workflow cluster on top of everything else is exactly the burden Doc 04 warns against. But because the SDK-level lock-in is genuinely near-zero, this isn't a one-way door: **the trigger to self-host is Temporal Cloud's cost crossing a threshold, or a client contractually requiring 100%-in-house infrastructure** — at that point, self-hosting on the already-provisioned EKS cluster is an infra change, not an application rewrite. Write this trigger down now (it belongs in a future ops runbook) so it isn't re-litigated later.

---

## 3. Database + Auth + Storage — does Supabase hold up long-term?

Your instinct to question this is right — it's worth separating "is Supabase the right vendor" from "is the *architecture* underneath it right," because the answer differs by layer.

**The core insight that de-risks this whole choice:** Supabase's core components — PostgreSQL, GoTrue (auth), PostgREST, Storage API, Realtime — are **open source and self-hostable as the same stack**, via Supabase's own published Docker Compose / Helm chart. This is categorically different from Firebase or a proprietary BaaS: you are not locked into Supabase's cloud, you're locked into *Postgres plus a handful of well-known open services*, which is about as portable a foundation as exists in this space.

| Concern | Managed Supabase (Phase 0–2) | Self-hosted Supabase stack (Phase 3+, same components) | Fully custom (RDS + Keycloak/Ory + S3) |
|---|---|---|---|
| Cost trajectory | Pricing scales with DB size, bandwidth, and **Monthly Active Users for Auth** — this is the line item that grows fastest and least predictably as the client base grows, since every client-side user (not just tenants) counts | Postgres compute/storage cost only — no per-MAU auth tax | Similar to self-hosted Supabase, plus your own ops time for auth |
| Scalability ceiling | Backed by RLS-first Postgres, which scales the same way any well-designed Postgres does — the *database* isn't the ceiling, the *pricing model* is | Same database, no pricing ceiling, but now you own backups/HA/upgrades | Same |
| Migration effort if you outgrow it | **Low** — it's the same Postgres schema and the same GoTrue/PostgREST components; self-hosting is a deploy target change, not a data-model rewrite | N/A | N/A |
| Auth-specific residency (Doc 05 §5 finding) | Solved — same-region Postgres | Still solved — same components, your own region | Solved, but you built the auth service yourself |

**Verdict: yes, it fits long-term, with a specific glidepath rather than an open-ended "hope it stays cheap."** Start managed for speed (AP-4). Model out the MAU-based auth cost at your Phase 2–3 client/user projections from `docs/02_Phase_Wise_Implementation_Plan.md` — if it crosses what a self-hosted Postgres + the same open Supabase components would cost on your own EKS cluster, migrate. Because the components are identical either way, that migration is bounded and predictable, not a rewrite risk hanging over the architecture. Keep the Evidence Vault on raw S3 regardless (next section) rather than Supabase Storage — that one's a different call for a different reason.

---

## 4. Evidence WORM — S3 alternatives and the lock-in escape hatch

Object Lock (WORM: write-once-read-many, with Compliance-mode retention that *nobody*, including you, can shorten or delete before expiry) is not S3-exclusive — all three hyperscalers have an equivalent, and there's an open-source, self-hostable option too:

| | AWS S3 Object Lock | GCS Bucket Lock | Azure Blob immutable storage (legal hold / time-based retention) | Self-hosted MinIO (S3-API-compatible, OSS) |
|---|---|---|---|---|
| WORM / compliance-grade retention | Yes, mature, widely audited | Yes, equivalent guarantee | Yes, equivalent guarantee | Yes — MinIO supports Object Lock with Governance/Compliance retention modes |
| API | S3 API (the de facto industry standard — MinIO, Ceph, R2, Wasabi, Backblaze B2 all speak it) | GCS-native API (though GCS also offers an S3-interoperability mode) | Azure Blob API (distinct) | S3 API |
| Durability engineering | Built in (11-nines class, multi-facility) — you don't design this yourself | Same | Same | **You own this** — replication, backup, facility redundancy all become your problem |
| Lock-in if you use only the plain S3 API (no AWS-proprietary extensions) | **Low** — a MinIO or GCS-interop migration is close to mechanical | — | Azure Blob's API is the outlier — migrating *off* it is more work than migrating *between* S3-API-compatible stores | None by definition |

**Recommendation: keep S3 with Object Lock, `ap-south-1`, but as a discipline: write the Evidence Pipeline against the plain S3 API surface only** (`PutObject`, `GetObject`, Object Lock headers) — never AWS-proprietary conveniences like S3 Select or Macie integration for this bucket. That discipline alone is what keeps a future move to MinIO (self-hosted, e.g. for a Phase 5 on-prem/air-gapped appliance — see §6) or GCS mechanical rather than a rewrite. Don't self-host MinIO for evidence storage *now*: the durability engineering S3 gives you for free is exactly the kind of undifferentiated heavy lifting Doc 04's AP-4 says a solo founder shouldn't take on — and evidence durability is the product's core trust claim, not a place to save infra cost early.

---

## 5. Redis/cache — alternatives, and specifically within AWS

This is the one place Doc 05's original pick (Upstash) is worth reversing outright, not just caveating.

| | Upstash Redis | **Amazon ElastiCache for Valkey** | Self-hosted Redis/Valkey (own EKS pods) |
|---|---|---|---|
| Vendor surface | A fourth SaaS vendor, outside your VPC unless you pay for VPC peering | **Inside your existing AWS account/VPC** — no extra vendor relationship, no public-internet hop | Zero vendor relationship, but you own patching/HA |
| Engine lock-in | Redis-protocol compatible, proprietary service | **Valkey — Linux Foundation, BSD-licensed, no licensing lock-in at all**, and it's AWS's own default now for new clusters | Same open engine, maximum portability |
| Client code changes if you later self-host | None (same protocol) | None (same protocol) | N/A |
| Ops burden | None | None (managed) | You run it |

**Recommendation: Amazon ElastiCache for Valkey, `ap-south-1`**, dropping Upstash. This is a straightforward win on every axis you asked about: it removes a whole vendor from the map (directly answers "stop scattering"), it's built on an explicitly open, non-proprietary engine (directly answers "no lock-in" — Valkey exists specifically because the industry rejected Redis Inc.'s 2024 license change), and it sits inside your existing VPC rather than making an outbound call to a third party for every cache hit, which is both faster and a smaller attack surface for a compliance product. If you ever want zero cloud dependency for this layer specifically, self-hosted Valkey on the same EKS cluster is a client-library no-op — nothing in your application code references "ElastiCache," it just talks the Valkey/Redis protocol.

---

## 6. Agent worker compute — why not GKE, Cloud Run, or AKS; and fixing the real lock-in issue with ECS

You're right to push on this, and the honest answer is that **ECS Fargate was the wrong specific pick in Doc 05** — not because AWS is wrong, but because **ECS's task-definition API is AWS-proprietary**. That's real lock-in, independent of which CSP you're on. Here's the corrected comparison:

| | ECS Fargate (Doc 05's original pick) | **Amazon EKS** (Kubernetes on AWS) | GKE | AKS | Cloud Run / Azure Container Apps |
|---|---|---|---|---|---|
| API surface | AWS-proprietary (task definitions, services, ECS-specific scheduling) | **Standard Kubernetes API** — the same manifests run on GKE, AKS, or self-hosted k3s | Standard Kubernetes | Standard Kubernetes | Proprietary serverless-container config, not Kubernetes |
| Portability if you switch CSP later | **Low — rewrite the deployment layer** | **High — redeploy the same YAML/Helm elsewhere** | High | High | Low |
| Serverless convenience (no node management) | Yes | Yes, **if you use EKS Fargate profiles** — serverless pods on top of the standard K8s API | Yes, via GKE Autopilot | Yes, via AKS + virtual nodes | Yes, natively |
| GPU node support (for §7's self-hosted models) | Limited/awkward | **Full GPU node group support**, same GPU catalog as raw EC2 | Full | Full | Not designed for this |
| Best pure Kubernetes UX | N/A | Good | **Best** (Google invented K8s) | Good | N/A |

**Corrected recommendation: Amazon EKS, `ap-south-1`, with Fargate *profiles* for the stateless workloads (Model Gateway, most agent workers) and a small GPU node group for the self-hosted model server.** This keeps the "serverless, low-ops" property Fargate was chosen for in Doc 05, while fixing the actual lock-in problem by standardizing on plain Kubernetes manifests instead of ECS task definitions. The Next.js App and Site can move onto the same cluster too (as containers, using Next.js's `output: 'standalone'` build) — that's the concrete move that answers "stop scattering across providers": one VPC, one IAM boundary, one bill, for everything except Temporal Cloud, Supabase, and the docs site, each of which has its own stated reason above to stay separate. You'll trade away some of Vercel's edge-network/ISR convenience for the App/Site — worth it here specifically because your stated goal is consolidation, not because Vercel was a bad choice in isolation.

---

## 7. Self-hosted open-weight models — a real option now, with one clarification

**First, the clarification, because it changes what you're actually deciding:** hosting a model on a VM is still *cloud-hosted infrastructure* — it's a GPU instance from AWS/GCP/Azure, not "not the CSP." The real choice isn't "CSP vs. no CSP," it's **"CSP-hosted model API (Bedrock/Anthropic) vs. CSP-hosted GPU compute running your own model server (vLLM/TGI on EC2/EKS)."** True zero-CSP self-hosting means physical hardware you own and rack somewhere — see §8 for why that's a different decision entirely.

**Is this a good idea, though?** As of August 2026, more than when Doc 05 was written — the gap has closed faster than expected:

| Model | Class | Fit for self-hosting here |
|---|---|---|
| **DeepSeek V4** | ~large MoE | Best performance-to-inference-cost ratio for self-hosted deployments, per current benchmarking — but full-size deployment needs a real multi-GPU cluster, not one instance |
| **Qwen 3.6 Plus** | Large, 1M context | Frontier-competitive on agentic/tool-use benchmarks — same caveat, this is not a single-GPU model at full size |
| **Qwen3.6 / Mistral Small / Llama, smaller variants (7B–32B, quantized)** | Right-sized | **This is what actually fits a startup GPU budget** — runs on 1–2 of the L4/A10G-class GPUs confirmed available in `ap-south-1` (§1), at real but bounded cost |

**The honest trade-off:** the *best* open-weight models (DeepSeek V4, Qwen3-Coder-480B class) have genuinely closed most of the gap to frontier closed models on agentic/tool-use benchmarks — but running them at that size needs a multi-node H100/H200 cluster, which is not a Phase 0–2 GPU budget for a solo founder, and Mumbai's confirmed current-gen GPU catalog (§1) tops out at L4/A10G-class anyway. A right-sized 7B–32B open model is realistic; frontier-parity self-hosting isn't yet, in this region, at this stage.

**Recommendation — a hybrid Model Gateway routing strategy, which also directly strengthens the Doc 05 §6 residency finding:**

1. **Self-host a right-sized open model** (start with a quantized Qwen3.6 or Mistral Small variant) via vLLM on an EKS GPU node group, `ap-south-1`. Route to it: Vibhaag's structural classification, embedding generation for the vector search, and any task that only needs schema/metadata, not actual data values.
2. **Keep hosted Claude (via Bedrock, same AWS account) behind the redacting gateway** for the tasks where reasoning quality genuinely matters most — Parikshan's assessment scoring, Sudhaar's remediation planning — sending only redacted/tokenized representations per the Doc 05 §6 discipline.
3. This isn't just a cost optimization — it **shrinks the surface area of the residency problem** from Doc 05 §6. Every task that moves to the self-hosted model is a task where "does this call leave India" stops being a question at all, because it never leaves your own EKS cluster.
4. Revisit the "self-host the frontier-class model too" question every 6–12 months — this is the fastest-moving part of the entire stack, and the gap you'd need closed (frontier-parity at a self-hostable size) is closing in real time.

---

## 8. Can you build everything locally?

Yes, technically — and Doc 04 §8 already has a name for this: **the Phase 5 "optional air-gapped variant with self-hosted models,"** built for enterprise/BFSI/government clients whose data-sovereignty demands go beyond "India region" to "our premises, full stop." That's a real, already-planned destination. The question is whether to start there.

| | Fully managed SaaS (what Doc 05 originally proposed) | **Self-hosted OSS on one CSP** (this document's recommendation) | True on-premises hardware |
|---|---|---|---|
| Lock-in | Higher (some proprietary APIs — ECS, Upstash-specific) | **Low** — open engines, standard APIs, CSP is just the deploy target | None |
| Time to first client | Fastest | Fast — same open components, slightly more setup | Slowest by a wide margin — procurement, power, cooling, physical security, redundancy engineering |
| Who engineers durability/HA/backups | The vendor | **You configure it, but on proven managed primitives (EKS, S3, ElastiCache) — the hyperscaler still handles the hardware failure domain** | You, entirely — including the WORM evidence store's durability guarantee, which is the product's core trust claim |
| Fit for a solo founder (AP-4) | Good | **Good — this is the sweet spot** | Actively contradicts AP-4; this is a multi-person, capital-intensive undertaking |
| When it's the right call | Phase 0–1, speed above all | **Phase 0 onward, as the standing posture** | Phase 5, for specific enterprise/government contracts that require it and will pay for it |

**Recommendation: no, not now — but the door is already open when a client needs it.** Building fully on-prem today would mean taking on exactly the operational burden AP-4 warns a solo founder away from, for a durability guarantee (evidence WORM, HA, backups) that AWS already provides as a byproduct of using S3 and EKS correctly. The self-hosted-OSS-on-one-CSP posture in this document gets you nearly all the control and lock-in-resistance of "local" — because every component (Postgres, Temporal, Valkey, vLLM, the S3 API) can be redeployed on-prem later with the same code — without the capex and time cost today. When a specific enterprise contract requires the air-gapped variant, that's Doc 04's Phase 5, and this document's discipline (open engines, standard APIs throughout) is precisely what makes that transition a redeploy instead of a second product to build.

---

## 9. Revised recommendation — supersedes Doc 05 §10 where noted

| Layer | Doc 05 said | **This document says** | Changed? |
|---|---|---|---|
| CSP | Implied AWS by default, not stated explicitly | **AWS, `ap-south-1`, explicitly, as the single consolidation target** | Clarified |
| Frontend hosting | Vercel `bom1` | **Same AWS EKS cluster as everything else** (containerized, `output: standalone`) | **Changed** — consolidation |
| API/BFF | Node/TS, host unspecified | Node/TS, on the same EKS cluster | Clarified |
| Durable orchestration | Temporal Cloud | Temporal Cloud now, **named trigger to self-host on EKS later** (near-zero code migration cost either way) | Refined |
| Database + Auth + Storage(non-evidence) | Supabase | Supabase, **with an explicit cost-crossover trigger to self-host the same OSS components** | Refined |
| Evidence WORM | AWS S3 + Object Lock | Same, **with a discipline (plain S3 API only) that keeps a MinIO/on-prem move mechanical** | Refined |
| Cache/queue | Upstash Redis | **Amazon ElastiCache for Valkey** — same VPC, open engine, one fewer vendor | **Changed** |
| Agent workers + Model Gateway compute | AWS ECS Fargate | **Amazon EKS with Fargate profiles + a GPU node group** — same serverless convenience, standard K8s API instead of proprietary ECS | **Changed** |
| Model strategy | Hosted Claude only, behind a redacting gateway | **Hybrid**: self-hosted right-sized open model (vLLM on EKS GPU nodes) for structure-only/high-volume tasks, hosted Claude via Bedrock for high-stakes reasoning, both behind the same gateway | **Changed** |
| Docs/help site | Mintlify | Mintlify, unchanged — deliberately kept off the consolidated infra since it holds no personal data | Unchanged |
| Monorepo | Turborepo + pnpm | Unchanged | Unchanged |

Net effect: one CSP (AWS) instead of five vendors (AWS + Vercel + Temporal Cloud + Supabase + Upstash) doing the actual work, three of which now have a written, low-cost path to bring in-house if cost or a client's sovereignty requirement demands it, and zero components left on a proprietary API surface that would force a rewrite to move.
