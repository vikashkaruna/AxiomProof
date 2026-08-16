import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import { PageHeader, Card, CardContent, Badge, SeverityChip } from '@axiom/ui';
import { controls as controlLib, CONTROL_LIBRARY_COUNT } from '@axiom/control-library';

export const dynamic = 'force-dynamic';

export default async function ControlLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; severity?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let filtered = controlLib;
  if (resolvedSearchParams.domain) {
    filtered = filtered.filter((c) => c.domain === resolvedSearchParams.domain);
  }
  if (resolvedSearchParams.severity) {
    filtered = filtered.filter((c) => c.severity === resolvedSearchParams.severity);
  }

  const domains = Array.from(new Set(controlLib.map((c) => c.domain))).sort();
  const severities = ['critical', 'high', 'medium', 'low'] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Control library"
        description={`The ${CONTROL_LIBRARY_COUNT} controls derived from the DPDP Act 2023 and DPDP Rules 2025. Each control is versioned, citable, and mapped to a remediation pattern. Library v0.1.0 — published 11 Aug 2026.`}
        meta={
          <>
            <Badge variant="proof">v{controlLib[0]?.introducedInVersion}</Badge>
            <Badge variant="indigo">{controlLib.length} controls</Badge>
            <Badge variant="neutral">{domains.length} domains</Badge>
          </>
        }
      />

      <form action="/controls" method="GET" className="flex flex-wrap items-center gap-2">
        <select
          name="domain"
          defaultValue={resolvedSearchParams.domain ?? ''}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          name="severity"
          defaultValue={resolvedSearchParams.severity ?? ''}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">All severities</option>
          {severities.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Filter
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-mist-100 px-1.5 font-mono text-xs text-indigo-700">
                      {c.id}
                    </code>
                    <Badge variant="indigo">{c.domain}</Badge>
                    <SeverityChip severity={c.severity} />
                    {c.sdfOnly && <Badge variant="warning">SDF only</Badge>}
                    {c.childrenOnly && <Badge variant="warning">Children</Badge>}
                  </div>
                  <h3 className="font-heading text-base font-semibold text-indigo-700">
                    {c.title}
                  </h3>
                  <p className="text-sm text-slate-600">{c.obligation}</p>
                  <p className="text-xs text-slate-500">
                    Citations:{' '}
                    {c.citations.map((cit) => `${cit.instrument} ${cit.reference}`).join('; ')}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Max penalty: ₹{(c.scoring.maxPenaltyINR / 10000000).toFixed(1)} Cr</p>
                  <p>Risk pts: {c.scoring.penaltyPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
