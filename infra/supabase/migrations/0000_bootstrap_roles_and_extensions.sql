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
