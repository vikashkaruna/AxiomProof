export const metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-indigo-500">
        Privacy policy
      </h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: August 2026</p>
      <div className="prose prose-slate mt-6 max-w-none text-slate-600">
        <p>
          Axiom Minds Private Limited ("we", "us") operates axiomproof.ai and the
          related Axiom Proof product. This page is a stub during Phase 0 and will
          be replaced with the full privacy policy before any production data is
          processed. The product is being built to be compliant with the DPDP
          Act, 2023 and the DPDP Rules, 2025 from day one.
        </p>
        <h2 className="mt-8 font-heading text-xl font-semibold text-indigo-500">
          Data residency
        </h2>
        <p>
          All data we process on behalf of our customers is stored in
          ap-south-1 (Mumbai) on AWS. LLM inference runs through a self-hosted
          model gateway on the same EKS cluster — no third-party model provider
          sees raw personal data, because no major LLM vendor today guarantees
          India-only inference.
        </p>
        <h2 className="mt-8 font-heading text-xl font-semibold text-indigo-500">
          Contact
        </h2>
        <p>
          Privacy inquiries: privacy@axiomminds.ai
        </p>
      </div>
    </main>
  );
}
