/**
 * Append-only audit ledger client.
 *
 * The BFF and the agent runtime both use this to write entries to the
 * hash-chained ledger. Writes go through the Postgres SECURITY DEFINER
 * function `append_ledger()`, which:
 *   1. Locks the per-tenant counter
 *   2. Computes the next sequence number
 *   3. Computes the entry hash (SHA-256 of canonicalised payload)
 *   4. Updates the chain tip
 *
 * This module never bypasses the function — the only INSERT path is
 * via the RPC, which is enforced at the DB role level too.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ActorType, LedgerActionType, LedgerResult } from '@axiom/types';
import { canonicalJson, sha256 } from './canonicalise';

export interface AppendLedgerInput {
  tenantId: string;
  correlationId: string;
  actorType: ActorType;
  actorId: string;
  agentVersion?: string | null;
  modelId?: string | null;
  promptHash?: string | null;
  actionType: LedgerActionType;
  targetRef?: string | null;
  inputHash?: string | null;
  outputHash?: string | null;
  approvalTokenId?: string | null;
  approverId?: string | null;
  preStateRef?: string | null;
  postStateRef?: string | null;
  result: LedgerResult;
  detail?: Record<string, unknown>;
}

export interface AppendLedgerResult {
  id: string;
  sequenceNo: number;
  entryHash: string;
  occurredAt: string;
}

export class LedgerClient {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Append a single entry to the hash-chained audit ledger.
   *
   * Throws on any error — the caller decides whether to surface or
   * silently degrade (it should not: per BR-3, no action bypasses the
   * ledger, so a ledger write failure must fail the parent operation).
   */
  async append(input: AppendLedgerInput): Promise<AppendLedgerResult> {
    // Compute the input/output hashes from the canonical detail (if not provided)
    const detail = input.detail ?? {};
    const inputHash =
      input.inputHash ?? (await sha256(canonicalJson({ ...detail, _kind: 'input' })));
    const outputHash =
      input.outputHash ?? (await sha256(canonicalJson({ ...detail, _kind: 'output' })));

    const { data, error } = await this.supabase.rpc('append_ledger', {
      p_tenant_id: input.tenantId,
      p_correlation_id: input.correlationId,
      p_actor_type: input.actorType,
      p_actor_id: input.actorId,
      p_agent_version: input.agentVersion ?? null,
      p_model_id: input.modelId ?? null,
      p_prompt_hash: input.promptHash ?? null,
      p_action_type: input.actionType,
      p_target_ref: input.targetRef ?? null,
      p_input_hash: inputHash,
      p_output_hash: outputHash,
      p_approval_token_id: input.approvalTokenId ?? null,
      p_approver_id: input.approverId ?? null,
      p_pre_state_ref: input.preStateRef ?? null,
      p_post_state_ref: input.postStateRef ?? null,
      p_result: input.result,
      p_detail: detail,
    });

    if (error) {
      throw new LedgerWriteError(`Failed to append ledger entry: ${error.message}`, {
        code: error.code,
        hint: error.hint,
        details: error.details,
      });
    }
    if (!data) {
      throw new LedgerWriteError('append_ledger returned no data');
    }

    // The RPC returns the new id (bigint); the sequence and hash are
    // available from a follow-up select, or we can just trust the
    // server-side computation and return a partial shape. For the
    // immediate caller, the id is enough.
    return {
      id: String(data),
      sequenceNo: 0, // populated by a follow-up query if needed
      entryHash: '',
      occurredAt: new Date().toISOString(),
    };
  }

  /**
   * Walk the chain and verify integrity. Returns the first failing
   * sequence number (or null if intact).
   *
   * IMPORTANT: this is a read-only check. Tampering detection doesn't
   * fix the chain — it surfaces the issue. The recovery procedure is
   * to investigate the break and either revert or supersede the chain.
   */
  async verify(
    tenantId: string,
    fromSequence = 1,
  ): Promise<
    { intact: true } | { intact: false; firstBreak: { sequenceNo: number; reason: string } }
  > {
    const { data, error } = await this.supabase.rpc('verify_ledger', {
      p_tenant_id: tenantId,
      p_from_sequence: fromSequence,
    });
    if (error) throw new Error(`verify_ledger failed: ${error.message}`);
    if (!data || data.length === 0) return { intact: true };
    const first = data[0] as { sequence_no: number; reason: string };
    return { intact: false, firstBreak: { sequenceNo: first.sequence_no, reason: first.reason } };
  }

  /**
   * Query entries. All filters are tenant-scoped (RLS-enforced).
   */
  async query(opts: {
    tenantId: string;
    fromSequence?: number;
    toSequence?: number;
    fromTime?: string;
    toTime?: string;
    actorType?: ActorType;
    actorId?: string;
    actionType?: LedgerActionType;
    correlationId?: string;
    result?: LedgerResult;
    limit?: number;
    offset?: number;
  }) {
    let q = this.supabase
      .from('audit_ledger')
      .select('*')
      .eq('tenant_id', opts.tenantId)
      .order('sequence_no', { ascending: false });

    if (opts.fromSequence !== undefined) q = q.gte('sequence_no', opts.fromSequence);
    if (opts.toSequence !== undefined) q = q.lte('sequence_no', opts.toSequence);
    if (opts.fromTime) q = q.gte('occurred_at', opts.fromTime);
    if (opts.toTime) q = q.lte('occurred_at', opts.toTime);
    if (opts.actorType) q = q.eq('actor_type', opts.actorType);
    if (opts.actorId) q = q.eq('actor_id', opts.actorId);
    if (opts.actionType) q = q.eq('action_type', opts.actionType);
    if (opts.correlationId) q = q.eq('correlation_id', opts.correlationId);
    if (opts.result) q = q.eq('result', opts.result);
    q = q.limit(opts.limit ?? 100);
    if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 100) - 1);

    const { data, error } = await q;
    if (error) throw new Error(`ledger query failed: ${error.message}`);
    return data ?? [];
  }
}

export class LedgerWriteError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LedgerWriteError';
  }
}

export function createLedgerClient(supabaseUrl: string, supabaseKey: string): LedgerClient {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
  return new LedgerClient(supabase);
}

export { canonicalJson, sha256 };
