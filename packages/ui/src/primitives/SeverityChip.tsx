import { type HTMLAttributes } from 'react';
import { cn } from '../utils';
import { Badge } from './Badge';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

const severityConfig: Record<
  Severity,
  { label: string; variant: 'danger' | 'warning' | 'neutral' | 'info'; symbol: string }
> = {
  critical: { label: 'Critical', variant: 'danger', symbol: '◆' },
  high: { label: 'High', variant: 'warning', symbol: '▲' },
  medium: { label: 'Medium', variant: 'neutral', symbol: '●' },
  low: { label: 'Low', variant: 'info', symbol: '○' },
};

export interface SeverityChipProps extends HTMLAttributes<HTMLSpanElement> {
  severity: Severity | string;
  showSymbol?: boolean;
}

export function SeverityChip({
  severity,
  showSymbol = true,
  className,
  ...props
}: SeverityChipProps) {
  const normalized = (severity || '').toLowerCase().trim() as Severity;
  const c = severityConfig[normalized] ?? {
    label: severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'Medium',
    variant: 'neutral' as const,
    symbol: '●',
  };
  return (
    <Badge variant={c.variant} className={cn('font-medium', className)} {...props}>
      {showSymbol && <span aria-hidden="true">{c.symbol}</span>}
      {c.label}
    </Badge>
  );
}
