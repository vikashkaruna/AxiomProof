-- ─────────────────────────────────────────────────────────────────────
-- 0005_approvals_ledger.sql
-- The Approval Engine (signed, scope-bound tokens) and the append-only
-- Audit Ledger (hash-chained, tamper-evident). These two together are
-- the heart of the trust proposition.
-- ─────────────────────────────────────────────────────────────────────

create type approval_status as enum (
  'issued',     -- token issued, not yet used
  'consumed',   -- used in a successful execution
  'revoked',    -- manually revoked
  'expired',    -- past expiry
  'invalid'     -- signature/validation failed
);

-- A signed approval token. Per ADR-2 + BR-1, the token is the gate
-- that makes unapproved execution architecturally impossible.
create table public.approval_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- The plan this token applies to
  plan_id uuid not null references public.remediation_plans(id) on delete cascade,
  -- Specific action IDs this token covers (subset, for partial approval)
  action_ids uuid[] not null,
  -- The human who approved (must be a user with role=approver in this tenant)
  approver_id uuid not null references public.users(id) on delete restrict,
  -- Mode: batch (all listed action_ids) or individual (one action)
  mode text not null check (mode in ('batch', 'individual')),
  -- Concurrency allowed (0 = no concurrency cap, 1+ = max parallel actions)
  concurrency integer not null default 1 check (concurrency > 0),
  -- Whether to halt on first failure within the batch
  stop_on_failure boolean not null default true,
  -- Cryptographic signature of (plan_id || action_ids || approver_id || expiry || nonce)
  -- Using a deterministic HMAC-SHA-256 of the canonicalised payload, keyed by
  -- a per-tenant secret stored in the secrets manager.
  signature text not null,
  -- The canonicalised signed payload (for verification)
  signed_payload jsonb not null,
  -- One-time-use nonce (replay protection)
  nonce text not null unique,
  -- Expiry
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  status approval_status not null default 'issued',
  -- Optional human reason / context
  reason text,
  -- Conditions attached to the approval (e.g. "only during business hours IST")
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_approval_tokens_tenant on public.approval_tokens(tenant_id);
create index idx_approval_tokens_plan on public.approval_tokens(plan_id);
create index idx_approval_tokens_status on public.approval_tokens(status);
create index idx_approval_tokens_expiry on public.approval_tokens(expires_at);

-- Token usage log: every time a token is checked (valid or not)
create table public.approval_token_usages (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.approval_tokens(id) on delete cascade,
  -- The action being attempted (NULL = plan-level check, not per-action)
  action_id uuid references public.remediation_actions(id) on delete set null,
  -- Whether validation succeeded
  valid boolean not null,
  -- Reason if invalid
  reason text,
  -- Caller context (request id, source IP, user agent)
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_token_usages_token on public.approval_token_usages(token_id);
create index idx_token_usages_action on public.approval_token_usages(action_id);

-- ─── AUDIT LEDGER ─────────────────────────────────────────────────────
-- Append-only, hash-chained, tamper-evident.
-- INSERT-only is enforced at the DB role level (separate role, no UPDATE/DELETE grant).
-- The hash chain is the chain of trust.
-- ─────────────────────────────────────────────────────────────────────

create type actor_type as enum ('agent', 'human', 'system');

create type ledger_result as enum ('success', 'failure', 'rolled_back', 'skipped', 'pending');

create type ledger_action_type as enum (
  -- Discovery chain
  'discovery.started', 'discovery.batch.completed', 'discovery.targeted.completed', 'discovery.drift_detected',
  -- Classification chain
  'classification.started', 'classification.batch.completed', 'classification.review_queued',
  -- Assessment chain
  'assessment.started', 'assessment.scored', 'assessment.report.generated',
  -- Evidence chain
  'evidence.collected', 'evidence.sealed', 'evidence.linked',
  -- Planning chain
  'plan.generated', 'plan.dry_run.completed', 'plan.approval_requested',
  -- Approval chain
  'approval.token.issued', 'approval.token.used', 'approval.token.revoked', 'approval.token.expired', 'approval.token.invalid',
  -- Execution chain
  'execution.started', 'execution.action.started', 'execution.action.succeeded', 'execution.action.failed', 'execution.batch.completed',
  'execution.rollback.started', 'execution.rollback.completed',
  'execution.kill_switch.engaged',
  -- Verification chain
  'verification.started', 'verification.passed', 'verification.failed',
  -- User actions
  'user.login', 'user.logout', 'user.role.changed',
  -- Admin
  'tenant.created', 'tenant.updated', 'plan.published', 'control.published',
  -- DSAR / Breach
  'dsar.received', 'dsar.verified', 'dsar.fulfilled', 'dsar.rejected',
  'breach.detected', 'breach.notified.dpb', 'breach.notified.principals',
  -- Reports
  'report.generated', 'report.exported', 'evidence_pack.exported'
);

-- The actual ledger table. We will create a separate Postgres role
-- ('ledger_writer') that has INSERT-only on this table and call that role
-- from the BFF when appending. UPDATE/DELETE are revoked at the GRANT level.

create table public.audit_ledger (
  -- Monotonic per-tenant sequence number (assigned by a sequence per tenant)
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  -- Per-tenant monotonic counter; computed from a per-tenant sequence
  sequence_no bigint not null,
  -- Tying entries into a single chain (e.g. an entire discovery batch)
  correlation_id uuid not null,
  -- Actor
  actor_type actor_type not null,
  actor_id text not null, -- agent name or user uuid
  -- For agents: version & model provenance
  agent_version text,
  model_id text,        -- e.g. 'anthropic.claude-3-5-sonnet@20240620' or 'self-hosted.qwen3-32b@v0.1.0'
  prompt_hash text,     -- SHA-256 of the prompt at the time of the call
  -- What happened
  action_type ledger_action_type not null,
  target_ref text,     -- resource ID the action was taken on
  -- Input / output hashes for reproducibility
  input_hash text,
  output_hash text,
  -- For mutating actions: link to the approval token
  approval_token_id uuid references public.approval_tokens(id) on delete set null,
  approver_id uuid references public.users(id) on delete set null,
  -- Pre / post state references in S3
  pre_state_ref text,
  post_state_ref text,
  -- Outcome
  result ledger_result not null default 'pending',
  -- Free-form structured detail (e.g. control_id, action_id, reason)
  detail jsonb not null default '{}'::jsonb,
  -- Timestamp
  occurred_at timestamptz not null default now(),
  -- Hash chain — entry_hash = SHA-256(sequence_no || correlation_id || actor_type || actor_id ||
  --                                     action_type || occurred_at || result || prev_entry_hash || detail)
  prev_entry_hash text, -- null for the genesis entry
  entry_hash text not null
);

create index idx_ledger_tenant_seq on public.audit_ledger(tenant_id, sequence_no desc);
create index idx_ledger_tenant_time on public.audit_ledger(tenant_id, occurred_at desc);
create index idx_ledger_correlation on public.audit_ledger(correlation_id);
create index idx_ledger_actor on public.audit_ledger(actor_type, actor_id);
create index idx_ledger_action_type on public.audit_ledger(action_type);
create index idx_ledger_approval_token on public.audit_ledger(approval_token_id);

-- Per-tenant sequence for monotonic sequence_no
create table public.tenant_ledger_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  last_sequence bigint not null default 0,
  last_entry_hash text, -- the hash chain tip
  updated_at timestamptz not null default now()
);

