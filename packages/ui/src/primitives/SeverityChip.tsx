import { type HTMLAttributes } from 'react';
import { cn } from '../utils.js';
import { Badge } from './Badge.js';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

const severityConfig: Record<Severity, { label: string; variant: 'danger' | 'warning' | 'neutral' | 'info'; symbol: string }> = {
  critical: { label: 'Critical', variant: 'danger', symbol: '◆' },
  high: { label: 'High', variant: 'warning', symbol: '▲' },
  medium: { label: 'Medium', variant: 'neutral', symbol: '●' },
  low: { label: 'Low', variant: 'info', symbol: '○' },
};

export interface SeverityChipProps extends HTMLAttributes<HTMLSpanElement> {
  severity: Severity;
  showSymbol?: boolean;
}

export function SeverityChip({ severity, showSymbol = true, className, ...props }: SeverityChipProps) {
  const c = severityConfig[severity];
  return (
    <Badge variant={c.variant} className={cn('font-medium', className)} {...props}>
      {showSymbol && <span aria-hidden="true">{c.symbol}</span>}
      {c.label}
    </Badge>
  );
}
