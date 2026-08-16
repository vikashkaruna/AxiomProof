# Axiom Proof — Phase-Wise Implementation Plan

### Agentic DPDPA Compliance Platform | Axiom Minds Private Limited

**Document:** 02 of 05 · **Horizon:** Month 0 → Month 36 · **Date:** August 2026

> **Operating principle throughout:** _Agents discover. Agents assess. Agents collect evidence. Agents generate reports. Agents propose remediation plans. **The human reviews and approves.** Only then do agents execute — in batches or individually — with full traceability, audit logging and a rollback plan generated for every single action._

---

## 0. THE AGENTIC AUTONOMY LADDER

Every phase of this plan is defined by _how much the agents do unsupervised_, not just by which features ship. This ladder is the spine of the roadmap.

| Level  | Name                             | Agent does                                                                         | Human does                                                          | Target phase                   |
| ------ | -------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------ |
| **L0** | Agent-Assisted                   | Drafts, researches, summarises; no system access                                   | Everything client-facing; all delivery                              | Phase 0–1                      |
| **L1** | Agent-Proposes                   | Runs discovery/assessment; generates findings, reports, remediation plans          | Reviews every output; executes all fixes manually                   | Phase 1–2                      |
| **L2** | Agent-Executes-on-Approval       | Everything in L1, plus executes approved fixes with dry-run + rollback             | Reviews and approves each plan/batch before execution               | **Phase 3 — the core product** |
| **L3** | Continuous-with-Exception-Review | Continuously monitors, re-assesses, auto-remediates pre-approved low-risk classes  | Reviews exceptions and high-risk classes only; sets standing policy | Phase 4–5                      |
| **L4** | Policy-Governed Autonomy         | Operates within human-authored guardrail policy; escalates only on policy boundary | Authors and revises policy; audits periodically                     | Phase 5+ (aspirational)        |

**Hard rule at every level:** no agent action that mutates a client system ever executes without a recorded human approval, a completed dry-run, and a generated rollback plan. This is non-negotiable and is enforced architecturally, not by convention.

---

## PHASE 0 — FOUNDATION (Months 0–1)

**Objective:** Legal existence, public presence, and the minimum agent tooling to run a credible assessment.
**Autonomy level:** L0 → L1 (internal only)
**Revenue target:** ₹0 (setup)

### Modules built

| #    | Module                              | Features                                                                                                                                                          | Sequence |
| ---- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M0.1 | **Corporate & Digital Foundation**  | Incorporation of Axiom Minds Pvt Ltd; PAN/TAN/GST; bank + invoicing; `axiomminds.ai` live; trademark filing for AXIOM PROOF                                       | 1        |
| M0.2 | **Control Library v0**              | DPDPA Act + DPDP Rules 2025 decomposed into 46 discrete, testable controls; each mapped to section/rule citation, evidence type required, and remediation pattern | 2        |
| M0.3 | **Parikshan — Assessment Agent v0** | Structured questionnaire engine; control-mapped scoring; risk weighting; penalty-exposure calculator                                                              | 3        |
| M0.4 | **Prativedan — Report Agent v0**    | Templated report generation (findings, prioritised gaps, exposure estimate); branded PDF output                                                                   | 4        |
| M0.5 | **Free Gap-Scan (public)**          | Lightweight self-serve questionnaire → auto-generated summary report → consultation CTA                                                                           | 5        |
| M0.6 | **Agent Workbench (internal)**      | Founder's private console for running agents, reviewing outputs, managing prompt/version registry                                                                 | 6        |

### Exit criteria

Company incorporated; site live; gap-scan operational and producing a report a paying client would respect; control library covers all core DPDPA obligations.

---

## PHASE 1 — FIRST CASH (Months 2–5)

**Objective:** 3–5 paying engagements delivered agent-assisted, founder-supervised. Capture every repeated task.
**Autonomy level:** L1 (agents propose, human does everything client-facing)
**Revenue target:** ₹3–6 lakh cumulative

### Modules built

