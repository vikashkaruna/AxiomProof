'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AgentName } from '@axiom/types';
import { AgentIcon, type AgentIconState, Badge } from '@axiom/ui';
import { agentAccents } from '@axiom/design-tokens';

export interface AgentActionMeta {
  name: AgentName;
  persona: string;
  indic: string;
  autonomy: string;
  phase: string;
  description: string;
  statutoryBoundary: string;
  modulePath: string;
  moduleLabel: string;
  actionLabel: string;
  isGated?: boolean;
}

export const ALL_AGENTS: AgentActionMeta[] = [
  {
    name: 'drishti',
    persona: 'Discovery',
    indic: 'दृष्टि · Data Discovery',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 1 · DPDPA §16',
    description: 'Scans systems, databases, and buckets for personal data, classifying data flows and validating Indian data residency.',
    statutoryBoundary: 'Strict domestic residency (ap-south-1). Automatically flags and alerts on non-Indian regions.',
    modulePath: '/discovery',
    moduleLabel: 'Data Discovery',
    actionLabel: 'Run Discovery Scan',
  },
  {
    name: 'vibhaag',
    persona: 'Classification',
    indic: 'विभाग · Classification',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 1 · DPDPA §4-10',
    description: 'Categorizes personal data fields across 9 statutory categories (Aadhaar, PAN, health, children) and assesses sensitivity.',
    statutoryBoundary: 'Applies Indian DPDPA classification patterns and prepares data mapping for RoPA documentation.',
    modulePath: '/classification',
    moduleLabel: 'Data Classification',
    actionLabel: 'Run Classification',
  },
  {
    name: 'parikshan',
    persona: 'Assessment',
    indic: 'परीक्षण · Assessment',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 0 · 46 Controls',
    description: 'Evaluates posture against all 46 versioned statutory DPDPA controls and calculates exposure penalties up to ₹250 cr.',
    statutoryBoundary: 'Deterministic scoring against published controls with statutory citations and gap rationales.',
    modulePath: '/assessment',
    moduleLabel: 'Control Assessment',
    actionLabel: 'Run 46-Control Assessment',
  },
  {
    name: 'saakshi',
    persona: 'Evidence',
    indic: 'साक्षी · Evidence',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 2 · WORM Vault',
    description: 'Seals evidence artifacts and audit snapshots into immutable WORM storage with cryptographic SHA-256 hashes.',
    statutoryBoundary: 'S3 Object Lock in Compliance mode. Multi-year retention prevents premature deletion or tamper.',
    modulePath: '/evidence',
    moduleLabel: 'Evidence Explorer',
    actionLabel: 'Seal Attestation Proof',
  },
  {
    name: 'sudhaar',
    persona: 'Remediation',
    indic: 'सुधार · Remediation',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 3 · Blueprints',
    description: 'Synthesizes remediation blueprints with step-by-step actions, blast radius caps, and reversible rollbacks.',
    statutoryBoundary: 'Separation of duties (ADR-3): Sudhaar is strictly read-only (can_mutate = False). Holds zero write credentials.',
    modulePath: '/plans',
    moduleLabel: 'Remediation Plans',
    actionLabel: 'Generate Remediation Plan',
  },
  {
    name: 'karya',
    persona: 'Execution',
    indic: 'कार्य · Execution',
    autonomy: 'L2 Approval-Gated',
    phase: 'Phase 3 · Mutations',
    description: 'Mutating execution engine. Executes only actions covered by a verified, signed, scope-bound human approval token.',
    statutoryBoundary: 'ADR-1 & ADR-2: Refuses execution without validated dry-run, rollback, and signed human approval token.',
    modulePath: '/approval',
    moduleLabel: 'Approval Console',
    actionLabel: 'Review & Approve in Console',
    isGated: true,
  },
  {
    name: 'lekha',
    persona: 'Audit',
    indic: 'लेखा · Audit',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 2 · Ledger',
    description: 'Verifies the append-only, tamper-evident audit ledger and reconstructs unbroken SHA-256 cryptographic hash chains.',
    statutoryBoundary: 'Ledger writes are restricted to append_ledger() SECURITY DEFINER Postgres function.',
    modulePath: '/ledger',
    moduleLabel: 'Audit Ledger',
    actionLabel: 'Verify Ledger Chain',
  },
  {
    name: 'nazar',
    persona: 'Regulatory Watch',
    indic: 'नज़र · Surveillance',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 2 · RegWatch',
    description: 'Surveillance of MeitY gazette notifications, DPB adjudications, and statutory compliance drift.',
    statutoryBoundary: 'Tracks enforcement countdowns (13 May 2027) and statutory rule updates for operational alignment.',
    modulePath: '/regwatch',
    moduleLabel: 'Regulatory Watch',
    actionLabel: 'Scan Regulatory Feeds',
  },
  {
    name: 'prativedan',
    persona: 'Reporting',
    indic: 'प्रतिवेदन · Reports',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 2 · Board Packs',
    description: 'Compiles executive Board compliance packs, RoPA summaries, and auditor-ready submission dossiers.',
    statutoryBoundary: 'Zero raw PII egress. All sensitive personal data is redacted prior to report rendering.',
    modulePath: '/reports',
    moduleLabel: 'Compliance Reports',
    actionLabel: 'Compile Board Report',
  },
  {
    name: 'sanket',
    persona: 'Market Signal',
    indic: 'संकेत · Signal',
    autonomy: 'L1 Autonomous',
    phase: 'Phase 1 · Threat Signals',
    description: 'Monitors breach telemetry, CERT-In vulnerability disclosures, and commercial privacy procurement intent.',
    statutoryBoundary: 'Continuous signal telemetry surveillance without exposing tenant personal data.',
    modulePath: '/breaches',
    moduleLabel: 'Breach & Signals',
    actionLabel: 'Scan Market & Breach Signals',
  },
];

