import { type HTMLAttributes } from 'react';
import { cn, truncateHash } from '../utils.js';

export interface ProofSealProps extends HTMLAttributes<HTMLSpanElement> {
  /** The content hash (sha256 hex, 64 chars). If absent, displays "Unsealed". */
  hash?: string | null;
  /** Sealed-at timestamp. */
  sealedAt?: string | null;
  /** Compact mode shows just the truncated hash. */
  compact?: boolean;
}

/**
 * Proof Seal — the visual mark of a sealed, attested artifact.
 * Gold is reserved exclusively for proof (per brand guidelines).
 */
export function ProofSeal({
  hash,
  sealedAt,
  compact = false,
  className,
  ...props
}: ProofSealProps) {
  if (!hash) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-mist-100 px-2.5 py-1 font-mono text-xs text-slate-500',
          className,
        )}
        {...props}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden="true" />
        Unsealed
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-gold-500 bg-gold-50 px-2.5 py-1 font-mono text-xs font-medium text-gold-700',
        className,
      )}
      title={`SHA-256: ${hash}${sealedAt ? `\nSealed: ${sealedAt}` : ''}`}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shadow-[0_0_0_2px_rgb(201,162,39,0.18)]" aria-hidden="true" />
      {compact ? truncateHash(hash) : `Sealed · ${truncateHash(hash)}`}
    </span>
  );
}