| #    | Module                                | Features                                                                                                                                                                     | Sequence |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M1.1 | **Drishti — Discovery Agent v0**      | Interview-driven and document-driven data discovery; system inventory capture; data-flow mapping from stated inputs (no live connectors yet)                                 | 1        |
| M1.2 | **Vibhaag — Classification Agent v0** | Classifies discovered data into DPDPA categories; flags children's data, sensitive categories, cross-border flows                                                            | 2        |
| M1.3 | **RoPA Generator**                    | Auto-generates Record of Processing Activities from discovery + classification output                                                                                        | 3        |
| M1.4 | **Sudhaar — Remediation Planner v0**  | Converts each gap into a proposed fix: action, owner, effort, priority, dependency, and _rollback consideration_; outputs a reviewable plan document                         | 4        |
| M1.5 | **Saakshi — Evidence Agent v0**       | Structured evidence capture with timestamp, source attribution, and content hash; evidence-to-control linkage                                                                | 5        |
| M1.6 | **Policy & Notice Generator**         | Privacy notice, consent notice, retention policy, DPA templates — generated against client's actual discovered data map                                                      | 6        |
| M1.7 | **Human Review Console v0**           | Founder reviews every agent output before it reaches a client; approve / edit / reject with reason capture (this reason-capture is the training data for Phase 2 automation) | 7        |
| M1.8 | **Delivery Playbook Capture**         | Every repeated manual task logged with time-spent; ranked automation backlog auto-maintained                                                                                 | 8        |

### Exit criteria

3–5 clients served; assessment-to-report cycle time measured and reduced by ≥40% vs first engagement; automation backlog ranked by (frequency × time-cost).

---

## PHASE 2 — REPEATABILITY (Months 6–9)

**Objective:** Automate the highest-cost repeated tasks. Introduce live discovery. Build the approval spine.
**Autonomy level:** L1 → L2 (read-only execution)
**Revenue target:** 8–15 clients, ₹3–6 lakh MRR-equivalent

### Modules built

| #    | Module                                     | Features                                                                                                                                                       | Sequence |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M2.1 | **Connector Framework v1**                 | Pluggable read-only connectors; first three: PostgreSQL/MySQL, Google Workspace/M365, AWS S3 or equivalent object store                                        | 1        |
| M2.2 | **Drishti v1 — Live Discovery**            | Agent-run scans against connected systems; **batch mode** (full estate sweep) and **targeted mode** (single system/schema); scheduled or on-demand             | 2        |
| M2.3 | **Vibhaag v1 — Automated Classification**  | ML/LLM classification of discovered fields; confidence scoring; human-review queue for low-confidence classifications                                          | 3        |
| M2.4 | **Evidence Vault v1**                      | Immutable, content-addressed evidence store; WORM semantics; evidence-pack assembly and export                                                                 | 4        |
| M2.5 | **Lekha — Audit & Traceability Agent v1**  | Append-only, hash-chained action ledger; records agent identity, model + version, prompt hash, inputs, outputs, human approver, timestamp for **every** action | 5        |
| M2.6 | **Approval Workflow Engine v1**            | Formal plan → review → approve/reject → execute state machine; role-based approval; approval artifacts are themselves evidence                                 | 6        |
| M2.7 | **Prativedan v1 — Multi-Format Reporting** | Board report, auditor pack, DPB-ready submission format, technical remediation register                                                                        | 7        |
| M2.8 | **DSAR / Rights Request Tracker**          | Intake, identity verification workflow, fulfilment tracking, statutory clock monitoring, response generation                                                   | 8        |
| M2.9 | **Nazar — Regulatory Watch Agent v0**      | Monitors MeitY/DPB/gazette sources; flags changes; maps changes to affected controls in the library                                                            | 9        |

### Exit criteria

Live discovery working against ≥3 connector types; every agent action written to the hash-chained ledger; approval workflow enforced on all outputs; assessment delivery time down ≥60% from Phase 1 baseline.

---

## PHASE 3 — AGENTIC EXECUTION (Months 10–18) ⭐ _the core product_

**Objective:** Agents execute approved remediation. This is the differentiated capability the entire strategy rests on.
**Autonomy level:** **L2 — agent-executes-on-approval**
**Revenue target:** 15–30 clients; ₹40–90 lakh ARR-equivalent by M12, growing into the May 2027 enforcement wave

