import { Hono } from 'hono';
import { z } from 'zod';
import {
  IssueApprovalRequestSchema,
  ExecutePlanRequestSchema,
  type ExecutePlanRequest,
} from '@axiom/types';
import type { ApprovalEngine } from '../services/approval.js';
import type { KillSwitchService } from '../services/kill-switch.js';
import type { LedgerService } from '../services/ledger.js';
import type { RealtimeService } from '../services/realtime.js';
import type { Variables } from '../types.js';
import { createSupabaseAdmin } from '@axiom/supabase';
import { logger } from '../lib/logger.js';
import { randomUUID } from 'node:crypto';

interface Deps {
  approvalEngine: ApprovalEngine;
  killSwitch: KillSwitchService;
  ledger: LedgerService;
  realtime: RealtimeService;
}

export function v1Routes(deps: Deps) {
  const app = new Hono<{ Variables: Variables }>();

  // ─── Plans / Approval / Execution ───────────────────────────────

  // POST /v1/plans/approve — issue a signed approval token
  app.post('/plans/approve', async (c) => {
    if (deps.killSwitch.isActive()) {
      return c.json(
        { error: { code: 'kill_switch_active', message: 'Kill switch is engaged' } },
        423,
      );
    }
    const body = await c.req.json().catch(() => null);
    const parsed = IssueApprovalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: { code: 'validation_failed', message: 'Invalid request', details: parsed.error.flatten() } },
        400,
      );
    }

    const input = parsed.data;
    const tenantId = c.get('tenantId');
    const user = c.get('user');
    const role = c.get('role');

    if (!['owner', 'admin', 'approver'].includes(role)) {
      return c.json(
        { error: { code: 'role_forbidden', message: 'Only owners, admins, and approvers can issue approval tokens' } },
        403,
      );
    }

    const admin = createSupabaseAdmin();

    // Verify plan + actions exist and belong to the tenant
    const { data: plan, error: planErr } = await admin
      .from('remediation_plans')
      .select('id, status, library_version, tenant_id')
      .eq('id', input.planId)
      .eq('tenant_id', tenantId)
      .single();
    if (planErr || !plan) {
      return c.json({ error: { code: 'plan_not_found', message: 'Plan not found' } }, 404);
    }

    const { data: actions, error: actErr } = await admin
      .from('remediation_actions')
      .select('id, dry_run_status, rollback_validated, dry_run_expires_at')
      .eq('plan_id', input.planId)
      .in('id', input.actionIds);
    if (actErr) {
      return c.json({ error: { code: 'lookup_failed', message: actErr.message } }, 500);
    }

    // Hard gate: every action must have a successful dry-run and a
    // validated rollback. Per Doc 04 §4.3 / BR-2 — no approval
    // without both. Per-action check, not just plan-level.
    const ineligible = (actions ?? []).filter(
      (a) => a.dry_run_status !== 'dry_run_complete' || !a.rollback_validated,
    );
    if (ineligible.length > 0) {
      return c.json(
        {
          error: {
            code: 'actions_ineligible',
            message: `${ineligible.length} action(s) are not eligible for approval (need dry-run + validated rollback)`,
            details: { ineligible: ineligible.map((a) => a.id) },
          },
        },
        422,
      );
    }

    // Stale dry-run check
    const now = Date.now();
    const stale = (actions ?? []).filter(
      (a) => a.dry_run_expires_at && new Date(a.dry_run_expires_at).getTime() < now,
    );
    if (stale.length > 0) {
      return c.json(
        {
          error: {
            code: 'dry_run_expired',
            message: 'Dry-runs have expired; please re-run before approving',
            details: { expired: stale.map((a) => a.id) },
          },
        },
        422,
      );
    }

    // Issue the signed token
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString();
    const signed = await deps.approvalEngine.issue(tenantId, {
      planId: input.planId,
      actionIds: input.actionIds,
      approverId: user.id,
      mode: input.mode,
      concurrency: input.concurrency,
      stopOnFailure: input.stopOnFailure,
      expiresAt,
    });

    // Persist the token
    const { data: tokenRow, error: tokenErr } = await admin
      .from('approval_tokens')
      .insert({
        tenant_id: tenantId,
        plan_id: input.planId,
        action_ids: input.actionIds,
        approver_id: user.id,
        mode: input.mode,
        concurrency: input.concurrency,
        stop_on_failure: input.stopOnFailure,
        signature: signed.signature,
        signed_payload: signed.spec as any,
        nonce: signed.spec.nonce,
        expires_at: expiresAt,
        reason: input.reason ?? null,
        conditions: input.conditions,
      })
      .select('id, expires_at')
      .single();
    if (tokenErr || !tokenRow) {
      logger.error({ err: tokenErr?.message }, 'failed to persist approval token');
      return c.json(
        { error: { code: 'persistence_failed', message: 'Could not persist approval token' } },
        500,
      );
    }

    // Mark actions as approved
    await admin
      .from('remediation_actions')
      .update({
        approval_status: 'approved',
        approval_token_id: tokenRow.id,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .in('id', input.actionIds);

    // Ledger
    const correlationId = randomUUID();
    await deps.ledger.append({
      tenantId,
      correlationId,
      actorType: 'human',
      actorId: user.id,
      actionType: 'approval.token.issued',
      targetRef: input.planId,
      approvalTokenId: tokenRow.id,
      approverId: user.id,
      result: 'success',
      detail: {
        actionIds: input.actionIds,
        mode: input.mode,
        concurrency: input.concurrency,
        stopOnFailure: input.stopOnFailure,
        expiresAt,
        reason: input.reason,
      },
    });

    deps.realtime.broadcast({
      type: 'approval.pending',
      planId: input.planId,
      actionIds: input.actionIds,
      correlationId,
      occurredAt: new Date().toISOString(),
    });

    return c.json(
      {
        approvalTokenId: tokenRow.id,
        expiresAt: tokenRow.expires_at,
        // The actual token — sent to the client. The client must
        // present it in the execute call.
        token: signed,
      },
      201,
    );
  });

  // POST /v1/plans/:id/reject — reject the plan
  app.post('/plans/:id/reject', async (c) => {
    if (deps.killSwitch.isActive()) {
      return c.json({ error: { code: 'kill_switch_active', message: 'Kill switch is engaged' } }, 423);
    }
    const planId = c.req.param('id');
    const tenantId = c.get('tenantId');
    const user = c.get('user');
    const role = c.get('role');

    if (!['owner', 'admin', 'approver'].includes(role)) {
      return c.json({ error: { code: 'role_forbidden', message: 'Only owners/admins/approvers can reject' } }, 403);
    }

    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('remediation_plans')
      .update({ status: 'cancelled' })
      .eq('id', planId)
      .eq('tenant_id', tenantId);
    if (error) {
      return c.json({ error: { code: 'update_failed', message: error.message } }, 500);
    }
    await admin
      .from('remediation_actions')
      .update({ approval_status: 'skipped', final_outcome: 'skipped' })
      .eq('plan_id', planId)
      .eq('approval_status', 'draft');

    await deps.ledger.append({
      tenantId,
      correlationId: randomUUID(),
      actorType: 'human',
      actorId: user.id,
      actionType: 'approval.token.invalid',
      targetRef: planId,
      result: 'success',
      detail: { reason: 'plan rejected by approver' },
    });

    return c.json({ ok: true });
  });

  // POST /v1/plans/:id/execute — THE EXECUTION GATE
  // Per ADR-2 / BR-1: no mutating action executes without a valid
  // approval token. The token is validated per-action.
  app.post('/plans/:id/execute', async (c) => {
    if (deps.killSwitch.isActive()) {
      return c.json({ error: { code: 'kill_switch_active', message: 'Kill switch is engaged' } }, 423);
    }

    const planId = c.req.param('id');
    const tenantId = c.get('tenantId');
    const user = c.get('user');
    const body = await c.req.json().catch(() => null);
    const parsed = ExecutePlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: { code: 'validation_failed', message: 'Invalid execute request', details: parsed.error.flatten() } },
        400,
      );
    }
    const input: ExecutePlanRequest = parsed.data;

    if (input.planId !== planId) {
      return c.json(
        { error: { code: 'plan_id_mismatch', message: 'Plan ID in URL and body differ' } },
        400,
      );
    }

    // Verify the token
    let signedToken;
    try {
      signedToken = JSON.parse(input.approvalToken);
    } catch {
      return c.json(
        { error: { code: 'token_malformed', message: 'approvalToken is not valid JSON' } },
        400,
      );
    }

    const verification = await deps.approvalEngine.verify(tenantId, signedToken);
    if (!verification.valid) {
      return c.json(
        { error: { code: 'token_invalid', message: `Token validation failed: ${verification.reason}` } },
        403,
      );
    }

    if (signedToken.spec.planId !== planId) {
      return c.json(
        { error: { code: 'token_plan_mismatch', message: 'Token was not issued for this plan' } },
        403,
      );
    }

    const admin = createSupabaseAdmin();

    // Per-action validation
    const accepted: string[] = [];
    const rejected: Array<{ actionId: string; reason: string }> = [];
    for (const actionId of input.actionIds) {
      if (!deps.approvalEngine.isActionCovered(signedToken, actionId)) {
        rejected.push({ actionId, reason: 'action_not_in_token_scope' });
        continue;
      }
      // Fetch the action row
      const { data: action } = await admin
        .from('remediation_actions')
        .select('id, plan_id, approval_status, dry_run_status, rollback_validated, idempotency_key')
        .eq('id', actionId)
        .single();
      if (!action || action.plan_id !== planId) {
        rejected.push({ actionId, reason: 'action_not_found' });
        continue;
      }
      if (action.approval_status !== 'approved') {
        rejected.push({ actionId, reason: 'action_not_approved' });
        continue;
      }
      if (action.dry_run_status !== 'dry_run_complete' || !action.rollback_validated) {
        rejected.push({ actionId, reason: 'action_not_ready' });
        continue;
      }
      // Idempotency: if this action already has an idempotency_key and
      // it's the same as the request, treat it as already-executed.
      if (action.idempotency_key === c.get('idempotencyKey')) {
        accepted.push(actionId);
        continue;
      }
      accepted.push(actionId);
    }

    // Mark accepted actions as executing + record idempotency key
    if (accepted.length > 0) {
      await admin
        .from('remediation_actions')
        .update({
          execution_status: 'executing',
          idempotency_key: c.get('idempotencyKey'),
        })
        .in('id', accepted);
    }

    const correlationId = randomUUID();
    await deps.ledger.append({
      tenantId,
      correlationId,
      actorType: 'human',
      actorId: user.id,
      actionType: 'execution.started',
      targetRef: planId,
      result: rejected.length === 0 ? 'success' : 'skipped',
      detail: {
        accepted: accepted.length,
        rejected: rejected.length,
        mode: input.mode,
        concurrency: input.concurrency,
      },
    });

    // Enqueue to the agent runtime (Phase 3+). For Phase 0/1, we
    // immediately mark the actions as succeeded (advisory only) and
    // surface the plan via the realtime channel so the workbench
    // shows the lifecycle.
    if (accepted.length > 0 && process.env.AGENT_RUNTIME_URL) {
      try {
        await fetch(`${process.env.AGENT_RUNTIME_URL}/internal/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': process.env.AGENT_RUNTIME_INTERNAL_TOKEN ?? '',
          },
          body: JSON.stringify({
            tenantId,
            planId,
            correlationId,
            actionIds: accepted,
            mode: input.mode,
            concurrency: input.concurrency,
            stopOnFailure: input.stopOnFailure,
            approvalToken: signedToken,
          }),
        });
      } catch (err) {
        logger.error({ err }, 'failed to enqueue execution to agent runtime');
      }
    }

    deps.approvalEngine.markNonceUsed(signedToken.spec.nonce);

    const status =
      rejected.length === 0 ? 'accepted' : accepted.length === 0 ? 'rejected' : 'partial';

    return c.json(
      {
        executionId: randomUUID(),
        correlationId,
        acceptedActionIds: accepted,
        rejectedActionIds: rejected,
        status,
        startedAt: new Date().toISOString(),
      },
      status === 'rejected' ? 422 : 202,
    );
  });

  // ─── Kill switch ─────────────────────────────────────────────────

  app.post('/kill-switch/engage', async (c) => {
    if (c.get('role') !== 'founder' && c.get('role') !== 'admin' && c.get('role') !== 'owner') {
      return c.json({ error: { code: 'role_forbidden', message: 'Only founders/owners can engage the kill switch' } }, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    const reason = (body as any)?.reason ?? 'manual engagement';
    const scope = (body as any)?.scope ?? 'global';
    deps.killSwitch.engage({ tenantId: c.get('tenantId'), userId: c.get('user').id, reason, scope });
    await deps.ledger.append({
      tenantId: c.get('tenantId'),
      correlationId: randomUUID(),
      actorType: 'human',
      actorId: c.get('user').id,
      actionType: 'execution.kill_switch.engaged',
      result: 'success',
      detail: { reason, scope },
    });
    return c.json({ engaged: true, scope, reason });
  });

  app.post('/kill-switch/release', async (c) => {
    deps.killSwitch.release();
    await deps.ledger.append({
      tenantId: c.get('tenantId'),
      correlationId: randomUUID(),
      actorType: 'human',
      actorId: c.get('user').id,
      actionType: 'execution.kill_switch.engaged',
      result: 'success',
      detail: { action: 'released' },
    });
    return c.json({ engaged: false });
  });

  app.get('/kill-switch/status', (c) => {
    return c.json({ engaged: deps.killSwitch.isActive() });
  });

  // ─── Ledger ──────────────────────────────────────────────────────

  app.post('/ledger/verify', async (c) => {
    const tenantId = c.get('tenantId');
    const result = await deps.ledger.verify(tenantId);
    return c.json(result);
  });

  app.get('/ledger', async (c) => {
    const tenantId = c.get('tenantId');
    const limit = Math.min(Number(c.req.query('limit') ?? 100), 1000);
    const entries = await deps.ledger.query({ tenantId, limit });
    return c.json({ entries, count: entries.length });
  });

  // ─── Engagements / Plans / Findings queries ──────────────────────

  app.get('/engagements', async (c) => {
    const admin = createSupabaseAdmin();
    const tenantId = c.get('tenantId');
    const { data } = await admin
      .from('engagements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false });
    return c.json({ engagements: data ?? [] });
  });

  app.get('/engagements/:id', async (c) => {
    const admin = createSupabaseAdmin();
    const id = c.req.param('id');
    const tenantId = c.get('tenantId');
    const { data, error } = await admin
      .from('engagements')
      .select('*, findings(*), remediation_plans(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error) return c.json({ error: { code: 'not_found', message: error.message } }, 404);
    return c.json(data);
  });

  app.get('/plans/:id', async (c) => {
    const admin = createSupabaseAdmin();
    const id = c.req.param('id');
    const tenantId = c.get('tenantId');
    const { data, error } = await admin
      .from('remediation_plans')
      .select('*, remediation_actions(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error) return c.json({ error: { code: 'not_found', message: error.message } }, 404);
    return c.json(data);
  });

  app.post('/engagements', async (c) => {
    if (!['owner', 'admin', 'reviewer'].includes(c.get('role'))) {
      return c.json({ error: { code: 'role_forbidden', message: 'Only owners/admins/reviewers' } }, 403);
    }
    const body = await c.req.json();
    const Schema = z.object({
      libraryVersion: z.string(),
      title: z.string().min(3).max(200),
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'validation_failed', details: parsed.error.flatten() } }, 400);
    }
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('engagements')
      .insert({
        tenant_id: c.get('tenantId'),
        library_version: parsed.data.libraryVersion,
        title: parsed.data.title,
        lead_reviewer_id: c.get('user').id,
        status: 'intake',
      })
      .select()
      .single();
    if (error) return c.json({ error: { code: 'persistence_failed', message: error.message } }, 500);
    return c.json(data, 201);
  });

  return app;
}
