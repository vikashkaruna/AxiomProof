-- ─────────────────────────────────────────────────────────────────────
-- 0006_ledger_role_and_extras.sql
-- Create a dedicated Postgres role for ledger writes (INSERT-only).
-- Plus: prompts, agent runs, DSARs, breaches, gap scans.
-- ─────────────────────────────────────────────────────────────────────

-- ─── Dedicated role for ledger writes (least privilege) ──────────────
-- The BFF (or any service that writes to the ledger) connects as this
-- role. It can only INSERT into audit_ledger, never UPDATE or DELETE.
-- The append_ledger() function is SECURITY DEFINER and runs as the
-- function owner (typically the migration-applier role), which has full
-- access; the BFF calls the function.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ledger_writer') then
    create role ledger_writer nologin;
  end if;
end$$;

grant usage on schema public to ledger_writer;
grant insert on public.audit_ledger to ledger_writer;
-- Explicitly REVOKE any future grant
revoke update, delete, truncate on public.audit_ledger from ledger_writer;
revoke update, delete, truncate on public.audit_ledger from public;

-- ─── Prompts (model gateway registry) ───────────────────────────────
-- Versioned, hash-tracked prompts. The audit ledger references
-- prompt_hash, so this is the source of truth for "what prompt produced
-- this action".

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  -- Stable identifier: "<agent>:<purpose>" e.g. "parikshan:assess_control"
  handle text not null,
  -- Human-readable name
  name text not null,
  -- The agent that owns this prompt
  agent text not null check (agent in (
    'drishti', 'vibhaag', 'parikshan', 'saakshi', 'sudhaar',
    'karya', 'lekha', 'nazar', 'prativedan', 'sanket'
  )),
  -- The version (semver)
  version text not null,
  -- The actual prompt body
  body text not null,
  -- SHA-256 of the body — what gets stored in the audit ledger
  body_hash text not null check (length(body_hash) = 64),
  -- Variables the prompt expects
  variables jsonb not null default '[]'::jsonb,
  -- Which model this prompt is paired with
  target_model text not null,
  -- Status
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  -- Active means this is the version to use for new runs
  activated_at timestamptz,
  retired_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  unique (handle, version)
);

create index idx_prompts_handle on public.prompts(handle);
create index idx_prompts_status on public.prompts(status);
create index idx_prompts_agent on public.prompts(agent);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  -- Snapshot of the body at the time the version was tagged
  body text not null,
  body_hash text not null,
  -- Recorded performance metrics for this version
  metrics jsonb not null default '{}'::jsonb,
  -- Roll-forward chain hash (each version references previous)
  prev_version_id uuid references public.prompt_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (prompt_id, body_hash)
);

-- RLS
alter table public.prompts enable row level security;
alter table public.prompt_versions enable row level security;

create policy "prompts_read_all" on public.prompts
  for select using (auth.role() = 'authenticated');

create policy "prompts_write_axiom" on public.prompts
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "prompt_versions_read_all" on public.prompt_versions
  for select using (auth.role() = 'authenticated');

create policy "prompt_versions_insert_axiom" on public.prompt_versions
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- ─── Agent runs ─────────────────────────────────────────────────────
-- One row per invocation of an agent, regardless of whether it's a
-- single call or a multi-step workflow. The audit ledger entries
-- reference this run for grouping.

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent text not null check (agent in (
    'drishti', 'vibhaag', 'parikshan', 'saakshi', 'sudhaar',
    'karya', 'lekha', 'nazar', 'prativedan', 'sanket'
  )),
  -- Optional engagement or plan context
  engagement_id uuid references public.engagements(id) on delete set null,
  plan_id uuid references public.remediation_plans(id) on delete set null,
  -- The prompt used
  prompt_id uuid references public.prompts(id) on delete set null,
  -- The model that was called
  model_id text,
  -- Lifecycle
  status text not null default 'queued' check (status in (
    'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out'
  )),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Token accounting
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  -- Cost in USD (computed at the gateway)
  cost_usd numeric(10,6),
  -- Latency
  latency_ms integer,
  -- Error info if failed
  error text,
  -- Correlation ID propagated to the ledger
  correlation_id uuid not null,
  -- Input/output (redacted) for reproducibility
  input_redacted_hash text,
  output_redacted_hash text,
  -- Whether PII redaction was applied before egress
  pii_redacted boolean not null default false,
  -- Free-form metadata
  metadata jsonb not null default '{}'::jsonb
);