### Modules built

| #     | Module                                          | Features                                                                                                                                                                                | Sequence |
| ----- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M3.1  | **Sudhaar v1 — Structured Remediation Planner** | Generates machine-executable remediation plans: each action typed, parameterised, risk-scored, dependency-ordered, with explicit blast radius and **mandatory generated rollback plan** | 1        |
| M3.2  | **Dry-Run / Simulation Engine**                 | Every executable action runs in simulation first; produces a diff preview showing exactly what would change; no approval possible without a successful dry-run                          | 2        |
| M3.3  | **Approval Console v1 (customer-facing)**       | Human reviews plan, sees dry-run diff, sees rollback plan, sees blast radius; approves **individually or as a batch**; partial approval supported (approve 7 of 12 actions)             | 3        |
| M3.4  | **Karya — Execution Agent v1**                  | Executes only approved actions; **batch execution** with configurable concurrency and stop-on-failure, or **individual execution**; idempotent; every step logged pre- and post-state   | 4        |
| M3.5  | **Rollback Engine**                             | Executes generated rollback plans on demand or automatically on failure threshold; rollback itself is dry-run-able and fully logged                                                     | 5        |
| M3.6  | **Blast-Radius Guardrails**                     | Hard caps on records/systems affected per batch; mandatory escalation above threshold; production-vs-non-production awareness; kill switch                                              | 6        |
| M3.7  | **Post-Execution Verification Agent**           | Re-runs the specific assessment checks the remediation targeted; confirms the gap actually closed; produces closure evidence                                                            | 7        |
| M3.8  | **Consent Management (CMP) v1**                 | Cookie + purpose-based consent capture; consent ledger with 7-year retention; withdrawal workflow; English + Hindi at launch                                                            | 8        |
| M3.9  | **Breach & Incident Ops v1**                    | Incident intake; 72-hour DPB notification workflow with statutory clock; affected-principal notification generation; forensic log instrumentation                                       | 9        |
| M3.10 | **Continuous Monitoring v1**                    | Scheduled re-discovery and re-assessment; drift detection; alerting on newly-introduced gaps                                                                                            | 10       |
| M3.11 | **Client Portal**                               | Client-facing dashboard: posture score, open gaps, pending approvals, evidence library, report archive                                                                                  | 11       |

### The execution safety model (non-negotiable design constraints)

Every executable action must carry, before it can be approved:

1. **Typed action definition** — not free-text; a parameterised operation from a vetted catalogue
2. **Risk score and blast radius** — how many records/systems/users affected
3. **Completed dry-run with diff preview** — approval is architecturally blocked without this
4. **Generated rollback plan** — itself validated as executable
5. **Named human approver** — captured with identity, timestamp, and approval scope

And after execution: 6. **Pre-state and post-state snapshot** written to the ledger 7. **Verification result** from the post-execution verification agent 8. **Closure evidence** sealed into the evidence vault

### Exit criteria

Agents executing approved remediation in production client environments; zero unapproved mutations (architecturally enforced); rollback exercised successfully at least once in a controlled test; measurable reduction in client time-to-remediation vs manual baseline.

---

## PHASE 4 — SCALE & CONTINUOUS COMPLIANCE (Months 19–30)

**Objective:** Move from project-based engagements to continuous compliance subscriptions. Introduce standing pre-approvals.
**Autonomy level:** **L3 — continuous with exception review**
**Revenue target:** ₹1.5–3 crore ARR

### Modules built

