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

export interface SidebarAgentPanelProps {
  transparent?: boolean;
  systemMessage?: string;
  className?: string;
  showSystemMessage?: boolean;
}

export function SidebarAgentPanel({
  transparent = true,
  systemMessage,
  className = '',
  showSystemMessage = true,
}: SidebarAgentPanelProps = {}) {
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
    <div
      className={`border-t border-white/10 p-3 select-none transition-colors ${
        transparent ? 'bg-transparent' : 'bg-white/50 backdrop-blur-sm'
      } ${className}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            Agents ({ALL_AGENTS.length})
          </p>
          {(activeCount > 0 || demoMode !== 'live') && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#0FB5A5] animate-ping" />
          )}
        </div>

        {/* Demo Animation Switcher Button */}
        <button
          type="button"
          onClick={cycleDemoMode}
          title="Click to cycle animation preview modes (Live / Thinking / Working)"
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border ${
            demoMode !== 'live'
              ? 'border-teal-400/40 bg-teal-500/20 text-teal-300 font-semibold'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
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
                  ? 'bg-white/15 ring-1 ring-white/25'
                  : 'hover:bg-white/10'
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
                style={{
                  color: state === 'working' ? accent : isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                }}
              >
                {agent.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* System-wide Agent Message / Status Bar */}
      {showSystemMessage && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] text-white/80 backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              activeCount > 0 || demoMode !== 'live'
                ? 'bg-teal-400 animate-pulse'
                : 'bg-[#C9A227]'
            }`}
          />
          <span className="truncate font-mono tracking-tight text-white/70">
            {currentBroadcast}
          </span>
        </div>
      )}

      {/* Interactive Detail Inspector Popover */}
      {selectedAgent && (
        <div className="mt-2.5 rounded-lg border border-white/15 bg-[#182238]/95 backdrop-blur-md p-2.5 shadow-2xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: agentAccents[selectedAgent.name] }}
              />
              <span className="font-heading text-xs font-semibold capitalize text-white">
                {selectedAgent.name}
              </span>
              <span className="text-[10px] text-white/60">· {selectedAgent.persona}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
              className="text-[11px] text-white/40 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="mt-1 text-[11px] text-white/75 leading-tight">
            {selectedAgent.description}
          </p>

          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px]">
            <span className="text-white/60">
              Autonomy: <strong className="text-teal-300">{selectedAgent.autonomy}</strong>
            </span>
            <span className="font-medium capitalize text-white/80">
              State:{' '}
              <strong
                className={
                  getAgentState(selectedAgent.name) === 'working'
                    ? 'text-teal-300'
                    : 'text-white/70'
                }
              >
                {getAgentState(selectedAgent.name)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
