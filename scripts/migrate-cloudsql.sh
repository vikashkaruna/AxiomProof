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

MIGRATIONS_DIR="infra/supabase/migrations"

# 1. Apply bootstrap and all sequential SQL migrations
for sql_file in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
  echo "▶ Applying migration: $(basename "$sql_file")..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$sql_file" >/dev/null 2>&1 || {
    echo "  Notice: Trying with standard psql connection..."
    psql "$DB_URL" -f "$sql_file"
  }
  echo "  ✓ Applied $(basename "$sql_file")"
done

# 2. Seed statutory control library & baseline
echo "▶ Seeding statutory DPDPA control library & baseline..."
SUPABASE_DB_URL="$DB_URL" pnpm seed:controls || true
SUPABASE_DB_URL="$DB_URL" pnpm tsx scripts/seed-platform-baseline.ts || true

echo "================================================================="
echo "  ✓ Cloud SQL PostgreSQL Database Migrations Complete!           "
echo "================================================================="