| #    | Module                             | Features                                                                                                                                                                                          |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M4.1 | **Standing Approval Policies**     | Human authors policy: _"auto-remediate expired-retention deletions under 1,000 records in non-production, without per-instance approval."_ Agents operate within it; everything outside escalates |
| M4.2 | **Multi-Regulator Control Reuse**  | Control library extended to RBI, SEBI, IRDAI, CERT-In overlays; single evidence artifact satisfies multiple frameworks; cross-framework coverage map                                              |
| M4.3 | **Connector Framework v2**         | Expanded connector catalogue: major CRMs, HRMS, data warehouses, ticketing, code repositories                                                                                                     |
| M4.4 | **Self-Serve SMB Tier**            | Productised low-touch tier: self-onboarding, automated assessment, guided remediation without founder involvement                                                                                 |
| M4.5 | **Vendor / Processor Risk (TPRM)** | Vendor inventory, DPA tracking, processor questionnaire automation, sub-processor chain mapping                                                                                                   |
| M4.6 | **DPIA Automation**                | Guided DPIA generation for SDF-designated and high-risk processing                                                                                                                                |
| M4.7 | **Partner / White-Label Portal**   | Multi-client management for CA/CS/law/MSP partners; branded report output                                                                                                                         |
| M4.8 | **Sectoral Pack #1**               | Healthcare (ABDM/NHA retention vs DPDPA erasure conflict) or BFSI (RBI/Account Aggregator overlay)                                                                                                |
| M4.9 | **Sanket — Market Signal Agent**   | Buying-intent scoring from hiring posts and tenders; feeds GTM                                                                                                                                    |

### First-hire trigger

Only when 3 consecutive months of MRR comfortably cover the hire **in addition to** founder draw. Likely first roles: part-time privacy analyst (review capacity) and/or contract engineer (connector build).

---

## PHASE 5 — MATURITY (Months 31–36+)

**Objective:** Enterprise-grade deployment options and policy-governed autonomy.
**Autonomy level:** L3 → L4
**Revenue target:** ₹3–6 crore ARR base case

| #    | Module                            | Features                                                                                                                  | Gate                                                    |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| M5.1 | **Split-Plane Architecture**      | SaaS control plane + in-perimeter data plane; agents execute inside customer boundary, control/orchestration stays hosted | Enterprise demand + funding                             |
| M5.2 | **On-Prem / VPC Deployment**      | Kubernetes-packaged appliance; air-gap-capable variant; self-hosted model option                                          | Enterprise demand + funding                             |
| M5.3 | **Enterprise Tier**               | SSO/SAML, granular RBAC, custom SLAs, dedicated support                                                                   | Certifications complete                                 |
| M5.4 | **SOC 2 Type 2 / ISO 27001**      | Full certification                                                                                                        | Revenue-triggered                                       |
| M5.5 | **Sectoral Pack #2**              | Second vertical                                                                                                           | Cash-funded                                             |
| M5.6 | **Consent Manager Registration**  | ₹2 crore net-worth requirement                                                                                            | **Gated: outside capital or substantial reserves only** |
| M5.7 | **Policy-Governed Autonomy (L4)** | Agents operate under human-authored guardrail policy with periodic audit rather than per-action approval                  | Proven L3 track record                                  |

---

## MODULE MASTER INDEX (build sequence at a glance)

