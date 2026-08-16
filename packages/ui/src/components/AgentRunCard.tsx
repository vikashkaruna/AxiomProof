import { type ReactNode } from 'react';
import { cn, relativeTime } from '../utils';
import { AgentPill } from './AgentPill';
import { StatusBadge, type StatusKind } from './StatusBadge';
import type { AgentName } from '@axiom/design-tokens';

export interface AgentRunCardProps {
  agent: AgentName;
  step?: string;
  message?: string;
  status: StatusKind;
  startedAt?: string;
  /** Progress 0-1. */
  progress?: number;
  actions?: ReactNode;
  className?: string;
}

export function AgentRunCard({
  agent,
  step,
  message,
  status,
  startedAt,
  progress,
  actions,
  className,
}: AgentRunCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AgentPill agent={agent} />
          {step && <span className="text-sm text-slate-600">· {step}</span>}
        </div>
        <StatusBadge status={status} />
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      {typeof progress === 'number' && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist-200">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        {startedAt ? <span>Started {relativeTime(startedAt)}</span> : <span />}
        {actions}
      </div>
    </div>
  );
}
