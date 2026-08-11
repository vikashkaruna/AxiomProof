import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { canonicalJson, sha256 } from '@axiom/ledger';

/**
 * Approval Engine — signed, scope-bound, single-use tokens.
 *
 * Per ADR-2 (and BR-1), unapproved execution is architecturally
 * impossible. The token is the gate. This module:
 *   - Issues tokens (IssueApprovalRequest → ApprovalToken)
 *   - Validates them per-action (not per-batch — see execution gate)
 *   - Tracks nonce replay protection
 *
 * The signature is HMAC-SHA-256 over a canonicalised payload:
 *   signature = HMAC-SHA256(per_tenant_secret, canonicalJson({
 *     planId, actionIds: sorted, approverId, mode, concurrency,
 *     stopOnFailure, expiresAt, nonce
 *   }))
 *
 * Per-tenant secret is stored in the secrets manager (AWS Secrets
 * Manager / Supabase Vault). In dev, falls back to a single env var.
 *
 * This is the module the entire trust proposition stands on. It must
 * be small, auditable, and tested in isolation. No side effects, no
 * DB calls — just pure crypto.
 */

export interface ApprovalTokenSpec {
  planId: string;
  actionIds: string[]; // MUST be sorted before signing
  approverId: string;
  mode: 'batch' | 'individual';
  concurrency: number;
  stopOnFailure: boolean;
  expiresAt: string; // ISO datetime
  nonce: string;
  conditions?: Record<string, unknown>;
}

export interface SignedApprovalToken {
  spec: ApprovalTokenSpec;
  signature: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: 'signature_mismatch' | 'expired' | 'revoked' | 'consumed' | 'nonce_replay' | 'action_not_in_scope';
  details?: Record<string, unknown>;
}

export class ApprovalEngine {
  private readonly secrets = new Map<string, Buffer>();
  private readonly usedNonces = new Set<string>(); // in-memory; persisted in DB via the token row

  constructor(private readonly defaultSecret?: Buffer) {}

  /**
   * Register a per-tenant signing secret. In production, called once
   * at boot from the secrets manager.
   */
  setTenantSecret(tenantId: string, secret: string): void {
    this.secrets.set(tenantId, Buffer.from(secret, 'utf-8'));
  }

  private getSecret(tenantId: string): Buffer {
    const s = this.secrets.get(tenantId);
    if (s) return s;
    if (this.defaultSecret) return this.defaultSecret;
    throw new Error(
      `No approval signing secret for tenant ${tenantId}. ` +
        `Call setTenantSecret() at boot.`,
    );
  }

  /**
   * Issue a new signed approval token. Returns the spec and signature
   * for storage in approval_tokens; the verifier uses the spec to
   * recompute the signature.
   */
  async issue(tenantId: string, input: Omit<ApprovalTokenSpec, 'nonce'>): Promise<SignedApprovalToken> {
    const nonce = randomBytes(16).toString('hex');
    const spec: ApprovalTokenSpec = {
      ...input,
      actionIds: [...input.actionIds].sort(), // canonical order
      nonce,
    };
    const signature = await this.sign(tenantId, spec);
    return { spec, signature };
  }

  /**
   * Sign a spec. Pure function — exposed for testing.
   */
  async sign(tenantId: string, spec: ApprovalTokenSpec): Promise<string> {
    const payload = canonicalJson(spec as unknown as Record<string, unknown>);
    const secret = this.getSecret(tenantId);
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify a token + its claimed spec. The signature must match; the
   * expiry must not have passed; the nonce must not have been used
   * (single-use enforcement).
   *
   * The actual single-use check is performed by the BFF which marks
   * the token as 'consumed' in the DB after first successful use.
   * This module's in-memory set is a fast pre-check that the BFF
   * can also rely on if it shares the process.
   */
  async verify(tenantId: string, token: SignedApprovalToken): Promise<ValidationResult> {
    // 1. Signature
    const expected = await this.sign(tenantId, token.spec);
    const a = Buffer.from(expected, 'utf-8');
    const b = Buffer.from(token.signature, 'utf-8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: 'signature_mismatch' };
    }

    // 2. Expiry
    if (new Date(token.spec.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: 'expired', details: { expiresAt: token.spec.expiresAt } };
    }

    // 3. Nonce replay (in-memory fast path; DB is the source of truth)
    if (this.usedNonces.has(token.spec.nonce)) {
      return { valid: false, reason: 'nonce_replay' };
    }

    return { valid: true };
  }

  /**
   * Mark a nonce as used. Idempotent — re-marking is a no-op.
   */
  markNonceUsed(nonce: string): void {
    this.usedNonces.add(nonce);
  }

  /**
   * Verify that a specific action_id is covered by this token's scope.
   * This is the per-action check called by the Execution Engine
   * (per Doc 04 §4.3, "not once at batch start").
   */
  isActionCovered(token: SignedApprovalToken, actionId: string): boolean {
    return token.spec.actionIds.includes(actionId);
  }

  /**
   * Compute the canonical hash of a token spec (for ledger entry).
   */
  async tokenHash(token: SignedApprovalToken): Promise<string> {
    return sha256(canonicalJson({ spec: token.spec, signature: token.signature }));
  }
}

/**
 * Test/dev signing secret. NEVER use in production. Per-tenant
 * secrets must be loaded from the secrets manager.
 */
export function generateTestSecret(): Buffer {
  return randomBytes(32);
}