| Seq | Module                             | Phase | Agent             | Autonomy |
| --- | ---------------------------------- | ----- | ----------------- | -------- |
| 1   | Corporate & Digital Foundation     | 0     | —                 | —        |
| 2   | Control Library v0                 | 0     | —                 | —        |
| 3   | Assessment Agent v0                | 0     | Parikshan         | L0       |
| 4   | Report Agent v0                    | 0     | Prativedan        | L0       |
| 5   | Free Gap-Scan                      | 0     | Parikshan         | L1       |
| 6   | Agent Workbench                    | 0     | —                 | —        |
| 7   | Discovery Agent v0                 | 1     | Drishti           | L1       |
| 8   | Classification Agent v0            | 1     | Vibhaag           | L1       |
| 9   | RoPA Generator                     | 1     | Vibhaag           | L1       |
| 10  | Remediation Planner v0             | 1     | Sudhaar           | L1       |
| 11  | Evidence Agent v0                  | 1     | Saakshi           | L1       |
| 12  | Policy & Notice Generator          | 1     | Prativedan        | L1       |
| 13  | Human Review Console v0            | 1     | —                 | L1       |
| 14  | Connector Framework v1             | 2     | —                 | L2(read) |
| 15  | Live Discovery                     | 2     | Drishti           | L2(read) |
| 16  | Automated Classification           | 2     | Vibhaag           | L2(read) |
| 17  | Evidence Vault v1                  | 2     | Saakshi           | L2       |
| 18  | Audit & Traceability Ledger        | 2     | Lekha             | L2       |
| 19  | Approval Workflow Engine           | 2     | —                 | L2       |
| 20  | Multi-Format Reporting             | 2     | Prativedan        | L2       |
| 21  | DSAR / Rights Tracker              | 2     | —                 | L2       |
| 22  | Regulatory Watch v0                | 2     | Nazar             | L2       |
| 23  | **Structured Remediation Planner** | 3     | Sudhaar           | L2       |
| 24  | **Dry-Run / Simulation Engine**    | 3     | —                 | L2       |
| 25  | **Approval Console (customer)**    | 3     | —                 | L2       |
| 26  | **Execution Agent**                | 3     | Karya             | **L2**   |
| 27  | **Rollback Engine**                | 3     | Karya             | L2       |
| 28  | **Blast-Radius Guardrails**        | 3     | —                 | L2       |
| 29  | Post-Execution Verification        | 3     | Parikshan         | L2       |
| 30  | Consent Management (CMP)           | 3     | —                 | L2       |
| 31  | Breach & Incident Ops              | 3     | —                 | L2       |
| 32  | Continuous Monitoring              | 3     | Drishti/Parikshan | L2       |
| 33  | Client Portal                      | 3     | —                 | L2       |
| 34  | Standing Approval Policies         | 4     | —                 | **L3**   |
| 35  | Multi-Regulator Control Reuse      | 4     | Parikshan         | L3       |
| 36  | Connector Framework v2             | 4     | —                 | L3       |
| 37  | Self-Serve SMB Tier                | 4     | all               | L3       |
| 38  | Vendor / Processor Risk            | 4     | —                 | L3       |
| 39  | DPIA Automation                    | 4     | Parikshan         | L3       |
| 40  | Partner / White-Label Portal       | 4     | —                 | L3       |
| 41  | Sectoral Pack #1                   | 4     | —                 | L3       |
| 42  | Market Signal Agent                | 4     | Sanket            | L3       |
| 43  | Split-Plane Architecture           | 5     | —                 | L3       |
| 44  | On-Prem / VPC                      | 5     | —                 | L3       |
| 45  | Enterprise Tier                    | 5     | —                 | L3       |
| 46  | SOC 2 Type 2 / ISO 27001           | 5     | —                 | —        |
| 47  | Sectoral Pack #2                   | 5     | —                 | L3       |
| 48  | Consent Manager Registration       | 5     | —                 | gated    |
| 49  | Policy-Governed Autonomy           | 5     | all               | **L4**   |

---

## CRITICAL PATH & DEPENDENCIES

```
Incorporation + axiomminds.ai
        ↓
Control Library v0 ──→ Assessment Agent ──→ Report Agent ──→ Free Gap-Scan
        ↓                                                          ↓
Discovery Agent ──→ Classification Agent ──→ RoPA          First paid clients
        ↓                                                          ↓
Evidence Agent ──→ Evidence Vault ──→ Audit Ledger (Lekha)  Playbook capture
        ↓                                    ↓                     ↓
Connector Framework ──→ Live Discovery       └──→ Approval Workflow Engine
        ↓                                                          ↓
Remediation Planner (structured) ──→ Dry-Run Engine ──→ Approval Console
                                              ↓
                                    Execution Agent (Karya)
                                              ↓
                        Rollback Engine + Blast-Radius Guardrails
                                              ↓
                              Post-Execution Verification
                                              ↓
                              Continuous Monitoring → Standing Policies (L3)
```

**Hard dependencies:**

- Audit Ledger (Lekha) **must exist before** any execution capability — you cannot ship Karya without Lekha.
- Dry-Run Engine **must exist before** Approval Console — approval without a diff preview is not informed approval.
- Rollback Engine **must exist before** first production execution — no exceptions.
- Evidence Vault **must exist before** multi-format reporting can claim audit-readiness.

**Scheduling note:** nothing after Phase 1 is scheduled by calendar date. Each phase begins when the prior phase's exit criteria are met _and_ cash is available to fund the build. Phase durations shown are planning estimates for a solo founder with agent leverage, not commitments.
