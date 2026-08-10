# Axiom Proof — Design System

The single source of truth for brand and UI tokens, shared by [`../Axiom Proof App/`](../Axiom%20Proof%20App/) and [`../Axiom Proof Site/`](../Axiom%20Proof%20Site/). Neither should hand-roll its own palette or type scale.

## What's here

- `Axiom Proof Design System.dc.html` — open in a browser (self-contained with `support.js`). Documents:
  - **Colour** — Deep Indigo `#1E2A4A` (primary), Signal Teal `#0FB5A5` (accent/CTA), Seal Gold `#C9A227` (**reserved exclusively** for sealed evidence / verified badges — never decorative), Ember `#D9534F` (alerts/risk), Slate `#2F3542` (body text), Mist `#F4F6F8` (backgrounds).
  - **Type** — Inter Tight (headings), Inter (body), JetBrains Mono (hashes, logs, audit trails).
  - **Components** — buttons, risk/status badges, phase tags, evidence-seal treatment.
  - **Agent identity system** — mark, colour, Devanagari initial, autonomy ceiling, and persona line for each of the 10 agents (Drishti, Vibhaag, Parikshan, Saakshi, Sudhaar, Karya, Lekha, Nazar, Prativedan, Sanket).
  - **Voice & tone** — words to use / avoid, and the critical brand rule: *never market autonomy without control* — every agentic claim must pair the capability with the approval gate.

## On `/design-sync`

The `/design-sync` skill converts a **built component library** (an npm package or Storybook with a `dist/`) into Claude Design's bundle format and uploads it, so the Claude Design agent designs with your real compiled components. That doesn't apply yet — there is no component code here, only this token/reference document pulled from Claude Design.

The natural sequencing:
1. Implement these tokens as a real Tailwind config / CSS variables + a small component package (buttons, badges, agent avatar, evidence seal) — likely as a shared package consumed by both `Axiom Proof App` and `Axiom Proof Site`.
2. Once that package has a build output, run `/design-sync` from **that package's directory** to push the compiled components back up to the `Axiom Proof Design System` project on claude.ai/design — from then on, further Claude Design work on this project designs with the real components, not generic ones.

## Reference

Brand rationale, positioning, and full GTM detail: [`../docs/01_Product_Naming_Branding_and_GTM.md`](../docs/01_Product_Naming_Branding_and_GTM.md).