export interface SidebarAgentPanelProps {
  transparent?: boolean;
  systemMessage?: string;
  className?: string;
  showSystemMessage?: boolean;
}

export function SidebarAgentPanel({
  transparent = false,
  systemMessage,
  className = '',
  showSystemMessage = true,
}: SidebarAgentPanelProps = {}) {
  const router = useRouter();
  const [activeAgentNames, setActiveAgentNames] = useState<Set<string>>(new Set());
  const [demoMode, setDemoMode] = useState<'live' | 'thinking' | 'working'>('live');
  const [selectedAgent, setSelectedAgent] = useState<AgentActionMeta | null>(null);

  // Execution state tracking
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<{
    success: boolean;
    status?: string;
    message: string;
    latency_ms?: number;
    ledgerIds?: string[];
    error?: string;
  } | null>(null);

  // Close flyout on Escape key
  useEffect(() => {
    if (!selectedAgent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAgent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgent]);

  // Reset execution result on agent switch
  useEffect(() => {
    setLastRunResult(null);
  }, [selectedAgent?.name]);

  // Poll for live active agent runs every 4 seconds
  useEffect(() => {
    let isMounted = true;

    async function fetchActive() {
      try {
        const res = await fetch('/api/bff/v1/agents/runs/active');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.active_runs) {
          const names = new Set<string>();
          for (const run of data.active_runs) {
            if (run.agent_name) names.add(run.agent_name.toLowerCase());
          }
          setActiveAgentNames(names);
        }
      } catch {
        // Silently tolerate network/offline blip
      }
    }

    fetchActive();
    const interval = setInterval(fetchActive, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getAgentState = (name: string): AgentIconState => {
    if (demoMode !== 'live') return demoMode;
    return activeAgentNames.has(name) ? 'working' : 'idle';
  };

  const cycleDemoMode = () => {
    setDemoMode((curr) => {
      if (curr === 'live') return 'thinking';
      if (curr === 'thinking') return 'working';
      return 'live';
    });
  };

  // Run agent action via BFF API
  const handleRunAgent = async (agent: AgentActionMeta) => {
    if (isExecuting) return;
    setIsExecuting(true);
    setLastRunResult(null);

    try {
      const res = await fetch(`/api/bff/v1/agents/${agent.name}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'manual_trigger' }),
      });

      const data = await res.json();

      if (data?.output?.status === 'denied' || data?.status === 'denied') {
        setLastRunResult({
          success: false,
          status: 'denied',
          message:
            data.output?.error ||
            'Refused: Mutating actions require an issued Human Approval Token (ADR-1 / ADR-3).',
          latency_ms: data.latency_ms,
        });
      } else if (res.ok && (data.status === 'succeeded' || data.agent)) {
        setLastRunResult({
          success: true,
          status: 'succeeded',
          message: `Agent ${agent.name} executed successfully.`,
          latency_ms: data.latency_ms,
          ledgerIds: data.ledger_entry_ids,
        });
        router.refresh();
      } else {
        setLastRunResult({
          success: false,
          status: 'failed',
          message: data?.error?.message || data?.error || 'Execution failed. Inspect system logs.',
        });
      }
    } catch (err: any) {
      setLastRunResult({
        success: false,
        status: 'error',
        message: err?.message || 'Network error invoking agent runtime',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const activeCount = activeAgentNames.size;
  const currentBroadcast =
    systemMessage ||
    (demoMode === 'working'
      ? 'All agents executing in parallel · ap-south-1'
      : demoMode === 'thinking'
        ? 'Agents deliberating statutory controls…'
        : activeCount > 0
          ? `${activeCount} agent(s) active on task · live`
          : 'Agents standing by · ap-south-1');

  return (
    <>
      {/* ============================================================ */}
      {/* 1. ELEVATED AGENT DOCK (IN SIDEBAR)                           */}
      {/* Lighter contrast background per UI/UX best practices          */}
      {/* ============================================================ */}
      <div
        className={`mx-2.5 mb-2.5 rounded-xl border border-white/20 p-3 shadow-lg select-none transition-all ${
          transparent ? 'bg-[#212f50]/80' : 'bg-[#243458]'
        } ${className}`}
      >
        {/* Dock Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-100">
              Agents ({ALL_AGENTS.length})
            </span>
            {(activeCount > 0 || demoMode !== 'live') && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0FB5A5] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0FB5A5]" />
              </span>
            )}
          </div>

          {/* Demo Mode Toggle */}
          <button
            type="button"
            onClick={cycleDemoMode}
            title="Cycle animation preview modes (Live / Thinking / Working)"
            className={`rounded px-1.5 py-0.5 text-[9.5px] font-medium transition-colors border cursor-pointer ${
              demoMode !== 'live'
                ? 'border-teal-400/60 bg-teal-500/25 text-teal-300 font-semibold shadow-2xs'
                : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
            }`}
          >
            {demoMode === 'live'
              ? 'Preview'
              : demoMode === 'thinking'
                ? 'Thinking ⟳'
                : 'Working ⟳'}
          </button>
        </div>

        {/* 10 Interactive Agent Tiles Grid */}
        <div className="mt-2.5 grid grid-cols-5 gap-1.5">
          {ALL_AGENTS.map((agent) => {
            const state = getAgentState(agent.name);
            const isSelected = selectedAgent?.name === agent.name;
            const accent = agentAccents[agent.name] || '#0FB5A5';

            return (
              <button
                key={agent.name}
                type="button"
                onClick={() => setSelectedAgent(isSelected ? null : agent)}
                title={`Click for ${agent.name} (${agent.persona}) actions & inspection · State: ${state}`}
                className={`group relative flex flex-col items-center justify-center rounded-lg p-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/30 border border-teal-400 ring-2 ring-[#0FB5A5] shadow-sm'
                    : 'bg-white/[0.08] hover:bg-white/[0.18] border border-white/10 hover:border-white/25 shadow-2xs'
                }`}
              >
                <AgentIcon
                  agent={agent.name}
                  state={state}
                  size="sm"
                  showBadge={state === 'working'}
                  className="transition-transform group-hover:scale-110"
                />
                <span
                  className="mt-1 truncate text-[9.5px] font-semibold capitalize max-w-full"
                  style={{
                    color:
                      state === 'working'
                        ? accent
                        : isSelected
                          ? '#FFFFFF'
                          : '#E2E8F0',
                  }}
                >
                  {agent.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Ticker Bar */}
        {showSystemMessage && (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-2.5 py-1 text-[9.5px] text-slate-200 backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                activeCount > 0 || demoMode !== 'live'
                  ? 'bg-teal-400 animate-pulse'
                  : 'bg-[#C9A227]'
              }`}
            />
            <span className="truncate font-mono tracking-tight text-slate-200">
              {currentBroadcast}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. ELEVATED AGENT ACTION & INSPECTION FLYOUT CARD            */}
      {/* High-contrast light card floating safely beside the sidebar  */}
      {/* ============================================================ */}
      {selectedAgent && (
        <>
          {/* Backdrop Click Dismiss */}
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setSelectedAgent(null)}
          />

          <div
            className="fixed left-[274px] bottom-3 z-50 w-[360px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl ring-1 ring-black/5 text-slate-900 animate-in fade-in-0 zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-flyout-title"
          >
            {/* Header: Icon, Name, Persona & Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <AgentIcon
                    agent={selectedAgent.name}
                    state={getAgentState(selectedAgent.name)}
                    size="md"
                    className="shadow-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      id="agent-flyout-title"
                      className="font-heading text-base font-bold capitalize text-slate-900"
                    >
                      {selectedAgent.name}
                    </h3>
                    <Badge variant="indigo" size="sm">
                      {selectedAgent.persona}
                    </Badge>
                  </div>
                  <p className="font-heading text-xs font-medium text-slate-500">
                    {selectedAgent.indic}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                aria-label="Close agent inspector"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Metadata Badges: Autonomy & Status */}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Autonomy:</span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {selectedAgent.autonomy}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                {getAgentState(selectedAgent.name) === 'working' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
                    Working
                  </span>
                ) : demoMode === 'thinking' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    Deliberating
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                    Standing by
                  </span>
                )}
              </div>
            </div>

            {/* Agent Description */}
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              {selectedAgent.description}
            </p>

            {/* Statutory Guardrail / Architectural Boundary Callout */}
            <div
              className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-snug flex items-start gap-2 ${
                selectedAgent.name === 'karya'
                  ? 'border-indigo-200 bg-indigo-50/70 text-indigo-900'
                  : selectedAgent.name === 'sudhaar'
                    ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                    : selectedAgent.name === 'drishti'
                      ? 'border-blue-200 bg-blue-50/70 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <span className="shrink-0 text-xs">
                {selectedAgent.name === 'karya'
                  ? '🔒'
                  : selectedAgent.name === 'sudhaar'
                    ? '⚠️'
                    : selectedAgent.name === 'drishti'
                      ? '🇮🇳'
                      : '📜'}
              </span>
              <span>{selectedAgent.statutoryBoundary}</span>
            </div>

            {/* Live Execution Feedback Banner */}
            {isExecuting && (
              <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/80 p-2.5 text-xs text-teal-800 flex items-center gap-2">
                <span className="animate-spin text-teal-600 font-bold">↻</span>
                <span className="font-medium">Invoking {selectedAgent.name} via BFF API…</span>
              </div>
            )}

            {lastRunResult && !isExecuting && (
              <div
                className={`mt-3 rounded-lg border p-2.5 text-xs flex flex-col gap-1.5 ${
                  lastRunResult.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : lastRunResult.status === 'denied'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>
                    {lastRunResult.success
                      ? '✓ Task executed'
                      : lastRunResult.status === 'denied'
                        ? '🔒 Approval gate enforced'
                        : '✕ Invocation error'}
                  </span>
                  {lastRunResult.latency_ms !== undefined && (
                    <span className="font-mono text-[10px] opacity-75">
                      {lastRunResult.latency_ms}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-tight opacity-90">
                  {lastRunResult.message}
                </p>
                {lastRunResult.ledgerIds && lastRunResult.ledgerIds.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="opacity-75">Ledger proof:</span>
                    <Link
                      href={`/ledger?q=${lastRunResult.ledgerIds[0]}`}
                      className="font-mono underline hover:text-teal-900"
                    >
                      #{lastRunResult.ledgerIds.join(', #')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* ACTION CONTROLS (SOLVING: NOT ALLOWING AGENTS ACTIONS)        */}
            {/* ============================================================ */}
            <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-slate-100">
              {/* 1. Primary Action Button */}
              {selectedAgent.name === 'karya' ? (
                <Link
                  href="/approval"
                  onClick={() => setSelectedAgent(null)}
                  className="w-full rounded-lg bg-[#1E2A4A] hover:bg-[#151e35] text-white text-xs font-semibold py-2.5 px-3 flex items-center justify-center gap-1.5 shadow-sm transition-colors text-center"
                >
                  <span>Review & Approve Actions in Console</span>
                  <span>→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRunAgent(selectedAgent)}
                  disabled={isExecuting}
                  className="w-full rounded-lg bg-[#0FB5A5] hover:bg-[#0da294] disabled:opacity-60 text-white text-xs font-semibold py-2.5 px-3 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>⚡</span>
                  <span>{isExecuting ? 'Executing…' : selectedAgent.actionLabel}</span>
                </button>
              )}

              {/* 2. Direct Module Route Button */}
              <Link
                href={selectedAgent.modulePath}
                onClick={() => setSelectedAgent(null)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium py-2 px-3 flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <span>Open {selectedAgent.moduleLabel} Screen</span>
                <span className="text-slate-400">→</span>
              </Link>

              {/* 3. Deep Links: Workbench & Ledger */}
              <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium">
                <Link
                  href={`/workbench?agent=${selectedAgent.name}`}
                  onClick={() => setSelectedAgent(null)}
                  className="hover:text-indigo-600 hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>Workbench Prompt ↗</span>
                </Link>
                <span className="text-slate-300">·</span>
                <Link
                  href={`/ledger?agent=${selectedAgent.name}`}
                  onClick={() => setSelectedAgent(null)}
                  className="hover:text-indigo-600 hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>Audit Ledger Proof ↗</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

