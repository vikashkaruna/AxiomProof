-- ─────────────────────────────────────────────────────────────────────
-- Axiom Proof — Initial schema
-- 0001_init_tenants_users.sql
-- Multi-tenant foundation with RLS-enforced tenancy at the database level
-- (not application filtering — ADR-8).
-- ─────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pgvector";

-- Custom types
create type user_role as enum (
  'owner',       -- Tenant owner (signed the contract)
  'admin',       -- Tenant admin
  'approver',    -- Can approve remediation actions
  'reviewer',    -- Can review agent outputs
  'viewer',      -- Read-only
  'agent',       -- Service account for an agent
  'partner',     -- Channel partner
  'founder'      -- Internal Axiom Minds founder/operator
);

create type tenant_tier as enum (
  'free',         -- Public gap-scan
  'essential',    -- Phase 1 retainer
  'growth',       -- Phase 2/3
  'enterprise'    -- Phase 4/5
);

create type engagement_status as enum (
  'intake',         -- Just created
  'discovery',      -- Drishti running
  'classification', -- Vibhaag running
  'assessment',     -- Parikshan running
  'planning',       -- Sudhaar generating plan
  'review',         -- Human review
  'dry_run',        -- Dry-run simulating actions
  'awaiting_approval', -- Plan presented for approval
  'executing',      -- Karya running
  'verifying',      -- Post-execution verification
  'closure',        -- Closing
  'completed',
  'paused',
  'cancelled'
);

-- Tenants — every client lives in one
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tier tenant_tier not null default 'essential',
  -- India data residency enforced at infra layer; this column is metadata
  data_residency_region text not null default 'ap-south-1' check (data_residency_region = 'ap-south-1'),
  -- For partner-led relationships
  partner_tenant_id uuid references public.tenants(id) on delete set null,
  -- DPDPA-specific metadata
  is_sdf boolean not null default false, -- Significant Data Fiduciary
  processes_children_data boolean not null default false,
  processes_health_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Users — every human who can log in
-- auth.users is owned by Supabase Auth; we mirror what we need here.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  -- A user may belong to multiple tenants (founder, partner, multi-tenant admin)
  -- but a tenant must have at least one owner. The mapping is in tenant_users.
  is_axiom_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tenant membership — many-to-many between users and tenants, with role
create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role user_role not null,
  -- Optional: scope of authority within tenant
  -- e.g. an approver may only approve certain action classes
  approval_scopes text[] not null default '{}',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, user_id)
);

-- Indexes
create index idx_tenant_users_tenant on public.tenant_users(tenant_id);
create index idx_tenant_users_user on public.tenant_users(user_id);

-- Helper: a function that returns the current tenant from the JWT.
-- We embed tenant_id in the auth JWT custom claims.
create or replace function public.current_tenant_id() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.tenant_id', true),
      (auth.jwt() ->> 'tenant_id')
    ),
    ''
  )::uuid;
$$;

-- Helper: roles in current tenant
create or replace function public.current_tenant_roles() returns user_role[]
language sql stable
as $$
  select coalesce(array_agg(role), '{}'::user_role[])
  from public.tenant_users
  where tenant_id = public.current_tenant_id()
    and user_id = auth.uid();
$$;

-- Helper: is the current user a member of the given tenant?
create or replace function public.is_tenant_member(check_tenant uuid) returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.tenant_users
    where tenant_id = check_tenant
      and user_id = auth.uid()
  );
$$;

-- Helper: does the current user have ANY of the given roles in current tenant?
create or replace function public.has_role(allowed_roles user_role[]) returns boolean
language sql stable
as $$
  select exists (
    select 1
    from unnest(public.current_tenant_roles()) as r
    where r = any(allowed_roles)
  );
$$;

-- RLS: every table that holds tenant data must have RLS enabled and
-- policies keyed on tenant_id. The application never relies on app-layer
-- filtering alone — this is the entire point of ADR-8.

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_users enable row level security;

-- Tenant visibility
create policy "tenants_select_member" on public.tenants
  for select using (
    -- Axiom internal users (founder / agents) see all tenants
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
    -- Tenant members see their own tenant
    or public.is_tenant_member(id)
    -- Public gap-scan can see tenant name for whitelabeling — none today
  );

create policy "tenants_insert_axiom_only" on public.tenants
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "tenants_update_axiom_or_owner" on public.tenants
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
    or public.has_role(array['owner']::user_role[])
  );

-- Users: see yourself + other tenant members
create policy "users_select_self_or_tenant_member" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.tenant_users me
      join public.tenant_users them on me.tenant_id = them.tenant_id
      where me.user_id = auth.uid() and them.user_id = users.id
    )
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "users_insert_self" on public.users
  for insert with check (id = auth.uid());

create policy "users_update_self_or_axiom" on public.users
  for update using (
    id = auth.uid()
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

-- Tenant membership
create policy "tenant_users_select_member" on public.tenant_users
  for select using (
    user_id = auth.uid()
    or public.is_tenant_member(tenant_id)
    or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );

create policy "tenant_users_modify_axiom_or_owner" on public.tenant_users
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
    or public.has_role(array['owner']::user_role[])
  );
