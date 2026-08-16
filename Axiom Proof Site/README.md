# Axiom Proof — Site

The public marketing site: hero, safety-model strip, agent roster, pricing, and the interactive free gap-scan (questionnaire → generated readiness report), per [Solution Architecture § L1](../docs/04_Solution_Architecture.md#3-layer-1--experience--presentation) (`Public site + gap-scan`, Phase 0).

## What's here

- `design/Axiom Proof Site.dc.html` — the source-of-truth prototype pulled from Claude Design, including the working gap-scan scoring logic (see the `Component` class at the bottom of the file — question set, penalty weights, exposure bands). Open directly in a browser.
- `design/support.js` — the Claude Design canvas runtime. Generated, don't edit.

This folder is a frozen design reference. The real Next.js implementation now
lives in `../apps/marketing/`; keep prototype edits isolated from production
code.

## Build reference

- **Design tokens, components, agent identity, voice & tone** → [`../design-system/`](../design-system/). The site is the most brand-forward surface in the product — follow the voice/tone rules (`words we use` / `words we avoid`, and the "never market autonomy without control" rule) closely; this is public-facing copy a regulator or journalist could quote.
- **Gap-scan → Parikshan (assessment agent v0)** is implemented in
  `../apps/marketing/src/app/gap-scan/` and `../apps/marketing/src/lib/`.
  The prototype remains a visual/reference artifact; production report
  snapshots are validated through the shared API schema.
- **Product naming, brand rationale, GTM/launch sequence** → [`../docs/01_Product_Naming_Branding_and_GTM.md`](../docs/01_Product_Naming_Branding_and_GTM.md).
- **Pricing tiers shown on the prototype** (Free Gap-Scan / Readiness Assessment / vDPO Retainer) should be reconciled against the pricing model in [`../docs/DPDPA_Axiom_Minds_Strategic_Roadmap.md`](../docs/DPDPA_Axiom_Minds_Strategic_Roadmap.md) before shipping — the prototype numbers are illustrative.

## Production implementation

Use the real marketing workspace for changes:

```bash
pnpm --filter @axiom/marketing dev
pnpm --filter @axiom/marketing typecheck
```

Cross-check public claims against the strategy and security documents before
shipping copy or autonomy claims.
