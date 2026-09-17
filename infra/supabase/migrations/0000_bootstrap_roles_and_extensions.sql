-- ==============================================================================
-- Axiom Proof — Cloud SQL PostgreSQL Bootstrap
-- 0000_bootstrap_roles_and_extensions.sql
-- Initializes sovereign roles & required cryptographic extensions on vanilla
-- Cloud SQL PostgreSQL instances before subsequent migrations.
-- ==============================================================================

-- 1. Cryptographic Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 2. Sovereign Roles (idempotent creation)
do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'authenticator') then
    create role authenticator nologin noinherit;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'ledger_writer') then
    create role ledger_writer nologin;
  end if;
end $$;

-- 3. Grants
grant anon to authenticator;
grant authenticated to authenticator;
grant service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role, ledger_writer;

-- 4. Auth Schema Bootstrap (Idempotent for vanilla Cloud SQL / onprem PostgreSQL)
create schema if not exists auth;

create table if not exists auth.users (
  instance_id uuid default '00000000-0000-0000-0000-000000000000'::uuid,
  id uuid primary key default gen_random_uuid(),
  aud varchar(255) default 'authenticated',
  role varchar(255) default 'authenticated',
  email varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz default now(),
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz default now(),
  raw_app_meta_data jsonb default '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_super_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth.identities (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null default '{}'::jsonb,
  provider text not null default 'email',
  provider_id text,
  last_sign_in_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (provider, id)
);

grant usage on schema auth to anon, authenticated, service_role, ledger_writer;
grant all on all tables in schema auth to anon, authenticated, service_role, ledger_writer;
grant all on all sequences in schema auth to anon, authenticated, service_role, ledger_writer;
alter default privileges in schema auth grant all on tables to anon, authenticated, service_role, ledger_writer;

