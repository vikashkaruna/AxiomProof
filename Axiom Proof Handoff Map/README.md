# Axiom Proof — Handoff Map

The bridge document between the design prototypes and the real build. Read this
when changing screens in `../apps/web/` or `../apps/marketing/` and cross-check
the prototype references in this folder before wiring real data.

## What's here

- `Axiom Proof Handoff Map.dc.html` — open in a browser (self-contained with `support.js`). Contains:
  - **Route map** — all 21 app routes, each screen's owning agent, its build phase, and the data entities it reads/writes.
  - **Core data model** — every entity (Tenant, Engagement, Control, Finding, Plan, Action, DryRun, Approval, ApprovalToken, Execution, Evidence, LedgerEntry, DsarRequest, ConsentRecord, Incident, Connector) with its field shape and which store owns it.
  - **Execution safety chain** — Finding → Plan → Action → DryRun → Approval(+token) → Execution(pre/post state) → Verification → Evidence(closure), all sharing one `correlation_id`.
  - **Cross-screen wiring** — how the prototype's flows connect (dashboard → approval console, assessment run pipeline, ledger drill-down, tenant switcher, kill switch, etc.).
  - **Target stack** — the real technology each layer maps to.
  - **The six non-negotiable safety rules**, restated from Doc 04, that must be enforced architecturally in the real build.

## Why this exists separately

The prototype is UI-only with mock data. This map turns "a screen that looks
right" into "a screen wired to the right route, agent, and entities". The real
web/marketing apps and backend now exist alongside these references, so update
the route map when a production surface changes to prevent drift from
[`../docs/04_Solution_Architecture.md`](../docs/04_Solution_Architecture.md).
