'use client';

import React, { useState, useEffect } from 'react';
import type { AgentName } from '@axiom/types';
import { AgentIcon, type AgentIconState, Badge } from '@axiom/ui';
import { agentAccents } from '@axiom/design-tokens';

interface AgentInfo {
  name: AgentName;
  persona: string;
  autonomy: string;
  description: string;
}

const ALL_AGENTS: AgentInfo[] = [
  { name: 'drishti', persona: 'Discovery', autonomy: 'L1 → L2', description: 'Personal data scanning & flow mapping' },
  { name: 'vibhaag', persona: 'Classification', autonomy: 'L1', description: 'DPDPA statutory categorization & tagging' },
  { name: 'parikshan', persona: 'Assessment', autonomy: 'L1', description: '46-control statutory gap measurement' },
  { name: 'saakshi', persona: 'Evidence', autonomy: 'L1', description: 'WORM-vault proof sealer & witness' },
  { name: 'sudhaar', persona: 'Remediation', autonomy: 'L1', description: 'Remediation blueprint planner (read-only)' },
  { name: 'karya', persona: 'Execution', autonomy: 'L2', description: 'Approval-gated mutating engine' },
  { name: 'lekha', persona: 'Audit', autonomy: 'L1', description: 'Immutable hash-chain ledger witness' },
  { name: 'nazar', persona: 'Regulatory Watch', autonomy: 'L1', description: 'MeitY & DPB drift surveillance' },
  { name: 'prativedan', persona: 'Reporting', autonomy: 'L1', description: 'Executive board packs & RoPA compiler' },
  { name: 'sanket', persona: 'Market Signal', autonomy: 'L1', description: 'Breach telemetry & market signals' },
];

export function SidebarAgentPanel() {
  const [activeAgentNames, setActiveAgentNames] = useState<Set<string>>(new Set());
  const [demoMode, setDemoMode] = useState<'live' | 'thinking' | 'working'>('live');
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

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
        // Fallback silently if offline/network error
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

  return (
    <div className="border-t border-slate-200 bg-white/50 p-3 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Agents ({ALL_AGENTS.length})
          </p>
          {activeAgentNames.size > 0 && demoMode === 'live' && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
          )}
        </div>

        {/* Demo Animation Switcher Button */}
        <button
          type="button"
          onClick={cycleDemoMode}
          title="Click to cycle animation preview modes (Live / Thinking / Working)"
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border ${
            demoMode !== 'live'
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold'
              : 'border-slate-200 bg-mist-100 text-slate-600 hover:bg-mist-200'
          }`}
        >
          {demoMode === 'live'
            ? 'Preview'
            : demoMode === 'thinking'
              ? 'Thinking ⟳'
              : 'Working ⟳'}
        </button>
      </div>

      {/* 10 Agent Mini Icons Grid */}
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
              title={`${agent.name} (${agent.persona}) · Status: ${state}`}
              className={`group relative flex flex-col items-center justify-center rounded-lg p-1 transition-all ${
                isSelected
                  ? 'bg-mist-200 ring-1 ring-slate-400'
                  : 'hover:bg-mist-100'
              }`}
            >
              <AgentIcon
                agent={agent.name}
                state={state}
                size="sm"
                showBadge={state === 'working'}
                className="transition-transform group-hover:scale-105"
              />
              <span
                className="mt-1 truncate text-[9px] font-medium capitalize"
                style={{ color: state === 'working' ? accent : '#64748B' }}
              >
                {agent.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Detail Inspector Popover */}
      {selectedAgent && (
        <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: agentAccents[selectedAgent.name] }}
              />
              <span className="font-heading text-xs font-semibold capitalize text-slate-900">
                {selectedAgent.name}
              </span>
              <span className="text-[10px] text-slate-500">· {selectedAgent.persona}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
              className="text-[11px] text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <p className="mt-1 text-[11px] text-slate-600 leading-tight">
            {selectedAgent.description}
          </p>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
            <span className="text-slate-500">Autonomy: <strong className="text-indigo-600">{selectedAgent.autonomy}</strong></span>
            <span className="font-medium capitalize text-slate-700">
              State: <strong className={getAgentState(selectedAgent.name) === 'working' ? 'text-teal-600' : 'text-slate-600'}>{getAgentState(selectedAgent.name)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
