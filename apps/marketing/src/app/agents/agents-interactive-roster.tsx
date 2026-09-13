'use client';

import React, { useState } from 'react';
import type { AgentName } from '@axiom/types';
import {
  AgentIcon,
  AgentPill,
  type AgentIconState,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from '@axiom/ui';
import { agentAccents } from '@axiom/design-tokens';

export interface AgentRosterItem {
  name: AgentName;
  persona: string;
  one: string;
  long: string;
  autonomy: string;
  scopes: string[];
}

export interface AgentsInteractiveRosterProps {
  agents: readonly AgentRosterItem[];
}

export function AgentsInteractiveRoster({ agents }: AgentsInteractiveRosterProps) {
  const [globalState, setGlobalState] = useState<AgentIconState>('idle');
  const [individualStates, setIndividualStates] = useState<Record<string, AgentIconState>>({});

  const handleGlobalState = (state: AgentIconState) => {
    setGlobalState(state);
    const updated: Record<string, AgentIconState> = {};
    for (const a of agents) {
      updated[a.name] = state;
    }
    setIndividualStates(updated);
  };

  const handleIndividualState = (agentName: string, state: AgentIconState) => {
    setIndividualStates((prev) => ({
      ...prev,
      [agentName]: state,
    }));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Simulation & Dynamics Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Interactive Agent Dynamics
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Preview how each agent's mini icon animates across cognitive and execution states.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-mist-50 p-1">
            {(['idle', 'thinking', 'working'] as const).map((s) => {
              const active = globalState === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleGlobalState(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                    active
                      ? 'bg-indigo-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-mist-200 hover:text-slate-900'
                  }`}
                >
                  {s === 'idle' ? 'All Idle' : s === 'thinking' ? 'All Thinking' : 'All Working'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agents Roster Grid */}
      <div className="grid grid-cols-1 gap-5">
        {agents.map((a) => {
          const accent = agentAccents[a.name] || '#0FB5A5';
          const currentState = individualStates[a.name] || globalState;

          return (
            <Card key={a.name} className="overflow-hidden border-slate-200 transition-all hover:border-slate-300">
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
                {/* Visual Icon Avatar with dynamic halo */}
                <div className="relative flex shrink-0 items-center justify-center">
                  <div
                    className="absolute -inset-1 rounded-xl opacity-20 blur-sm transition-all"
                    style={{
                      backgroundColor: accent,
                      transform: currentState === 'working' ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                  <AgentIcon
                    agent={a.name}
                    state={currentState}
                    size="lg"
                    showBadge
                    className="relative z-10 shadow-xs"
                  />
                </div>

                {/* Content & State Switcher */}
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <AgentPill agent={a.name} state={currentState} />
                      <Badge variant="indigo">{a.autonomy}</Badge>
                      {currentState === 'working' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
                          Active
                        </span>
                      )}
                      {currentState === 'thinking' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Reasoning
                        </span>
                      )}
                    </div>

                    {/* Per-agent interactive toggle */}
                    <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-mist-50 p-0.5">
                      {(['idle', 'thinking', 'working'] as const).map((s) => {
                        const isSelected = currentState === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleIndividualState(a.name, s)}
                            className={`rounded px-2 py-0.5 text-[11px] font-medium capitalize transition-colors ${
                              isSelected
                                ? 'bg-white text-indigo-500 shadow-2xs font-semibold'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="font-heading text-base font-medium text-slate-800 italic">
                    "{a.one}"
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">{a.long}</p>

                  {a.scopes.length > 0 && (
                    <div className="mt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Sanctioned Tool Scopes
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.scopes.map((s) => (
                          <code
                            key={s}
                            className="rounded-md bg-mist-100 px-2 py-0.5 font-mono text-xs text-indigo-700 border border-slate-200"
                          >
                            {s}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
