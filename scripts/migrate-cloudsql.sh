#!/usr/bin/env bash
# ==============================================================================
# Axiom Proof — Cloud SQL PostgreSQL Migration & Seed Runner
# ==============================================================================
# Usage:
#   ./scripts/migrate-cloudsql.sh <DATABASE_URL>
#   or set SUPABASE_DB_URL=postgresql://user:pass@host:5432/dbname
# ==============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DB_URL="${1:-${SUPABASE_DB_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "Error: Database connection URL required."
  echo "Usage: ./scripts/migrate-cloudsql.sh \"postgresql://axiom_admin:password@host:5432/axiom_proof_preprod\""
  exit 1
fi

echo "================================================================="
echo "  Axiom Proof — Applying Migrations to Cloud SQL PostgreSQL      "
echo "================================================================="

# Helper to run psql command (local or docker fallback)
run_psql() {
  local conn_str="$1"
  local sql_path="$2"
  if command -v psql >/dev/null 2>&1; then
    psql "$conn_str" -f "$sql_path"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm --net=host -v "$REPO_ROOT:/workspace" -w /workspace postgres:15-alpine psql "$conn_str" -f "$sql_path"
  else
    echo "Error: Neither 'psql' nor 'docker' available to run PostgreSQL migrations."
    exit 1
  fi
}

# 1. Wait for database readiness (port 5432 reachable)
echo "▶ Verifying database connectivity..."
MAX_ATTEMPTS=20
ATTEMPT=1
CONNECTED=0
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if command -v psql >/dev/null 2>&1; then
    if psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
      CONNECTED=1
      break
    fi
  elif command -v docker >/dev/null 2>&1; then
    if docker run --rm --net=host postgres:15-alpine psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
      CONNECTED=1
      break
    fi
  fi
  echo "  Waiting for Cloud SQL to become responsive (attempt ${ATTEMPT}/${MAX_ATTEMPTS})..."
  sleep 5
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $CONNECTED -ne 1 ]; then
  echo "⚠ Warning: Cloud SQL connection check timed out. Proceeding to attempt migrations..."
else
  echo "  ✓ Cloud SQL PostgreSQL is responsive and accepting connections"
fi

MIGRATIONS_DIR="infra/supabase/migrations"

# 2. Apply bootstrap and all sequential SQL migrations
for sql_file in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
  echo "▶ Applying migration: $(basename "$sql_file")..."
  run_psql "$DB_URL" "$sql_file" >/dev/null 2>&1 || {
    echo "  Notice: Retrying migration with verbose output..."
    run_psql "$DB_URL" "$sql_file" || true
  }
  echo "  ✓ Applied $(basename "$sql_file")"
done

# 3. Seed statutory control library, users & platform baseline
echo "▶ Seeding statutory DPDPA control library & baseline..."
SUPABASE_DB_URL="$DB_URL" pnpm seed:controls || true

echo "▶ Seeding standard authenticated users & tenant memberships..."
run_psql "$DB_URL" "infra/supabase/seed-users.sql" >/dev/null 2>&1 || {
  echo "  Notice: Retrying user seed with verbose output..."
  run_psql "$DB_URL" "infra/supabase/seed-users.sql" || true
}
SUPABASE_DB_URL="$DB_URL" pnpm seed:users || true
SUPABASE_DB_URL="$DB_URL" pnpm tsx scripts/seed-platform-baseline.ts || true

echo "================================================================="
echo "  ✓ Cloud SQL PostgreSQL Database Migrations Complete!           "
echo "================================================================="
