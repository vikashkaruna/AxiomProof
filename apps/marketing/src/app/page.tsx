import Link from 'next/link';
import { BRAND } from '@axiom/config';
import { CONTROL_LIBRARY_COUNT } from '@axiom/control-library';
import type { AgentName } from '@axiom/types';
import { Button, Card, CardContent, Badge, AgentPill } from '@axiom/ui';
import { SubmitButton } from './gap-scan/submit-button';
import { GapScanForm } from './gap-scan/form';

export default function HomePage() {
  return (
    <>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-mist-50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div>
                <Badge variant="indigo" className="mb-4">
                  DPDPA enforcement · 13 May 2027
                </Badge>
                <h1 className="font-heading text-4xl font-semibold tracking-tight text-indigo-500 sm:text-5xl lg:text-6xl">
                  {BRAND.tagline.split('.')[0]}.
                </h1>
                <p className="mt-3 font-heading text-3xl font-semibold text-gold-700 sm:text-4xl">
                  {BRAND.tagline.split('.').slice(1).join('.').trim()}
                </p>
                <p className="mt-6 max-w-xl text-lg text-slate-600">
                  AI agents discover your personal data, assess your gaps against the DPDP Act and
                  Rules, propose the fixes — and <strong>only after you approve</strong>, execute
                  them with a verifiable, rollback-capable, permanently auditable trail.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="accent" size="lg" asChild={false}>
                    <Link href="#gap-scan">Run the free 5-min gap-scan</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild={false}>
                    <Link href="/contact">Talk to the founder</Link>
                  </Button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  No live data connectors. No credit card. Real assessment against{' '}
                  {CONTROL_LIBRARY_COUNT} DPDPA controls in 5 minutes.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <HeroVisual />
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-indigo-500">
              How it works
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Five steps. Agents do the work. You approve at every mutation.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-5">
            {[
              {
                n: 1,
                label: 'Discover',
                agent: 'drishti',
                desc: 'Find personal data across your systems',
              },
              { n: 2, label: 'Classify', agent: 'vibhaag', desc: 'Categorise by DPDPA type' },
              {
                n: 3,
                label: 'Assess',
                agent: 'parikshan',
                desc: `Score against ${CONTROL_LIBRARY_COUNT} controls`,
              },
              { n: 4, label: 'Plan', agent: 'sudhaar', desc: 'Typed actions with rollback' },
              { n: 5, label: 'Approve', agent: null, desc: 'You sign. Then execute.' },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 font-heading text-sm font-semibold text-white">
                    {s.n}
                  </span>
                  <span className="font-heading text-base font-semibold text-indigo-500">
                    {s.label}
                  </span>
                </div>
                {s.agent && (
                  <div className="mt-2">
                    <AgentPill agent={s.agent as AgentName} />
                  </div>
                )}
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* NON-NEGOTIABLE SAFETY */}
        <section className="border-y border-slate-200 bg-mist-50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-indigo-500">
                The non-negotiable safety rules
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                These are enforced architecturally, not by policy. You cannot turn them off.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  n: '01',
                  t: 'No mutating agent action executes without a recorded human approval — a signed, scope-bound token, validated per action.',
                },
                {
                  n: '02',
                  t: 'Every executable action needs a completed dry-run with a readable diff before approval is even possible.',
                },
                {
                  n: '03',
                  t: 'Every action carries a generated, validated rollback plan, created at planning time — not under pressure at execution time.',
                },
                {
                  n: '04',
                  t: 'Every action — read or write, agent or human — is written to the append-only, hash-chained audit ledger.',
                },
                {
                  n: '05',
                  t: 'The planning agent (Sudhaar) holds no write credentials. Separation of duties between proposing and executing.',
                },
                {
                  n: '06',
                  t: 'Blast-radius caps are enforced pre-flight and in-flight, with a global kill switch.',
                },
              ].map((r) => (
                <div key={r.n} className="rounded-xl border border-slate-200 bg-white p-5">
                  <span className="font-mono text-xs text-slate-500">{r.n}</span>
                  <p className="mt-2 text-sm text-slate-700">{r.t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GAP SCAN FUNNEL */}
        <section id="gap-scan" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-indigo-500">
              Free 5-minute DPDPA gap-scan
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Answer 12 questions. Get a prioritised report against the same {CONTROL_LIBRARY_COUNT}
              -control library a paid engagement uses. No live data connectors — your inputs stay on
              this page.
            </p>
          </div>

          <Card className="mt-10">
            <CardContent className="p-6 sm:p-8">
              <GapScanForm />
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="border-t border-slate-200 bg-indigo-500 text-white">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
            <h2 className="font-heading text-3xl font-semibold">Enforcement is 8 months away.</h2>
            <p className="mt-3 text-lg text-indigo-100">
              Discovery + remediation take 6–9 months. Starting at enforcement means being
              non-compliant at enforcement.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="proof" size="lg" asChild={false}>
                <Link href="#gap-scan">Run the gap-scan</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                asChild={false}
              >
                <Link href="/contact">Book a 30-min call</Link>
              </Button>
            </div>
          </div>
        </section>
    </>
  );
}

function HeroVisual() {
  return (
    <div className="relative aspect-square w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Posture</p>
          <p className="font-heading text-4xl font-semibold text-indigo-500">
            62<span className="text-base text-slate-500">/100</span>
          </p>
        </div>
        <Badge variant="warning">At Risk</Badge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist-200">
        <div className="h-full w-[62%] bg-gold-500" />
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {[
          { a: 'drishti', s: 'Found 17 systems holding personal data' },
          { a: 'vibhaag', s: 'Classified 1,284 fields' },
          { a: 'parikshan', s: `38 of ${CONTROL_LIBRARY_COUNT} controls assessed` },
          { a: 'saakshi', s: 'Sealed 14 evidence artifacts' },
          { a: 'sudhaar', s: 'Generated 7-action plan' },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <AgentPill agent={row.a as AgentName} showPersona={false} />
            <span className="text-slate-600">{row.s}</span>
          </div>
        ))}
      </div>
      <div className="absolute -bottom-3 -right-3 rounded-lg border border-gold-500 bg-gold-50 px-3 py-1.5 font-mono text-xs text-gold-700 shadow-sm">
        Chain verified · 1,284 entries
      </div>
    </div>
  );
}
