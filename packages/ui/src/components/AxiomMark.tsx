import { type SVGAttributes, useId } from 'react';
import { cn } from '../utils';

export type AxiomMarkSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AxiomMarkVariant = 'gradient' | 'monochrome-dark' | 'monochrome-light' | 'gold';

export interface AxiomMarkProps extends SVGAttributes<SVGSVGElement> {
  size?: AxiomMarkSize;
  variant?: AxiomMarkVariant;
  className?: string;
}

const SIZE_MAP: Record<AxiomMarkSize, { px: number; rounded: number }> = {
  xs: { px: 20, rounded: 5 },
  sm: { px: 28, rounded: 7 },
  md: { px: 34, rounded: 9 },
  lg: { px: 40, rounded: 10 },
  xl: { px: 48, rounded: 12 },
};

/**
 * Official Axiom Proof Brand Mark.
 *
 * Mark concept (per §01 Brand in Design System):
 * "A seal / checkmark formed from a chain link.
 *  Chain = the hash-chained ledger (traceability); seal = proof.
 *  Monochrome-first so it works on invoices, PDFs and report covers."
 */
export function AxiomMark({
  size = 'md',
  variant = 'gradient',
  className,
  ...props
}: AxiomMarkProps) {
  const { px, rounded } = SIZE_MAP[size];
  const gradId = useId().replace(/:/g, '');

  // Color mappings
  const isMonochromeLight = variant === 'monochrome-light';
  const iconStroke = isMonochromeLight ? '#1E2A4A' : '#FFFFFF';

  let fillAttr = `url(#${gradId})`;
  if (variant === 'monochrome-dark') fillAttr = '#1E2A4A';
  if (variant === 'monochrome-light') fillAttr = '#FFFFFF';
  if (variant === 'gold') fillAttr = `url(#${gradId}-gold)`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 select-none',
        variant === 'gradient' && 'drop-shadow-[0_2px_8px_rgba(15,181,165,0.35)]',
        variant === 'gold' && 'drop-shadow-[0_2px_8px_rgba(201,162,39,0.35)]',
        className,
      )}
      role="img"
      aria-label="Axiom Proof Mark"
      {...props}
    >
      <defs>
        {variant === 'gradient' && (
          <linearGradient id={gradId} x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0FB5A5" />
            <stop offset="100%" stopColor="#0a8d80" />
          </linearGradient>
        )}
        {variant === 'gold' && (
          <linearGradient
            id={`${gradId}-gold`}
            x1="0"
            y1="0"
            x2="34"
            y2="34"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#A0821F" />
          </linearGradient>
        )}
      </defs>

      {/* Container squircle */}
      <rect width="34" height="34" rx={rounded} fill={fillAttr} />

      {/* Chain link circular ring (hash-chained ledger traceability) */}
      <circle cx="17" cy="17" r="7.5" stroke={iconStroke} strokeWidth="2.2" />

      {/* Integrated proof checkmark needle (verified proof & attestation) */}
      <path
        d="M 13.5 17.3 L 16.2 20.0 L 21 14.6"
        stroke={iconStroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
