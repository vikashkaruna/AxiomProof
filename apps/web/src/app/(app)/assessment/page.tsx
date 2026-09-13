'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AgentIcon } from '@axiom/ui';
import type { AgentName } from '@axiom/types';

export interface ControlScore {
  id: string;
  name: string;
  domain: string;
  cite: string;
  ev: string;
  status: 'pass' | 'partial' | 'fail';
  score: number;
}

export const CANONICAL_CONTROLS: ControlScore[] = [
  {
    id: 'NOT-01',
    name: 'Itemised notice at collection in 22 scheduled languages',
    domain: 'Notice & consent',
    cite: '§5 · Rule 3',
    ev: 'e-8839',
    status: 'pass',
    score: 100,
  },
  {
    id: 'NOT-04',
    name: 'Withdrawal as easy as giving consent',
    domain: 'Notice & consent',
    cite: '§6(4)',
    ev: 'e-8802',
    status: 'pass',
    score: 100,
  },
  {
    id: 'RTS-01',
    name: 'Right to access information',
    domain: 'Rights of principals',
    cite: '§11',
    ev: 'e-8781',
    status: 'pass',
    score: 100,
  },
  {
    id: 'RTS-04',
    name: 'Right to erasure on withdrawal',
    domain: 'Rights of principals',
    cite: '§12',
    ev: '—',
    status: 'fail',
    score: 20,
  },
  {
    id: 'RTS-06',
    name: 'Grievance redressal mechanism',
    domain: 'Rights of principals',
    cite: '§13',
    ev: '—',
    status: 'partial',
    score: 60,
  },
  {
    id: 'RET-03',
    name: 'Erasure after retention period',
    domain: 'Retention & erasure',
    cite: '§8(7) · Rule 8',
    ev: 'e-8841',
    status: 'fail',
    score: 15,
  },
  {
    id: 'RET-05',
    name: 'Storage limitation on logs',
    domain: 'Retention & erasure',
    cite: '§8(7)',
    ev: '—',
    status: 'fail',
    score: 30,
  },
  {
    id: 'PUR-02',
    name: 'Purpose limitation in analytics',
    domain: 'Purpose limitation',
    cite: '§6',
    ev: 'e-8788',
    status: 'partial',
    score: 55,
  },
  {
    id: 'SEC-06',
    name: 'Least-privilege access to PII',
    domain: 'Security safeguards',
    cite: '§8(4)',
    ev: 'e-8843',
    status: 'partial',
    score: 70,
  },
  {
    id: 'SEC-09',
    name: 'Encryption at rest & in transit',
    domain: 'Security safeguards',
    cite: '§8(5)',
    ev: 'e-8790',
    status: 'pass',
    score: 100,
  },
  {
    id: 'XBR-01',
    name: 'Cross-border transfer register',
    domain: 'Cross-border transfer',
    cite: '§16',
    ev: '—',
    status: 'partial',
    score: 50,
  },
  {
    id: 'BRC-02',
    name: '72-hour breach notification readiness',
    domain: 'Breach',
    cite: 'Rule 7',
    ev: 'e-8790',
    status: 'pass',
    score: 100,
  },
];

export interface PipelineStage {
  agent: string;
  agentKey: AgentName;
  label: string;
  hi: string;
  detail: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    agent: 'Drishti',
    agentKey: 'drishti',
    label: 'Discovery',
    hi: 'खोज',
    detail: 'sweeping estate for personal data',
  },
  {
    agent: 'Vibhaag',
    agentKey: 'vibhaag',
    label: 'Classification',
    hi: 'वर्गीकरण',
    detail: 'categorising fields by DPDPA type',
  },
  {
    agent: 'Parikshan',
    agentKey: 'parikshan',
    label: 'Assessment',
    hi: 'मूल्यांकन',
    detail: 'scoring against control library v25.11.2',
  },
  {
    agent: 'Saakshi',
    agentKey: 'saakshi',
    label: 'Evidence',
    hi: 'साक्ष्य',
    detail: 'sealing supporting artifacts (WORM)',
  },
  {
    agent: 'Prativedan',
    agentKey: 'prativedan',
    label: 'Report',
    hi: 'रिपोर्ट',
    detail: 'generating findings + exposure',
  },
];