create index idx_agent_runs_tenant on public.agent_runs(tenant_id);
create index idx_agent_runs_agent on public.agent_runs(agent);
create index idx_agent_runs_status on public.agent_runs(status);
create index idx_agent_runs_correlation on public.agent_runs(correlation_id);
create index idx_agent_runs_started on public.agent_runs(started_at desc);

alter table public.agent_runs enable row level security;

create policy "agent_runs_select_member" on public.agent_runs
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "agent_runs_insert_system" on public.agent_runs
  for insert with check (true); -- written by the BFF / agent runtime via service role

create policy "agent_runs_update_axiom" on public.agent_runs
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- ─── Gap scans (public funnel) ──────────────────────────────────────
-- Self-serve gap-scan responses, separate from full engagements so
-- the public funnel doesn't pollute client tenant data.

create table public.gap_scan_responses (
  id uuid primary key default gen_random_uuid(),
  -- Anonymous identifier (no PII captured for public scans)
  session_id text not null,
  -- Sector & size (helps aggregate reporting)
  sector text,
  employee_band text check (employee_band in ('1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+')),
  processes_children_data boolean,
  is_sdf boolean,
  -- The full set of answers
  answers jsonb not null default '{}'::jsonb,
  -- The auto-generated report
  report_snapshot jsonb,
  -- The control-library version used
  library_version text not null references public.control_libraries(version) on delete restrict,
  -- Computed posture & exposure
  posture_score numeric(5,2) check (posture_score between 0 and 100),
  estimated_exposure_inr bigint,
  -- Contact info if provided
  contact_name text,
  contact_email text,
  contact_company text,
  -- Whether a follow-up was requested
  follow_up_requested boolean not null default false,
  -- Marketing / consent
  marketing_consent boolean not null default false,
  -- Lead scoring (Sanket-style signal)
  lead_score integer check (lead_score between 0 and 100),
  -- Conversion status
  converted_to_engagement uuid references public.engagements(id) on delete set null,
  -- Source attribution
  source text, -- 'organic', 'partner:xyz', 'paid:abc', etc.
  -- Timestamps
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index idx_gap_scan_created on public.gap_scan_responses(created_at desc);
create index idx_gap_scan_library on public.gap_scan_responses(library_version);
create index idx_gap_scan_sector on public.gap_scan_responses(sector);
create index idx_gap_scan_follow_up on public.gap_scan_responses(follow_up_requested) where follow_up_requested = true;

alter table public.gap_scan_responses enable row level security;

-- Gap scans: only Axiom internal can read (they're marketing data, not
-- product data) — clients see their own gap scans only via the conversion
-- to a full engagement.
create policy "gap_scan_select_axiom" on public.gap_scan_responses
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Public gap scans can be inserted anonymously (no auth required)
create policy "gap_scan_insert_public" on public.gap_scan_responses
  for insert with check (auth.role() in ('anon', 'authenticated', 'service_role'));

-- ─── DSARs (Data Subject Access Requests) ───────────────────────────

create type dsar_status as enum (
  'received', 'identity_verification', 'in_fulfilment', 'completed', 'rejected', 'escalated'
);

create type dsar_kind as enum ('access', 'correction', 'erasure', 'nominate', 'portability');

create table public.dsars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind dsar_kind not null,
  status dsar_status not null default 'received',
  -- Data principal details (NOT the same as tenant users)
  data_principal_name text,
  data_principal_email text,
  data_principal_phone text,
  -- Identity verification status
  identity_verified boolean not null default false,
  identity_verification_method text,
  -- Statutory clock (Section 11, Rule 16 → typically 30 days)
  due_by timestamptz not null,
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Fulfillment artifact
  fulfillment_evidence_id uuid references public.evidence(id) on delete set null,
  -- Reason if rejected
  rejection_reason text,
  -- Assigned handler
  assigned_to uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dsars_tenant on public.dsars(tenant_id);
create index idx_dsars_status on public.dsars(status);
create index idx_dsars_due on public.dsars(due_by);

alter table public.dsars enable row level security;

create policy "dsars_select_member" on public.dsars
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "dsars_modify_reviewer_or_axiom" on public.dsars
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- ─── Breaches ───────────────────────────────────────────────────────

create type breach_severity as enum ('low', 'medium', 'high', 'critical');
create type breach_status as enum (
  'detected', 'triaging', 'contained', 'notifying_dpb',
  'notifying_principals', 'post_mortem', 'closed'
);

create table public.breaches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text not null,
  severity breach_severity not null,
  status breach_status not null default 'detected',
  -- Time the breach occurred (may be earlier than detection)
  occurred_at timestamptz,
  detected_at timestamptz not null default now(),
  -- Statutory 72-hour clock from awareness (Section 8(6))
  dpb_notification_due_by timestamptz not null,
  -- Affected data principal count
  affected_count integer check (affected_count >= 0),
  -- Categories of data affected
  data_categories text[] not null default '{}',
  -- Was DPB notified?
  dpb_notified_at timestamptz,
  dpb_reference text,
  -- Were principals notified?
  principals_notified_at timestamptz,
  -- Owner
  owner_id uuid references public.users(id),
  -- Forensic evidence (links to evidence table)
  forensic_evidence_ids uuid[] not null default '{}',
  -- Post-mortem
  post_mortem text,
  lessons_learned text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_breaches_tenant on public.breaches(tenant_id);
create index idx_breaches_status on public.breaches(status);
create index idx_breaches_due on public.breaches(dpb_notification_due_by);

alter table public.breaches enable row level security;

create policy "breaches_select_member" on public.breaches
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "breaches_modify_reviewer_or_axiom" on public.breaches
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- ─── Reports (Prativedan output) ────────────────────────────────────

create type report_kind as enum (
  'board', 'auditor', 'dpb', 'technical', 'gap_scan', 'evidence_pack', 'custom'
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete set null,
  kind report_kind not null,
  title text not null,
  -- Pointer to the rendered report (S3 + signed URL)
  storage_uri text not null,
  -- The structured payload (for re-rendering / exports)
  content jsonb not null,
  -- Library version referenced
  library_version text not null references public.control_libraries(version) on delete restrict,
  -- Who generated (always an agent)
  generated_by_agent text not null,
  generated_at timestamptz not null default now(),
  -- Reviewed by
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  -- Status: draft / approved / published
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_reports_tenant on public.reports(tenant_id);
create index idx_reports_engagement on public.reports(engagement_id);
create index idx_reports_kind on public.reports(kind);

alter table public.reports enable row level security;

create policy "reports_select_member" on public.reports
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "reports_modify_reviewer_or_axiom" on public.reports
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver', 'agent']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- ─── Compliance events (calendar-style reminders) ───────────────────

create table public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  -- When the event is due
  due_at timestamptz not null,
  -- Optional link to a control, finding, or plan
  control_id text,
  finding_id uuid references public.findings(id) on delete set null,
  plan_id uuid references public.remediation_plans(id) on delete set null,
  dsar_id uuid references public.dsars(id) on delete set null,
  breach_id uuid references public.breaches(id) on delete set null,
  -- Reminder configuration
  reminder_offsets_days integer[] not null default '{7, 1}',
  -- Status
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
  completed_at timestamptz,
  -- Reminders sent log
  reminders_sent jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_compliance_events_tenant on public.compliance_events(tenant_id);
create index idx_compliance_events_due on public.compliance_events(due_at);
create index idx_compliance_events_status on public.compliance_events(status);

alter table public.compliance_events enable row level security;

create policy "compliance_events_select_member" on public.compliance_events
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "compliance_events_modify_reviewer_or_axiom" on public.compliance_events
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );
