# Axiom Proof — Site

The public marketing site: hero, safety-model strip, agent roster, pricing, and the interactive free gap-scan (questionnaire → generated readiness report), per [Solution Architecture § L1](../docs/04_Solution_Architecture.md#3-layer-1--experience--presentation) (`Public site + gap-scan`, Phase 0).

## What's here

- `design/Axiom Proof Site.dc.html` — the source-of-truth prototype pulled from Claude Design, including the working gap-scan scoring logic (see the `Component` class at the bottom of the file — question set, penalty weights, exposure bands). Open directly in a browser.
- `design/support.js` — the Claude Design canvas runtime. Generated, don't edit.

Nothing else exists yet — this folder is where the real Next.js site gets scaffolded next.

## Build reference

- **Design tokens, components, agent identity, voice & tone** → [`../design-system/`](../design-system/). The site is the most brand-forward surface in the product — follow the voice/tone rules (`words we use` / `words we avoid`, and the "never market autonomy without control" rule) closely; this is public-facing copy a regulator or journalist could quote.
- **Gap-scan → Parikshan (assessment agent v0)** is the first real agent to ship, per [`../docs/02_Phase_Wise_Implementation_Plan.md`](../docs/02_Phase_Wise_Implementation_Plan.md) Phase 0 (M0.3–M0.5). The prototype's client-side scoring is a stand-in for that agent — expect to replace it with a real API call once Parikshan v0 exists.
- **Product naming, brand rationale, GTM/launch sequence** → [`../docs/01_Product_Naming_Branding_and_GTM.md`](../docs/01_Product_Naming_Branding_and_GTM.md).
- **Pricing tiers shown on the prototype** (Free Gap-Scan / Readiness Assessment / vDPO Retainer) should be reconciled against the pricing model in [`../docs/DPDPA_Axiom_Minds_Strategic_Roadmap.md`](../docs/DPDPA_Axiom_Minds_Strategic_Roadmap.md) before shipping — the prototype numbers are illustrative.

## Next step

Scaffold the site (suggested, not yet run):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

Then port sections out of `design/Axiom Proof Site.dc.html`, moving the gap-scan's scoring logic into a proper API route as soon as Parikshan v0 exists so the score isn't computed client-side.