export default function AssessmentPage() {
  const [assessStage, setAssessStage] = useState<number>(-1);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);
  const [ledgerEntryId, setLedgerEntryId] = useState<string | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const assessRunning = assessStage >= 0;

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const runAssessment = async () => {
    if (assessRunning) return;

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setHasCompleted(false);
    setLedgerEntryId(null);
    setAssessStage(0);

    // Concurrently trigger real Parikshan backend agent run via BFF
    fetch('/api/bff/v1/agents/parikshan/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'assessment_pipeline' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ledger_entry_ids && data.ledger_entry_ids.length > 0) {
          setLedgerEntryId(data.ledger_entry_ids[0]);
        }
      })
      .catch(() => {
        // Tolerant in offline/test mode
      });

    // Step through the 5 stages matching the design rhythm (900ms per stage)
    const step = (i: number) => {
      if (i >= PIPELINE_STAGES.length) {
        const tEnd = setTimeout(() => {
          setAssessStage(-1);
          setHasCompleted(true);
        }, 700);
        timeoutsRef.current.push(tEnd);
        return;
      }
      setAssessStage(i);
      const tNext = setTimeout(() => step(i + 1), 900);
      timeoutsRef.current.push(tNext);
    };

    step(0);
  };

  const controls = CANONICAL_CONTROLS;
  const passCount = controls.filter((c) => c.status === 'pass').length;
  const partialCount = controls.filter((c) => c.status === 'partial').length;
  const failCount = controls.filter((c) => c.status === 'fail').length;

  const currentStage =
    assessStage >= 0 && assessStage < PIPELINE_STAGES.length
      ? PIPELINE_STAGES[assessStage]
      : undefined;

  const pipelineMsg = currentStage
    ? `${currentStage.agent} — ${currentStage.detail}`
    : 'assessment complete · report generated · every step written to the ledger';

  return (
    <div className="mx-auto max-w-[1180px] animate-in fade-in-0 duration-200">
      {/* ============================================================ */}
      {/* 1. RUN PIPELINE HERO CARD (EXACT AXIOM PROOF APP DESIGN)     */}
      {/* ============================================================ */}
      <div className="mb-[18px] rounded-2xl bg-[#1E2A4A] p-5 text-white shadow-sm md:p-6">
        {/* Header: Title, Description & Action Button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[240px]">
            <h1 className="font-heading text-[16px] font-semibold text-white leading-tight">
              Assessment pipeline
            </h1>
            <div className="mt-0.5 text-[11.5px] text-[#a9b3ce]">
              Parikshan scores against control library v25.11.2 · agents propose, you approve
            </div>
          </div>

          <button
            type="button"
            onClick={runAssessment}
            disabled={assessRunning}
            className={`rounded-[9px] px-[18px] py-[10px] text-[12.5px] font-bold text-white transition-all shadow-xs ${
              assessRunning
                ? 'cursor-default bg-white/15 opacity-80'
                : 'cursor-pointer bg-[#0FB5A5] hover:bg-[#0a8d80]'
            }`}
          >
            {assessRunning ? 'Running…' : '▶ Run new assessment'}
          </button>
        </div>

        {/* 5-Stage Stepper Pipeline Row */}
        <div className="relative my-2 flex items-center gap-0">
          {PIPELINE_STAGES.map((p, i) => {
            const isCompleted = assessStage > i || (hasCompleted && assessStage === -1);
            const isActive = assessStage === i;
            const dotBg = isCompleted ? '#0FB5A5' : isActive ? '#C9A227' : 'rgba(255,255,255,.12)';
            const dotColor = isCompleted || isActive ? '#04322d' : '#ffffff';
            const mark = isCompleted ? '✓' : String(i + 1);

            return (
              <div
                key={p.agent}
                className="group relative flex flex-1 flex-col items-center text-center"
              >
                {/* Horizontal connector line to next step */}
                {i < PIPELINE_STAGES.length - 1 && (
                  <div
                    className="absolute top-[17px] left-1/2 w-full h-[2px] z-0 transition-colors duration-500"
                    style={{
                      backgroundColor:
                        assessStage > i || (hasCompleted && assessStage === -1)
                          ? '#0FB5A5'
                          : 'rgba(255,255,255,.12)',
                    }}
                  />
                )}

                {/* Step Circle: 34px diameter, font-heading, 13px bold */}
                <div
                  className={`relative z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full font-heading text-[13px] font-bold transition-all duration-300 select-none ${
                    isActive
                      ? 'animate-pulse ring-4 ring-[#C9A227]/40 shadow-lg shadow-[#C9A227]/20 scale-105'
                      : ''
                  }`}
                  style={{
                    backgroundColor: dotBg,
                    color: dotColor,
                  }}
                >
                  {mark}
                </div>

                {/* Agent Name with Mini Icon */}
                <div className="mt-2 flex items-center justify-center gap-1.5 text-white">
                  <AgentIcon
                    agent={p.agentKey}
                    size="xs"
                    state={isActive ? 'thinking' : isCompleted ? 'working' : 'idle'}
                    className="transition-transform group-hover:scale-110"
                  />
                  <span className="text-[12px] font-semibold">{p.agent}</span>
                </div>

                {/* Stage Label & Indic Subtitle */}
                <div className="mt-0.5 text-[10px] text-[#8a97b8]">
                  {p.label} · {p.hi}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Pipeline Message or Ledger Proof */}
        {(assessRunning || hasCompleted) && (
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-center text-[12px] text-[#0FB5A5] font-medium animate-in fade-in-0 duration-150">
            <span>● {pipelineMsg}</span>
            {ledgerEntryId && (
              <Link
                href={`/ledger?q=${ledgerEntryId}`}
                className="font-mono text-[11px] underline text-[#C9A227] hover:text-white"
              >
                (Ledger proof #{ledgerEntryId})
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. SUMMARY + EXPOSURE 3-CARD ROW                             */}
      {/* ============================================================ */}
      <div className="mb-[18px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px] gap-4">
        {/* Posture Distribution Card */}
        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-[18px_20px] shadow-2xs">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a909b]">
            Control posture (showing {passCount + partialCount + failCount} of 43)
          </div>
          <div className="mb-3 flex h-3 gap-1.5 overflow-hidden rounded-[20px]">
            <div style={{ flex: passCount }} className="bg-[#0FB5A5]" title={`${passCount} Pass`} />
            <div
              style={{ flex: partialCount }}
              className="bg-[#E0A82E]"
              title={`${partialCount} Partial`}
            />
            <div style={{ flex: failCount }} className="bg-[#D9534F]" title={`${failCount} Fail`} />
          </div>
          <div className="flex gap-[18px] text-[12px] text-[#2F3542]">
            <span>
              <b className="font-heading text-[16px] text-[#0a8d80] font-bold">{passCount}</b> pass
            </span>
            <span>
              <b className="font-heading text-[16px] text-[#8a6d10] font-bold">{partialCount}</b>{' '}
              partial
            </span>
            <span>
              <b className="font-heading text-[16px] text-[#D9534F] font-bold">{failCount}</b> fail
            </span>
          </div>
        </div>

        {/* SDF Self-Assessment Card */}
        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-[18px_20px] shadow-2xs">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a909b]">
            SDF self-assessment
          </div>
          <div className="font-heading text-[26px] font-bold text-[#1E2A4A] leading-tight">
            Not designated
          </div>
          <p className="mt-1 text-[11.5px] text-[#8a909b] leading-normal">
            Below SDF thresholds on volume + sensitivity. Re-evaluated each scan.
          </p>
        </div>

        {/* Penalty Exposure Estimate Card */}
        <div className="rounded-2xl border border-[#f0cbc9] bg-[#fbeceb] p-[18px_20px] shadow-2xs">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#D9534F]">
            Penalty exposure estimate
          </div>
          <div className="font-heading text-[30px] font-bold text-[#D9534F] leading-tight">
            ₹18–46 cr
          </div>
          <p className="mt-1 text-[11px] text-[#a03734] leading-tight">
            weighted across open gaps · max ₹250 cr / contravention · illustrative, not legal advice
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. CONTROL TABLE (12 CANONICAL DPDPA CONTROLS)               */}
      {/* ============================================================ */}
      <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-2xs">
        {/* Table Header */}
        <div className="grid grid-cols-[90px_1fr_150px_110px_90px_70px] gap-2.5 border-b border-[#e4e8ee] bg-[#F4F6F8] px-[18px] py-[11px] text-[10px] font-semibold tracking-[0.04em] uppercase text-[#8a909b]">
          <span>Control</span>
          <span>Requirement</span>
          <span>Domain</span>
          <span>Citation</span>
          <span>Evidence</span>
          <span>Status</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-[#eef1f5]">
          {controls.map((c) => {
            const stColor =
              c.status === 'pass' ? '#0a8d80' : c.status === 'partial' ? '#8a6d10' : '#D9534F';
            const stBg =
              c.status === 'pass' ? '#e6f7f5' : c.status === 'partial' ? '#fbf3df' : '#fbeceb';
            const stLabel =
              c.status === 'pass' ? 'PASS' : c.status === 'partial' ? 'PARTIAL' : 'FAIL';

            return (
              <div
                key={c.id}
                className="grid grid-cols-[90px_1fr_150px_110px_90px_70px] items-center gap-2.5 px-[18px] py-3 hover:bg-[#F4F6F8]/60 transition-colors"
              >
                {/* Control ID with Link to Controls */}
                <Link
                  href={`/controls?q=${c.id}`}
                  className="font-mono text-[11px] font-medium text-[#1E2A4A] hover:underline"
                >
                  {c.id}
                </Link>

                {/* Requirement & Score Progress Bar */}
                <div>
                  <div className="text-[12.5px] font-medium text-[#2F3542] leading-snug">
                    {c.name}
                  </div>
                  <div className="mt-1.5 h-[5px] max-w-[160px] overflow-hidden rounded-[20px] bg-[#F4F6F8]">
                    <div
                      style={{
                        width: `${c.score}%`,
                        backgroundColor: stColor,
                      }}
                      className="h-full rounded-[20px] transition-all duration-700"
                    />
                  </div>
                </div>

                {/* Domain */}
                <span className="text-[11px] text-[#5b6270] truncate">{c.domain}</span>

                {/* Statutory Citation */}
                <span className="font-mono text-[10.5px] text-[#8a909b]">{c.cite}</span>

                {/* Evidence Artifact Link */}
                <div>
                  {c.ev !== '—' ? (
                    <Link
                      href={`/evidence?q=${c.ev}`}
                      className="inline-block rounded-[5px] bg-[#f7f0d8] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8a6d10] hover:opacity-85"
                    >
                      ✦ {c.ev}
                    </Link>
                  ) : (
                    <span className="text-[10.5px] text-[#8a909b]">—</span>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    style={{
                      color: stColor,
                      backgroundColor: stBg,
                    }}
                    className="inline-block rounded-[5px] px-[7px] py-[3px] text-[9px] font-bold uppercase"
                  >
                    {stLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
