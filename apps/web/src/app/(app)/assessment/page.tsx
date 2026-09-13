'use client';

import React, { useState } from 'react';

interface ControlRow {
  id: string;
  name: string;
  domain: string;
  cite: string;
  ev?: string;
  stL: 'PASS' | 'PARTIAL' | 'FAIL';
  pct: number;
}

const SAMPLE_CONTROLS: ControlRow[] = [
  {
    id: 'NOT-01',
    name: 'Itemised notice at collection in 22 scheduled languages',
    domain: 'Notice & consent',
    cite: 'DPDP §5 · Rule 3',
    ev: 'e-8839',
    stL: 'PASS',
    pct: 100,
  },
  {
    id: 'NOT-02',
    name: 'Independent withdrawal mechanism accessible at equal ease',
    domain: 'Notice & consent',
    cite: 'DPDP §6(4)',
    ev: 'e-8840',
    stL: 'PASS',
    pct: 100,
  },
  {
    id: 'RET-01',
    name: 'Automated retention deletion upon purpose completion',
    domain: 'Retention & erasure',
    cite: 'DPDP §8(7) · Rule 8',
    stL: 'FAIL',
    pct: 20,
  },
  {
    id: 'RET-03',
    name: 'Purge KYC documents older than 5-year statutory mandate',
    domain: 'Retention & erasure',
    cite: 'DPDP §8(7)',
    stL: 'FAIL',
    pct: 15,
  },
  {
    id: 'SEC-01',
    name: 'Field-level AES-256 encryption on national identifiers',
    domain: 'Security safeguards',
    cite: 'DPDP §8(4) · Rule 6',
    ev: 'e-8812',
    stL: 'PASS',
    pct: 100,
  },
  {
    id: 'SEC-06',
    name: 'Least-privilege cloud storage access policy enforcement',
    domain: 'Security safeguards',
    cite: 'DPDP §8(4)',
    ev: 'e-8843',
    stL: 'PARTIAL',
    pct: 65,
  },
  {
    id: 'RTS-01',
    name: 'DSAR statutory fulfillment tracking and clock monitor',
    domain: 'Rights of principals',
    cite: 'DPDP §11 · Rule 14',
    ev: 'e-8822',
    stL: 'PARTIAL',
    pct: 70,
  },
  {
    id: 'RTS-04',
    name: 'Erasure propagation to downstream third-party processors',
    domain: 'Rights of principals',
    cite: 'DPDP §12(3)',
    stL: 'FAIL',
    pct: 30,
  },
  {
    id: 'XFR-01',
    name: 'Cross-border transfer whitelist verification',
    domain: 'Cross-border transfer',
    cite: 'DPDP §16',
    ev: 'e-8790',
    stL: 'PASS',
    pct: 100,
  },
  {
    id: 'GRV-01',
    name: 'Indian Data Protection Officer contact in consent notice',
    domain: 'Grievance redressal',
    cite: 'DPDP §8(9)',
    ev: 'e-8801',
    stL: 'PASS',
    pct: 100,
  },
  {
    id: 'BRC-01',
    name: '72-hour Data Protection Board incident alert webhook',
    domain: 'Breach ops',
    cite: 'DPDP §8(6) · Rule 11',
    ev: 'e-8835',
    stL: 'PASS',
    pct: 100,
  },
  {
    id: 'AUD-01',
    name: 'Immutable append-only ledger of compliance mutations',
    domain: 'Audit & proof',
    cite: 'DPDP §8(4) · BR-3',
    ev: 'e-8841',
    stL: 'PASS',
    pct: 100,
  },
];

