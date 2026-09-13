import { type HTMLAttributes } from 'react';
import { cn } from '../utils';
import { AxiomMark, type AxiomMarkSize, type AxiomMarkVariant } from './AxiomMark';

export interface AxiomLogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: AxiomMarkSize;
  variant?: AxiomMarkVariant;
  theme?: 'light' | 'dark';
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
}

const TITLE_SIZE_CLASSES: Record<AxiomMarkSize, string> = {
  xs: 'text-xs tracking-[0.02em]',
  sm: 'text-sm tracking-[0.02em]',
  md: 'text-[15.5px] tracking-[0.02em]',
  lg: 'text-lg tracking-[0.02em]',
  xl: 'text-2xl tracking-[0.02em]',
};

const SUBTITLE_SIZE_CLASSES: Record<AxiomMarkSize, string> = {
  xs: 'text-[8px] tracking-[0.05em]',
  sm: 'text-[9.5px] tracking-[0.05em]',
  md: 'text-[10.5px] tracking-[0.06em]',
  lg: 'text-xs tracking-[0.06em]',
  xl: 'text-sm tracking-[0.06em]',
};

/**
 * Official Axiom Proof Brand Lockup (Mark + Logotype).
 *
 * Designed to strictly adhere to:
 * - Axiom Proof Design System §01 Brand
 * - Inter Tight geometric authoritative heading typography
 * - Institutional Deep Indigo or White contrast with Signal Teal accents
 */
export function AxiomLogo({
  size = 'md',
  variant = 'gradient',
  theme = 'light',
  showSubtitle = true,
  subtitleText = 'by Axiom Minds',
  className,
  ...props
}: AxiomLogoProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn('inline-flex items-center gap-2.5 select-none', className)}
      role="banner"
      {...props}
    >
      <AxiomMark size={size} variant={variant} />
      <div className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            'font-heading font-bold uppercase leading-none',
            TITLE_SIZE_CLASSES[size],
            isDark ? 'text-white' : 'text-indigo-900',
          )}
        >
          AXIOM PROOF
        </span>
        {showSubtitle && (
          <span
            className={cn(
              'font-normal leading-none mt-0.5',
              SUBTITLE_SIZE_CLASSES[size],
              isDark ? 'text-teal-400' : 'text-teal-600',
            )}
          >
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
}
