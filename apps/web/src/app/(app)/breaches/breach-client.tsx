'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AgentIcon } from '@axiom/ui';

export interface BreachItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  detectedAt: string;
  dueAt: string;
  affectedCount: number;
  dataCategories: string[];
}

export function BreachClient({ initialBreach }: { initialBreach?: BreachItem | null }) {
  // Live 72-hour digital countdown clock (e.g. 54:18:22)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(54 * 3600 + 18 * 60 + 22);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  const clockStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const pctStr = `${Math.min(100, Math.round((secondsRemaining / (72 * 3600)) * 100))}%`;

  // Auto-dismissing toast state (replaces blocking alert())
  const [toast, setToast] = useState<{ message: string; kind: 'info' | 'success' } | null>(null);

  const showToast = useCallback((message: string, kind: 'info' | 'success' = 'info') => {
    setToast({ message, kind });
    // Auto-dismiss: ~80ms per character, min 3s, max 8s
    const duration = Math.min(8000, Math.max(3000, message.length * 80));
    setTimeout(() => setToast(null), duration);
  }, []);

  const timelineSteps = [
    {
      label: 'Incident detected & triaged',
      t: 'T+0h 12m',
      detail:
        'Anomalous export attempt flagged by automated security monitoring; correlation cr-118 attached.',
      dot: '#0FB5A5',
      titleColor: '#1E2A4A',
    },
    {
      label: 'Containment verified',
      t: 'T+1h 45m',
      detail:
        'Network isolation gate triggered; service credentials rotated via AWS Secrets Manager.',
      dot: '#0FB5A5',
      titleColor: '#1E2A4A',
    },
    {
      label: 'Forensic log capture (Saakshi WORM)',
      t: 'T+3h 20m',
      detail:
        'VPC flow logs and database query extracts sealed into S3 compliance mode bucket (e-8790).',
      dot: '#0FB5A5',
      titleColor: '#1E2A4A',
    },
    {
      label: 'Affected cohort identified',
      t: 'T+8h 10m',
      detail: '~2,100 customer records scoped; PAN and mobile contact fields confirmed exposed.',
      dot: '#0FB5A5',
      titleColor: '#1E2A4A',
    },
    {
      label: 'DPB statutory notification drafted',
      t: 'T+16h 00m',
      detail:
        'Form 1 (Section 8(6) & Rule 7) prepared with forensic hashes, mitigation steps, and DPO signature.',
      dot: '#C9A227',
      titleColor: '#C9A227',
    },
    {
      label: 'Principal notification dispatched',
      t: 'Pending',
      detail: 'Multilingual communications queued for dispatch upon Board acknowledgment.',
      dot: '#e2e8f0',
      titleColor: '#8a909b',
      notLast: false,
    },
  ];

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 animate-in fade-in-0 duration-200">
      {/* Auto-dismissing Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] max-w-sm rounded-xl border p-4 shadow-lg animate-in slide-in-from-top-2 fade-in-0 duration-300 ${
            toast.kind === 'success'
              ? 'border-teal-300 bg-[#E5FAF7] text-[#04322d]'
              : 'border-indigo-200 bg-[#EEF0F7] text-[#1E2A4A]'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-sm">{toast.kind === 'success' ? '✓' : 'ℹ'}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs font-bold opacity-50 hover:opacity-100 transition-opacity shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* 1. HERO BANNER                                               */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E2A4A] via-[#1E2A4A] to-[#243356] p-6 md:p-7 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-[#0FB5A5] px-2 py-0.5 text-[9px] font-bold text-[#04322d] uppercase tracking-wider">
                P3 · M3.9
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#0FB5A5]">
                <span>Agent ·</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="sanket" size="xs" variant="on-dark" state="working" />
                  <span>Sanket</span>
                </span>
                <span className="text-[#0FB5A5]/70">+</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="incident" size="xs" variant="on-dark" state="idle" />
                  <span>Incident Ops</span>
                </span>
              </div>
              <span className="text-xs text-[#8a97b8]">Autonomy L1</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-[#C9A227]">
                DPDPA §8(6) & Rule 7
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-heading text-2xl md:text-[26px] font-bold text-white tracking-tight">
                Breach & Incident Ops
              </h1>
              <span className="font-heading text-lg text-[#0FB5A5] font-normal">
                उल्लंघन संचालन
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#c7cfe0]">
              72-hour DPB statutory notification clock, principal notification workflow, forensic
              evidence capture and CERT-In / DPB reporting templates.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                showToast(
                  'Simulated tabletop incident exercise initiated. Sanket agent is coordinating containment drills.',
                  'success',
                )
              }
              className="rounded-[9px] bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 transition-all"
            >
              Simulate tabletop drill
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. EXACT CARDS: ACTIVE INCIDENTS & PLAYBOOK                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs">
          <h2 className="font-heading text-sm font-semibold text-[#1E2A4A] mb-3">
            Active incidents
          </h2>
          <div className="divide-y divide-[#eef1f5]">
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#0FB5A5]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">
                INC-0042 (Tabletop drill)
              </span>
              <span className="font-mono text-xs font-semibold text-[#0FB5A5]">Contained</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#D9534F]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">72h clock</span>
              <span className="font-mono text-xs font-semibold text-[#D9534F]">
                {hours}h {minutes}m left
              </span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#1E2A4A]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Principals affected</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">~2,100</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs">
          <h2 className="font-heading text-sm font-semibold text-[#1E2A4A] mb-3">Playbook</h2>
          <div className="divide-y divide-[#eef1f5]">
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#0FB5A5]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">CERT-In 6h notice</span>
              <span className="font-mono text-xs font-semibold text-[#0FB5A5]">pre-filled</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#0FB5A5]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">DPB 72h notice</span>
              <span className="font-mono text-xs font-semibold text-[#0FB5A5]">drafted</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#C9A227]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Principal notice</span>
              <span className="font-mono text-xs font-semibold text-[#C9A227]">queued</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. 2-COLUMN INCIDENT OPS: COUNTDOWN + TIMELINE               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
        {/* Left Column: Digital Clock & Impact Summary */}
        <div className="space-y-4">
          {/* Digital 72-hour Countdown Box */}
          <div className="rounded-2xl bg-[#D9534F] p-5 text-white shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              72-hour DPB clock · INC-0042
            </div>
            <div className="font-mono text-4xl font-medium tracking-tight mt-2.5">{clockStr}</div>
            <div className="text-[11.5px] opacity-90 mt-1.5">
              remaining to notify the Data Protection Board
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/25 mt-4 overflow-hidden">
              <div
                style={{ width: pctStr }}
                className="h-full rounded-full bg-white transition-all duration-1000"
              />
            </div>
          </div>

          {/* Impact Card */}
          <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a909b]">
              Impact Assessment
            </div>
            <div className="divide-y divide-[#eef1f5] text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Affected principals</span>
                <span className="font-bold text-[#1E2A4A]">~2,100</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Data exposed</span>
                <span className="font-bold text-[#D9534F]">PAN · contact</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-[#0FB5A5]">Contained</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Forensic logs</span>
                <span className="font-bold text-[#0FB5A5]">Warm · answerable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 6-Stage Incident Timeline */}
        <div className="rounded-2xl border border-[#e4e8ee] bg-white overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between p-5 border-b border-[#e4e8ee] bg-[#F4F6F8]">
            <h3 className="font-heading text-base font-semibold text-[#1E2A4A]">
              Incident timeline & 72h statutory workflow
            </h3>
            <button
              type="button"
              onClick={() =>
                showToast(
                  'Opening statutory DPB notification for review. Form 1 (Section 8(6) & Rule 7) is ready for DPO sign-off.',
                  'info',
                )
              }
              className="rounded-lg bg-[#1E2A4A] hover:bg-[#283863] text-white text-xs font-semibold px-3 py-1.5 shadow-2xs transition-colors"
            >
              Review DPB notification →
            </button>
          </div>

          <div className="p-6 space-y-4">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    style={{ backgroundColor: step.dot }}
                    className="h-3 w-3 rounded-full shrink-0 ring-4 ring-white shadow-2xs"
                  />
                  {step.notLast !== false && idx < timelineSteps.length - 1 && (
                    <span className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[22px]" />
                  )}
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: step.titleColor }} className="text-xs font-bold">
                      {step.label}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{step.t}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