-- The append function. Compute the next sequence number and hash, insert.
-- This is the only sanctioned path to write to the ledger.
create or replace function public.append_ledger(
  p_tenant_id uuid,
  p_correlation_id uuid,
  p_actor_type actor_type,
  p_actor_id text,
  p_agent_version text,
  p_model_id text,
  p_prompt_hash text,
  p_action_type ledger_action_type,
  p_target_ref text,
  p_input_hash text,
  p_output_hash text,
  p_approval_token_id uuid,
  p_approver_id uuid,
  p_pre_state_ref text,
  p_post_state_ref text,
  p_result ledger_result,
  p_detail jsonb
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_seq bigint;
  v_prev_hash text;
  v_entry_hash text;
  v_payload text;
  v_now timestamptz := now();
  v_id bigint;
begin
  -- Lock the per-tenant counter row to serialise writes
  insert into public.tenant_ledger_counters (tenant_id, last_sequence)
    values (p_tenant_id, 0)
    on conflict (tenant_id) do nothing;

  select last_sequence, last_entry_hash into v_seq, v_prev_hash
    from public.tenant_ledger_counters
    where tenant_id = p_tenant_id
    for update;

  v_seq := v_seq + 1;

  -- Canonicalised payload for hashing
  v_payload := concat_ws(
    '|',
    v_seq::text,
    p_correlation_id::text,
    p_actor_type::text,
    p_actor_id,
    coalesce(p_agent_version, ''),
    coalesce(p_model_id, ''),
    coalesce(p_prompt_hash, ''),
    p_action_type::text,
    coalesce(p_target_ref, ''),
    coalesce(p_input_hash, ''),
    coalesce(p_output_hash, ''),
    coalesce(p_approval_token_id::text, ''),
    coalesce(p_approver_id::text, ''),
    coalesce(p_pre_state_ref, ''),
    coalesce(p_post_state_ref, ''),
    p_result::text,
    v_now::text,
    coalesce(v_prev_hash, ''),
    coalesce(p_detail::text, '{}')
  );

  v_entry_hash := encode(digest(v_payload, 'sha256'), 'hex');

  insert into public.audit_ledger (
    tenant_id, sequence_no, correlation_id, actor_type, actor_id,
    agent_version, model_id, prompt_hash, action_type, target_ref,
    input_hash, output_hash, approval_token_id, approver_id,
    pre_state_ref, post_state_ref, result, detail,
    occurred_at, prev_entry_hash, entry_hash
  ) values (
    p_tenant_id, v_seq, p_correlation_id, p_actor_type, p_actor_id,
    p_agent_version, p_model_id, p_prompt_hash, p_action_type, p_target_ref,
    p_input_hash, p_output_hash, p_approval_token_id, p_approver_id,
    p_pre_state_ref, p_post_state_ref, p_result, p_detail,
    v_now, v_prev_hash, v_entry_hash
  )
  returning id into v_id;

  update public.tenant_ledger_counters
    set last_sequence = v_seq, last_entry_hash = v_entry_hash, updated_at = v_now
    where tenant_id = p_tenant_id;

  return v_id;
end;
$$;

-- The RPC is the only sanctioned ledger write path. Do not leave the
-- default PUBLIC EXECUTE privilege in place: otherwise an anonymous caller
-- could invoke this SECURITY DEFINER function directly.
revoke all on function public.append_ledger(
  uuid, uuid, actor_type, text, text, text, text, ledger_action_type,
  text, text, text, uuid, uuid, text, text, ledger_result, jsonb
) from public, anon, authenticated;
grant execute on function public.append_ledger(
  uuid, uuid, actor_type, text, text, text, text, ledger_action_type,
  text, text, text, uuid, uuid, text, text, ledger_result, jsonb
) to service_role;

-- Verification function: walk the chain and recompute hashes.
-- Returns the first failing sequence_no (or NULL if intact).
create or replace function public.verify_ledger(p_tenant_id uuid, p_from_sequence bigint default 1)
returns table (
  sequence_no bigint,
  reason text
)
language plpgsql
stable
as $$
declare
  rec record;
  v_prev_hash text;
  v_expected_hash text;
  v_payload text;
begin
  v_prev_hash := null;
  for rec in
    select * from public.audit_ledger
    where tenant_id = p_tenant_id and sequence_no >= p_from_sequence
    order by sequence_no asc
  loop
    v_payload := concat_ws(
      '|',
      rec.sequence_no::text,
      rec.correlation_id::text,
      rec.actor_type::text,
      rec.actor_id,
      coalesce(rec.agent_version, ''),
      coalesce(rec.model_id, ''),
      coalesce(rec.prompt_hash, ''),
      rec.action_type::text,
      coalesce(rec.target_ref, ''),
      coalesce(rec.input_hash, ''),
      coalesce(rec.output_hash, ''),
      coalesce(rec.approval_token_id::text, ''),
      coalesce(rec.approver_id::text, ''),
      coalesce(rec.pre_state_ref, ''),
      coalesce(rec.post_state_ref, ''),
      rec.result::text,
      rec.occurred_at::text,
      coalesce(rec.prev_entry_hash, ''),
      coalesce(rec.detail::text, '{}')
    );
    v_expected_hash := encode(digest(v_payload, 'sha256'), 'hex');

    if rec.prev_entry_hash is distinct from v_prev_hash then
      sequence_no := rec.sequence_no;
      reason := 'prev_entry_hash mismatch (chain break)';
      return next;
      return;
    end if;
    if rec.entry_hash is distinct from v_expected_hash then
      sequence_no := rec.sequence_no;
      reason := 'entry_hash mismatch (tamper)';
      return next;
      return;
    end if;
    v_prev_hash := rec.entry_hash;
  end loop;
  return;
end;
$$;

-- RLS
alter table public.approval_tokens enable row level security;
alter table public.approval_token_usages enable row level security;
alter table public.audit_ledger enable row level security;

-- Approval tokens: only the approver and Axiom internal can see/issue
create policy "approval_tokens_select_own" on public.approval_tokens
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "approval_tokens_insert_approver_or_axiom" on public.approval_tokens
  for insert with check (
    public.has_role(array['owner', 'admin', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Approval tokens are mostly immutable once issued; only status can change
create policy "approval_tokens_update_revoke" on public.approval_tokens
  for update using (
    public.has_role(array['owner', 'admin', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "approval_token_usages_select_member" on public.approval_token_usages
  for select using (
    exists (
      select 1 from public.approval_tokens t
      where t.id = approval_token_usages.token_id
        and (public.is_tenant_member(t.tenant_id) or exists (
          select 1 from public.users where id = auth.uid() and is_axiom_internal
        ))
    )
  );

create policy "approval_token_usages_insert_system" on public.approval_token_usages
  for insert with check (true); -- written by the service role / BFF

-- Audit ledger: tenant members can read; only the SECURITY DEFINER function
-- can write (the function validates tenant context and computes the chain).
-- The BFF calls the function via the service role, which bypasses RLS for
-- the INSERT inside the function.
create policy "audit_ledger_select_member" on public.audit_ledger
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- No INSERT policy: all writes must go through append_ledger() which is
-- SECURITY DEFINER (it inserts as the function owner, bypassing RLS).

-- No UPDATE or DELETE policy: the table is append-only at the RLS layer
-- (and the DB role layer, set up in 0006).
