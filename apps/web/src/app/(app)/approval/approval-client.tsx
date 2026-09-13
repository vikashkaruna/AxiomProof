'use client';

import React, { useState } from 'react';
import { AgentIcon } from '@axiom/ui';

export interface ActionItem {
  id: string;
  title: string;
  type: string;
  risk: 'LOW' | 'MED' | 'HIGH';
  target: string;
  blast: number;
  why: string;
  citation: string;
  riskReason: string;
  dryAge: string;
  dryHash: string;
  rollbackRef: string;
  rollback: string;
  blastCards: Array<{ v: string; l: string }>;
  diff: Array<{ sign: string; text: string; style: string }>;
}

export type ActionStatus =
  'pending' | 'approved' | 'executing' | 'executed' | 'verified' | 'rejected' | 'deferred';

export function ApprovalConsoleClient({ initialActions }: { initialActions: ActionItem[] }) {
  const actionsData = initialActions.length > 0 ? initialActions : [];
  const firstId = actionsData[0]?.id || 'ACT-01';

  const [selected, setSelected] = useState<Record<string, boolean>>({ [firstId]: true });
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [selId, setSelId] = useState<string>(firstId);

  const selectedAction = actionsData.find((a) => a.id === selId) || actionsData[0];

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCount = selectedIds.length;
  const allSelected = actionsData.length > 0 && actionsData.every((a) => selected[a.id]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      for (const a of actionsData) {
        if ((statuses[a.id] || 'pending') === 'pending') {
          next[a.id] = true;
        }
      }
      setSelected(next);
    }
  };

  const setActionStatus = (ids: string[], st: ActionStatus) => {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = st;
      return next;
    });
  };

  const runExecution = (ids: string[]) => {
    setActionStatus(ids, 'approved');
    setTimeout(() => setActionStatus(ids, 'executing'), 450);
    setTimeout(() => setActionStatus(ids, 'executed'), 1600);
    setTimeout(() => {
      setActionStatus(ids, 'verified');
      setSelected({});
    }, 2700);
  };

  const approveSelected = () => {
    if (selectedIds.length) runExecution(selectedIds);
  };

  const approveAll = () => {
    const ids = actionsData
      .filter((a) => (statuses[a.id] || 'pending') === 'pending')
      .map((a) => a.id);
    if (ids.length) runExecution(ids);
  };

  const rejectSelected = () => {
    if (selectedIds.length) {
      setActionStatus(selectedIds, 'rejected');
      setSelected({});
    }
  };

  const deferSelected = () => {
    if (selectedIds.length) {
      setActionStatus(selectedIds, 'deferred');
      setSelected({});
    }
  };

  const riskBadgeStyle = (r: 'LOW' | 'MED' | 'HIGH') => {
    if (r === 'HIGH') return 'bg-[#FCEEEC] text-[#D9534F]';
    if (r === 'MED') return 'bg-[#FBF3DF] text-[#8a6d10]';
    return 'bg-[#E5FAF7] text-[#0a8d80]';
  };

  const statusBadge = (st: ActionStatus) => {
    switch (st) {
      case 'approved':
        return (
          <span className="bg-[#E5FAF7] text-[#0a8d80] px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            APPROVED
          </span>
        );
      case 'executing':
        return (
          <span className="bg-[#FBF3DF] text-[#8a6d10] px-1.5 py-0.5 rounded text-[8.5px] font-bold animate-pulse">
            EXECUTING…
          </span>
        );
      case 'executed':
        return (
          <span className="bg-[#1E2A4A] text-white px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            EXECUTED
          </span>
        );
      case 'verified':
        return (
          <span className="bg-[#0FB5A5] text-white px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            ✓ VERIFIED
          </span>
        );
      case 'rejected':
        return (
          <span className="bg-[#FCEEEC] text-[#D9534F] px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            REJECTED
          </span>
        );
      case 'deferred':
        return (
          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            DEFERRED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-4 animate-in fade-in-0 duration-200">
      {/* ============================================================ */}
      {/* 1. HERO BANNER                                               */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E2A4A] via-[#1E2A4A] to-[#243356] p-6 md:p-7 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="rounded bg-[#0FB5A5] px-2 py-0.5 text-[9px] font-bold text-[#04322d] uppercase tracking-wider">
                P3 · M3.2
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#0FB5A5]">
                <span>Agent ·</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="sudhaar" size="xs" variant="on-dark" state="working" />
                  <span>Sudhaar</span>
                </span>
                <span className="text-[#0FB5A5]/70">+</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="karya" size="xs" variant="on-dark" state="idle" />
                  <span>Karya</span>
                </span>
              </div>
              <span className="text-xs text-[#8a97b8]">Human Gate (ADR-1)</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-[#C9A227]">
                Signed Scope-Bound Tokens
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-heading text-2xl md:text-[26px] font-bold text-white tracking-tight">
                Approval Console
              </h1>
              <span className="font-heading text-lg text-[#0FB5A5] font-normal">अनुमोदन कंसोल</span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#c7cfe0]">
              Every mutating remediation action requires an issued human approval token. Actions are
              pre-validated via dry-run and carry deterministic rollbacks before reaching this gate.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={approveSelected}
              disabled={selectedCount === 0}
              className={`rounded-[9px] px-4 py-2 text-xs font-bold text-white transition-all shadow-xs ${
                selectedCount > 0
                  ? 'bg-[#0FB5A5] hover:bg-[#0da294] cursor-pointer'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              Approve selected ({selectedCount})
            </button>
            <button
              type="button"
              onClick={approveAll}
              className="rounded-[9px] bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition-all"
            >
              Approve all ({actionsData.length})
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN 2-COLUMN CONSOLE                                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 items-start">
        {/* Left Column: Actions List */}
        <div className="rounded-2xl border border-[#e4e8ee] bg-white overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e4e8ee] bg-[#F4F6F8]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-heading text-xs font-semibold text-[#1E2A4A] uppercase tracking-wider">
                Pending Actions ({actionsData.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={rejectSelected}
                disabled={selectedCount === 0}
                className="text-[11px] font-semibold text-[#D9534F] hover:underline disabled:opacity-40"
              >
                Reject
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={deferSelected}
                disabled={selectedCount === 0}
                className="text-[11px] font-semibold text-slate-500 hover:underline disabled:opacity-40"
              >
                Defer
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#eef1f5]">
            {actionsData.map((act) => {
              const st = statuses[act.id] || 'pending';
              const isSel = selected[act.id];
              const isCurrent = selId === act.id;

              return (
                <div
                  key={act.id}
                  onClick={() => setSelId(act.id)}
                  className={`p-4 transition-colors cursor-pointer flex items-start gap-3 ${
                    isCurrent ? 'bg-[#F4F6F8]' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!isSel}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelected((prev) => ({ ...prev, [act.id]: !prev[act.id] }));
                    }}
                    className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[11px] font-bold text-[#1E2A4A]">
                        {act.id}
                      </code>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${riskBadgeStyle(act.risk)}`}
                      >
                        {act.risk}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                        {act.type}
                      </span>
                      {statusBadge(st)}
                    </div>

                    <h3 className="mt-1 text-xs font-semibold text-[#2F3542] line-clamp-1">
                      {act.title}
                    </h3>

                    <div className="mt-1 flex items-center gap-3 text-[11px] text-[#8a909b]">
                      <span>Target: {act.target}</span>
                      <span>·</span>
                      <span>Blast: {act.blast.toLocaleString()}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px]">Dry: {act.dryAge}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Action Inspector */}
        {selectedAction && (
          <div className="sticky top-4 space-y-4">
            <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs font-bold text-[#1E2A4A]">
                      {selectedAction.id}
                    </code>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${riskBadgeStyle(selectedAction.risk)}`}
                    >
                      {selectedAction.risk} RISK
                    </span>
                  </div>
                  <h2 className="mt-1 text-sm font-bold text-[#1E2A4A]">{selectedAction.title}</h2>
                </div>
              </div>

              {/* Statutory Citation & Justification */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Statutory Citation
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#1E2A4A]">
                  {selectedAction.citation}
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{selectedAction.why}</p>
              </div>

              {/* Blast Radius Metrics */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Simulated Blast Radius
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {selectedAction.blastCards.map((b, bIdx) => (
                    <div key={bIdx} className="rounded-lg bg-[#F4F6F8] p-2 text-center">
                      <div className="font-mono text-xs font-bold text-[#1E2A4A]">{b.v}</div>
                      <div className="text-[10px] text-[#8a909b]">{b.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deterministic Rollback Definition */}
              <div className="rounded-xl border border-teal-200 bg-[#E5FAF7] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[#0a6b61] uppercase tracking-wider">
                    Validated Rollback Plan
                  </span>
                  <code className="font-mono text-[10px] text-[#0a6b61]">
                    {selectedAction.rollbackRef}
                  </code>
                </div>
                <p className="mt-1 text-[11px] text-[#04322d] leading-normal">
                  {selectedAction.rollback}
                </p>
              </div>

              {/* Dry-Run Simulated State Diff */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Dry-Run Execution Diff
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    H:{selectedAction.dryHash}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 font-mono text-[10.5px] overflow-hidden">
                  {selectedAction.diff.map((d, dIdx) => (
                    <div key={dIdx} className={`px-2.5 py-1.5 flex items-start gap-1.5 ${d.style}`}>
                      <span className="font-bold shrink-0">{d.sign}</span>
                      <span className="break-all">{d.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Decision Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => runExecution([selectedAction.id])}
                  className="flex-1 rounded-[9px] bg-[#0FB5A5] hover:bg-[#0da294] py-2 text-xs font-bold text-white transition-all shadow-xs"
                >
                  Approve Action
                </button>
                <button
                  type="button"
                  onClick={() => setActionStatus([selectedAction.id], 'rejected')}
                  className="rounded-[9px] border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-bold text-[#D9534F] transition-all"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
