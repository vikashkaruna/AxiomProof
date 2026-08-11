-- ─────────────────────────────────────────────────────────────────────
-- 0002_control_library.sql
-- Versioned DPDPA control catalogue. Once a version is published, its
-- contents are immutable. New versions are additive (existing rows are
-- never UPDATEd, only superseded by a newer version row).
-- ─────────────────────────────────────────────────────────────────────

create type control_domain as enum (
  'GOV', 'CNS', 'DAT', 'RCD', 'BRCH', 'XBR', 'CHD',
  'SDF', 'SEC', 'RTN', 'DPF', 'AUD', 'DPIA'
);

create type control_severity as enum ('critical', 'high', 'medium', 'low');

create type evidence_type as enum (
  'document', 'config', 'screenshot', 'log',
  'attestation', 'interview', 'inventory', 'report'
);

create type remediation_pattern as enum (
  'policy', 'consent', 'config', 'data-deletion', 'data-masking',
  'data-portability', 'dpo-appointment', 'dpa-execution',
  'breach-process', 'training', 'discovery', 'vendor-risk',
  'review', 'reporting'
);

-- A version row — the publication event
create table public.control_libraries (
  version text primary key, -- semver e.g. '0.1.0'
  published_at timestamptz not null,
  published_by text not null, -- human name or 'founder'
  change_log text not null,
  control_count integer not null,
  is_current boolean not null default false, -- latest published
  created_at timestamptz not null default now()
);

-- Only one version can be 'current'
create unique index uniq_control_libraries_current
  on public.control_libraries (is_current)
  where is_current = true;

-- A control at a specific library version
create table public.controls (
  id text not null,                       -- e.g. 'DPDPA-CNS-001'
  library_version text not null references public.control_libraries(version) on delete restrict,
  title text not null,
  obligation text not null,
  domain control_domain not null,
  severity control_severity not null,
  citations jsonb not null,               -- [{instrument, reference, url?}]
  evidence_required jsonb not null,       -- [{type, description, retention?}]
  assessment_questions jsonb not null,    -- AssessmentQuestion[]
  scoring jsonb not null,                 -- {baseline, weight, penaltyPoints, maxPenaltyINR}
  remediation_patterns remediation_pattern[] not null,
  tags text[] not null default '{}',
  sdf_only boolean not null default false,
  children_only boolean not null default false,
  introduced_in_version text not null,
  revised_in_version text,
  notes text,
  created_at timestamptz not null default now(),
  primary key (id, library_version)
);

create index idx_controls_domain on public.controls(domain);
create index idx_controls_severity on public.controls(severity);
create index idx_controls_library_version on public.controls(library_version);
create index idx_controls_tags on public.controls using gin(tags);

-- RLS
alter table public.control_libraries enable row level security;
alter table public.controls enable row level security;

-- Control library is reference data — readable by all authenticated users
-- Axiom internal users manage it.
create policy "control_libraries_read_all" on public.control_libraries
  for select using (auth.role() = 'authenticated');

create policy "control_libraries_write_axiom" on public.control_libraries
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "controls_read_all" on public.controls
  for select using (auth.role() = 'authenticated');

create policy "controls_write_axiom" on public.controls
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Once a control row exists, it's immutable (insert-only via version).
create or replace function public.controls_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Controls are immutable; publish a new library version instead.';
  end if;
  return new;
end;
$$;

create trigger trg_controls_immutable
  before update on public.controls
  for each row execute function public.controls_immutable();
