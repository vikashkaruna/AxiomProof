# Axiom Proof — App

The product application: Agent Workbench, Approval Console, Client Portal, Evidence Explorer, and every other authenticated surface in [Solution Architecture § L1](../docs/04_Solution_Architecture.md#3-layer-1--experience--presentation).

## What's here

- `design/Axiom Proof App.dc.html` — the source-of-truth prototype pulled from Claude Design. 21 modular screens, in-app routing, 3 demo tenants, all flows wired with mock data. Open it directly in a browser (it's self-contained with `design/support.js`).
- `design/support.js` — the Claude Design canvas runtime the prototype depends on. Generated, don't edit.

Nothing else exists yet — this folder is where the real Next.js app gets scaffolded next.

## Build reference

- **Routes, owning agent, phase, and data entities per screen** → [`../Axiom Proof Handoff Map/`](../Axiom%20Proof%20Handoff%20Map/) — this is the map from prototype screen to route to backend entity. Read it before wiring any screen to real data.
- **Design tokens, components, agent identity system** → [`../design-system/`](../design-system/). Implement as Tailwind config + CSS variables, don't hand-roll a second palette.
- **Target stack**: Next.js + TypeScript + Tailwind, server components for report-heavy views, WebSocket for live agent progress ([Doc 04 §3.3](../docs/04_Solution_Architecture.md)).
- **Non-negotiable safety rules** (approval tokens, dry-run before approval, generated rollback, hash-chained ledger, no write creds on the planning agent, blast-radius caps) apply to every screen that touches execution — see the Handoff Map's rules section and [Doc 04 §5.2](../docs/04_Solution_Architecture.md).
- **Phase sequencing** — which screens/modules are real in which phase — [`../docs/02_Phase_Wise_Implementation_Plan.md`](../docs/02_Phase_Wise_Implementation_Plan.md).

## Next step

Scaffold the app (suggested, not yet run):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

Then port screens out of `design/Axiom Proof App.dc.html` one route at a time, cross-checking each against the Handoff Map's route table.
