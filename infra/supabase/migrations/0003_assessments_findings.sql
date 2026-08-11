-- ─────────────────────────────────────────────────────────────────────
-- 0003_assessments_findings.sql
-- Assessment engagements, Parikshan findings, Saakshi evidence.
-- The assessment-to-finding-to-evidence chain is the read-side of the
-- platform; mutating actions live in 0004/0005.
-- ─────────────────────────────────────────────────────────────────────

create type assessment_status as enum (
  'intake', 'in_progress', 'review', 'completed', 'cancelled'
);

create type finding_status as enum (
  'open',         -- gap identified, no remediation yet
  'planned',      -- Sudhaar has produced an action
  'in_remediation', -- action in progress
  'closed',       -- verified closed
  'accepted_risk' -- human accepted the risk in writing
);

create type evidence_link_type as enum (
  'demonstrates',   -- this evidence proves this control
  'partial',        -- partial evidence, more needed
  'supersedes'      -- newer evidence overrides older
);

-- An assessment engagement: a (tenant, library_version) assessment run
create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  library_version text not null references public.control_libraries(version) on delete restrict,
  title text not null,
  status engagement_status not null default 'intake',
  -- Overall posture (0–100). Recomputed by Parikshan.
  posture_score numeric(5,2) check (posture_score between 0 and 100),
  -- Estimated max statutory exposure (INR)
  estimated_exposure_inr bigint check (estimated_exposure_inr >= 0),
  -- Founder / assigned reviewer
  lead_reviewer_id uuid references public.users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_engagements_tenant on public.engagements(tenant_id);
create index idx_engagements_status on public.engagements(status);

-- Findings — one per (engagement, control). The shape of a finding.
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  control_id text not null,
  library_version text not null,
  -- The assessment outcome
  status finding_status not null default 'open',
  -- 0–100; closer to 100 = fully compliant
  score numeric(5,2) not null check (score between 0 and 100),
  -- Risk-weighted penalty points (mirrors control.scoring.penaltyPoints × (1 − score/100))
  risk_points numeric(7,2) not null check (risk_points >= 0),
  -- Human-readable rationale + cited evidence
  rationale text not null,
  -- Cited evidence IDs (Saakshi artifacts)
  evidence_ids uuid[] not null default '{}',
  -- Assessment answers (question id → answer)
  answers jsonb not null default '{}'::jsonb,
  -- Review metadata
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (engagement_id, control_id, library_version),
  foreign key (control_id, library_version) references public.controls(id, library_version) on delete restrict
);

create index idx_findings_tenant on public.findings(tenant_id);
create index idx_findings_engagement on public.findings(engagement_id);
create index idx_findings_control on public.findings(control_id);
create index idx_findings_status on public.findings(status);

-- Evidence — Saakshi's sealed artifacts. Content-addressed.
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  -- SHA-256 of the artifact content; the canonical identifier
  content_hash text not null check (length(content_hash) = 64),
  -- Pointer to S3 object (with object-lock WORM retention)
  storage_uri text not null,
  -- Original filename
  filename text,
  mime_type text,
  byte_size bigint check (byte_size >= 0),
  -- What kind of evidence (see enum)
  evidence_type evidence_type not null,
  -- Free-text description
  description text,
  -- Collecting agent
  collected_by_agent text not null,
  collected_at timestamptz not null default now(),
  -- Controls this evidence demonstrates (cross-link)
  demonstrates_control_ids text[] not null default '{}',
  -- Optional WORM lock until (set by retention policy)
  worm_lock_until timestamptz,
  created_at timestamptz not null default now(),
  -- The same content is unique per tenant (we deduplicate by content hash)
  unique (tenant_id, content_hash)
);

create index idx_evidence_tenant on public.evidence(tenant_id);
create index idx_evidence_engagement on public.evidence(engagement_id);
create index idx_evidence_content_hash on public.evidence(content_hash);
create index idx_evidence_demonstrates on public.evidence using gin(demonstrates_control_ids);

-- Finding ↔ Evidence linkage (many-to-many with provenance)
create table public.finding_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  finding_id uuid not null references public.findings(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  link_type evidence_link_type not null default 'demonstrates',
  note text,
  created_at timestamptz not null default now(),
  unique (finding_id, evidence_id)
);

create index idx_finding_evidence_tenant on public.finding_evidence(tenant_id);
create index idx_finding_evidence_finding on public.finding_evidence(finding_id);
create index idx_finding_evidence_evidence on public.finding_evidence(evidence_id);

-- RLS
alter table public.engagements enable row level security;
alter table public.findings enable row level security;
alter table public.evidence enable row level security;
alter table public.finding_evidence enable row level security;

-- Engagements: tenant members can read; approver+ can write
create policy "engagements_select_member" on public.engagements
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "engagements_modify_reviewer_or_axiom" on public.engagements
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Findings: same as engagements
create policy "findings_select_member" on public.findings
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "findings_modify_reviewer_or_axiom" on public.findings
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Evidence: read for all members; write by agents and reviewers
create policy "evidence_select_member" on public.evidence
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "evidence_insert_reviewer_or_axiom" on public.evidence
  for insert with check (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver', 'agent']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Evidence is append-only from a content perspective, but the DB row can
-- be updated for metadata. We add an additional trigger: you cannot
-- UPDATE the content_hash or storage_uri once written.
create or replace function public.evidence_content_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.content_hash is distinct from old.content_hash then
      raise exception 'evidence.content_hash is immutable; create a new evidence row instead';
    end if;
    if new.storage_uri is distinct from old.storage_uri then
      raise exception 'evidence.storage_uri is immutable; create a new evidence row instead';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_evidence_content_immutable
  before update on public.evidence
  for each row execute function public.evidence_content_immutable();

create policy "finding_evidence_select_member" on public.finding_evidence
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "finding_evidence_modify_reviewer_or_axiom" on public.finding_evidence
  for all using (
    public.has_role(array['owner', 'admin', 'reviewer', 'approver', 'agent']::user_role[])
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );
