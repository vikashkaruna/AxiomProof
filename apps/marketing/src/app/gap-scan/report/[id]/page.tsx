import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@axiom/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  PostureScore,
  SeverityChip,
} from '@axiom/ui';
import { BRAND } from '@axiom/config';
import { formatINR } from '@axiom/ui';

export const dynamic = 'force-dynamic';

export default async function GapScanReportPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseAdmin();
  const { data: scan } = await supabase
    .from('gap_scan_responses')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!scan) notFound();

  const report = scan.report_snapshot as any;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-indigo-500">
        ← Back to home
      </Link>

      <div>
        <Badge variant="indigo">Free gap-scan</Badge>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-indigo-500 sm:text-4xl">
          Your DPDPA readiness report
        </h1>
        <p className="mt-2 text-slate-600">
          Scored against 43 controls from {BRAND.name} Control Library v{scan.library_version}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall posture</CardTitle>
          <CardDescription>
            0–100, where 100 is fully compliant. 5% global discount applied for unverified
            self-attestation — verified controls score higher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostureScore score={scan.posture_score} exposureInr={scan.estimated_exposure_inr} />
        </CardContent>
      </Card>

      {report.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 things to fix first</CardTitle>
            <CardDescription>Ranked by risk-weighted exposure.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {report.recommendations.map((r: any) => (
                <li
                  key={r.priority}
                  className="flex items-start gap-3 rounded-md border border-slate-200 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 font-mono text-sm font-semibold text-white">
                    {r.priority}
                  </span>
                  <div>
                    <p className="font-medium text-slate-700">{r.title}</p>
                    <p className="text-xs text-slate-500">Estimated effort: {r.effort}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All findings ({report.findings?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-mist-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Control</th>
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Risk pts</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(report.findings ?? []).map((f: any) => (
                <tr key={f.controlId}>
                  <td className="px-4 py-2">
                    <code className="rounded bg-mist-100 px-1 font-mono text-xs text-indigo-700">
                      {f.controlId}
                    </code>
                    <p className="mt-0.5 text-xs text-slate-600">{f.title}</p>
                  </td>
                  <td className="px-4 py-2">
                    <SeverityChip severity={f.severity} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{Number(f.score).toFixed(0)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{Number(f.riskPoints).toFixed(1)}</td>
                  <td className="px-4 py-2 text-xs">
                    {f.score >= 80 ? (
                      <Badge variant="success">Compliant</Badge>
                    ) : f.score >= 40 ? (
                      <Badge variant="warning">Partial</Badge>
                    ) : (
                      <Badge variant="danger">Gap</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {scan.follow_up_requested && (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-heading text-xl font-semibold text-indigo-500">What's next?</h3>
            <p className="mt-2 text-slate-600">
              The founder will reach out to {scan.contact_email} within 1 business day to walk
              through your findings. This is a 30-min call, not a sales pitch.
            </p>
            <Button asChild={false} variant="accent" size="lg" className="mt-4">
              <Link href="/contact">Or book directly</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-slate-500">
        Report ID: {scan.id} · Library v{scan.library_version} · Scored{' '}
        {new Date(scan.created_at).toLocaleString('en-IN')}
        <br />
        {BRAND.copyright}
      </p>
    </div>
  );
}

import { Button } from '@axiom/ui';
