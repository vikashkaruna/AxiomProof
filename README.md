# Axiom Proof

Agentic DPDPA compliance platform · Axiom Minds Private Limited · https://axiomminds.ai

> Agents do the work. You approve. The proof is automatic.

This repo holds the strategy documents, design system, and the two Next.js surfaces (product app + public site) that make up Axiom Proof, plus the handoff map that bridges the design prototypes to the real build.

## Layout

| Folder | Contents |
|---|---|
| [`docs/`](docs/) | Strategy & build document set — naming/GTM, phase-wise implementation plan, BRD/PRD, solution architecture, strategic roadmap. Start at [`docs/00_README_Document_Index.md`](docs/00_README_Document_Index.md). |
| [`design-system/`](design-system/) | Brand & UI tokens, components, agent identity system, voice & tone — the shared source of truth for both surfaces below. |
| [`Axiom Proof App/`](Axiom%20Proof%20App/) | The product application (Agent Workbench, Approval Console, Client Portal, Evidence Explorer, …). Prototype + build notes. |
| [`Axiom Proof Site/`](Axiom%20Proof%20Site/) | The public marketing site + free gap-scan. Prototype + build notes. |
| [`Axiom Proof Handoff Map/`](Axiom%20Proof%20Handoff%20Map/) | Route map, data model, and cross-screen wiring — the reference for turning either prototype into a real, data-wired build. |

All four design artifacts above were pulled from the [Axiom Proof Claude Design project](https://claude.ai/design/p/cee6d477-590c-42ea-8a6f-8978f4d85948).

## The non-negotiable safety rules

These apply to every mutating action anywhere in the product, and must be enforced architecturally, not by convention (full detail in [`docs/04_Solution_Architecture.md`](docs/04_Solution_Architecture.md)):

1. No mutating agent action executes without a recorded human approval — a signed, scope-bound token, validated per action.
2. Every executable action needs a completed dry-run with a readable diff before approval is even possible.
3. Every action carries a generated, validated rollback plan, created at planning time.
4. Every action — read or write, agent or human — is written to the append-only, hash-chained audit ledger.
5. The planning agent (Sudhaar) holds no write credentials. Separation of duties.
6. Blast-radius caps are enforced pre-flight and in-flight, with a global kill switch.

## Where to start building

1. Read [`docs/00_README_Document_Index.md`](docs/00_README_Document_Index.md) for full orientation, then [`docs/02_Phase_Wise_Implementation_Plan.md`](docs/02_Phase_Wise_Implementation_Plan.md) for what's in scope for Phase 0.
2. Read [`Axiom Proof Handoff Map/`](Axiom%20Proof%20Handoff%20Map/) for the route/data model reference.
3. Scaffold `Axiom Proof App/` and `Axiom Proof Site/` as Next.js + TypeScript + Tailwind apps (see each folder's README), styled from `design-system/`.
