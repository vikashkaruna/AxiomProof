export const metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-indigo-500">
        Terms of service
      </h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: August 2026</p>
      <div className="prose prose-slate mt-6 max-w-none text-slate-600">
        <p>
          These terms govern your use of axiomproof.ai and the related Axiom Proof
          product operated by Axiom Minds Private Limited. By using the service
          you agree to these terms. The full terms of service will be published
          before the public launch of paid plans. The free gap-scan is provided
          as-is during the public beta and stores only a salted hash of your
          session (no PII) on our infrastructure.
        </p>
        <h2 className="mt-8 font-heading text-xl font-semibold text-indigo-500">
          What Axiom Proof is and isn't
        </h2>
        <p>
          Axiom Proof is a compliance automation platform. It produces compliance
          artifacts and recommendations. It does not provide legal advice, and
          nothing in the product constitutes a legal opinion or a compliance
          guarantee. Customer counsel retains responsibility for legal advice.
        </p>
      </div>
    </main>
  );
}