export default function AssessmentPage() {
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(-1);
  const [msg, setMsg] = useState('');

  const pipelineStages = [
    { agent: 'Drishti', mark: 'D', label: 'Discovery', hi: 'डेटा खोज' },
    { agent: 'Vibhaag', mark: 'V', label: 'Classification', hi: 'वर्गीकरण' },
    { agent: 'Parikshan', mark: 'P', label: 'Assessment', hi: 'मूल्यांकन' },
    { agent: 'Sudhaar', mark: 'S', label: 'Remediation', hi: 'सुधार' },
    { agent: 'Saakshi', mark: 'Sk', label: 'Evidence', hi: 'साक्ष्य' },
  ];

  const runAssessment = () => {
    if (running) return;
    setRunning(true);
    setStage(0);
    setMsg('Drishti scanning production data stores… 12.4M rows swept');

    setTimeout(() => {
      setStage(1);
      setMsg('Vibhaag classifying 3,960 discovered data fields…');
    }, 900);

    setTimeout(() => {
      setStage(2);
      setMsg('Parikshan scoring against 43 DPDP statutory controls…');
    }, 1800);

    setTimeout(() => {
      setStage(3);
      setMsg('Sudhaar preparing typed remediation blueprint PLN-2026-08…');
    }, 2700);

    setTimeout(() => {
      setStage(4);
      setMsg('Saakshi sealing WORM evidence pack and ledger root…');
    }, 3600);

    setTimeout(() => {
      setRunning(false);
      setStage(-1);
      setMsg('Assessment completed · 32 pass, 5 partial, 6 fail · Score: 74/100');
    }, 4500);
  };

  const statusStyle = (st: 'PASS' | 'PARTIAL' | 'FAIL') => {
    if (st === 'PASS') return 'bg-[#E5FAF7] text-[#0a8d80]';
    if (st === 'PARTIAL') return 'bg-[#FBF3DF] text-[#8a6d10]';
    return 'bg-[#FCEEEC] text-[#D9534F]';
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      {/* Assessment Pipeline Card */}
      <div className="rounded-2xl bg-[#1E2A4A] p-6 text-white shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-white">Assessment pipeline</h1>
            <div className="text-xs text-[#a9b3ce]">
              Parikshan scores against control library v25.11.2 · agents propose, you approve
            </div>
          </div>
          <button
            onClick={runAssessment}
            disabled={running}
            className="rounded-lg bg-[#0FB5A5] px-4 py-2 text-xs font-bold text-white shadow transition-all hover:bg-[#0a8d80] disabled:opacity-50"
          >
            {running ? 'Assessment running…' : '▶ Run full assessment'}
          </button>
        </div>

        {/* Pipeline Agents */}
        <div className="grid grid-cols-5 gap-2 text-center">
          {pipelineStages.map((p, idx) => {
            const isCurrent = stage === idx;
            const isDone = stage > idx;

            return (
              <div key={p.agent} className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full font-heading text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#0FB5A5] text-[#04322d] ring-4 ring-[#0FB5A5]/40 animate-pulse'
                      : isDone
                      ? 'bg-[#0FB5A5] text-[#04322d]'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {p.mark}
                </div>
                <div className="mt-2 text-xs font-semibold text-white">{p.agent}</div>
                <div className="text-[10px] text-[#8a97b8]">
                  {p.label} · {p.hi}
                </div>
              </div>
            );
          })}
        </div>

        {msg && (
          <div className="mt-4 rounded-lg bg-white/5 py-2 text-center text-xs font-medium text-[#0FB5A5]">
            ● {msg}
          </div>
        )}
      </div>

      {/* Summary + Exposure Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Posture Distribution */}
        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a909b]">
            Control posture (showing 12 of 43)
          </div>
          <div className="my-3 flex h-3 overflow-hidden rounded-full">
            <div style={{ flex: 32 }} className="bg-[#0FB5A5]" title="32 Pass" />
            <div style={{ flex: 5 }} className="bg-[#E0A82E]" title="5 Partial" />
            <div style={{ flex: 6 }} className="bg-[#D9534F]" title="6 Fail" />
          </div>
          <div className="flex gap-4 text-xs">
            <span>
              <b className="font-heading text-base text-[#0a8d80]">32</b> pass
            </span>
            <span>
              <b className="font-heading text-base text-[#8a6d10]">5</b> partial
            </span>
            <span>
              <b className="font-heading text-base text-[#D9534F]">6</b> fail
            </span>
          </div>
        </div>

        {/* SDF Self-Assessment */}
        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a909b]">
            SDF self-assessment
          </div>
          <div className="mt-1 font-heading text-2xl font-bold text-[#1E2A4A]">Not designated</div>
          <p className="mt-1 text-xs text-[#8a909b]">
            Below SDF thresholds on volume + sensitivity. Re-evaluated each scan.
          </p>
        </div>

        {/* Penalty Exposure */}
        <div className="rounded-2xl border border-[#f0cbc9] bg-[#FCEEEC] p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#D9534F]">
            Penalty exposure estimate
          </div>
          <div className="mt-1 font-heading text-2xl font-bold text-[#D9534F]">₹18–46 cr</div>
          <p className="mt-1 text-[11px] text-[#a03734]">
            weighted across open gaps · max ₹250 cr / contravention · illustrative, not legal advice
          </p>
        </div>
      </div>

      {/* Control Table */}
      <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-sm">
        <div className="grid grid-cols-[90px_1fr_150px_120px_90px_80px] gap-3 border-b border-[#e4e8ee] bg-[#F4F6F8] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a909b]">
          <span>Control</span>
          <span>Requirement</span>
          <span>Domain</span>
          <span>Citation</span>
          <span>Evidence</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-[#eef1f5]">
          {SAMPLE_CONTROLS.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[90px_1fr_150px_120px_90px_80px] items-center gap-3 px-5 py-3.5 hover:bg-[#F4F6F8]/60 transition-colors"
            >
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">{c.id}</span>
              <div>
                <div className="text-xs font-medium text-[#2F3542]">{c.name}</div>
                <div className="mt-1.5 h-1.5 max-w-[160px] overflow-hidden rounded-full bg-[#F4F6F8]">
                  <div
                    style={{
                      width: `${c.pct}%`,
                      backgroundColor:
                        c.stL === 'PASS' ? '#0FB5A5' : c.stL === 'PARTIAL' ? '#E0A82E' : '#D9534F',
                    }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
              <span className="text-xs text-[#5b6270]">{c.domain}</span>
              <span className="font-mono text-xs text-[#8a909b]">{c.cite}</span>
              <div>
                {c.ev ? (
                  <span className="rounded bg-[#FBF6E7] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#8a6d10]">
                    ✦ {c.ev}
                  </span>
                ) : (
                  <span className="text-xs text-[#8a909b]">—</span>
                )}
              </div>
              <div>
                <span
                  className={`rounded px-2 py-0.5 text-[9px] font-bold ${statusStyle(c.stL)}`}
                >
                  {c.stL}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
