#!/usr/bin/env tsx
/**
 * ==============================================================================
 * Axiom Proof — Multi-Tenant User & Identity Provisioning Script
 * ==============================================================================
 * Seeds or synchronizes the standard user roster across Supabase Auth and
 * application tenancy tables.
 *
 * Usage:
 *   pnpm seed:users
 *   or tsx scripts/seed-users.ts
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '@axiom/config';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface TenantMembership {
  tenantId: string;
  role: 'owner' | 'admin' | 'approver' | 'reviewer' | 'viewer';
  approvalScopes: string[];
}

interface SeedUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  isAxiomInternal: boolean;
  tenants: TenantMembership[];
}

const SEED_USERS: SeedUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'founder@axiomminds.ai',
    password: 'Admin@12345678',
    fullName: 'Axiom Founder',
    isAxiomInternal: true,
    tenants: [
      {
        tenantId: '00000000-0000-0000-0000-000000000001', // Meridian Pay
        role: 'owner',
        approvalScopes: ['*'],
      },
      {
        tenantId: '00000000-0000-0000-0000-000000000002', // Aarogya Health
        role: 'owner',
        approvalScopes: ['*'],
      },
      {
        tenantId: '00000000-0000-0000-0000-000000000003', // Streamline SaaS
        role: 'owner',
        approvalScopes: ['*'],
      },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    email: 'dpo@meridianpay.com',
    password: 'Meridian@123456',
    fullName: 'Ravi Sharma (DPO)',
    isAxiomInternal: false,
    tenants: [
      {
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
        approvalScopes: ['discovery', 'assessment', 'remediation', 'approvals'],
      },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000020',
    email: 'auditor@aarogya.in',
    password: 'Aarogya@123456',
    fullName: 'Dr. Sunita Patel (Lead Auditor)',
    isAxiomInternal: false,
    tenants: [
      {
        tenantId: '00000000-0000-0000-0000-000000000002',
        role: 'reviewer',
        approvalScopes: ['assessment', 'reports', 'audit'],
      },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000030',
    email: 'security@streamline.io',
    password: 'Streamline@123456',
    fullName: 'Karan Malhotra (SecOps Lead)',
    isAxiomInternal: false,
    tenants: [
      {
        tenantId: '00000000-0000-0000-0000-000000000003',
        role: 'approver',
        approvalScopes: ['remediation', 'approvals'],
      },
    ],
  },
];

async function seedViaSupabaseAdmin(url: string, serviceKey: string) {
  console.log(`\n▶ Connecting to Supabase Auth Admin API at ${url}...`);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of SEED_USERS) {
    console.log(`\n  Checking user: ${user.email} (${user.id})...`);

    // 1. Check / Create / Update in Supabase Auth
    try {
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });

      if (!createError && createData?.user) {
        console.log(`  ✓ Created user in auth.users: ${user.email}`);
      } else if (createError) {
        // If user already exists, update password and metadata
        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
          password: user.password,
          user_metadata: { full_name: user.fullName },
          email_confirm: true,
        });

        if (!updateError) {
          console.log(`  ✓ Updated credentials for existing user: ${user.email}`);
        } else {
          console.warn(`  ⚠ Auth API notice for ${user.email}: ${updateError.message}`);
        }
      }
    } catch (authErr: any) {
      console.warn(`  ⚠ Supabase Auth Admin API error:`, authErr?.message || authErr);
    }

    // 2. Mirror into public.users
    try {
      const { error: userTableError } = await admin.from('users').upsert({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        is_axiom_internal: user.isAxiomInternal,
      });

      if (userTableError) {
        console.warn(`  ⚠ public.users error for ${user.email}:`, userTableError.message);
      } else {
        console.log(`  ✓ Synced public.users record for ${user.email}`);
      }
    } catch (userErr: any) {
      console.warn(`  ⚠ public.users sync error:`, userErr?.message || userErr);
    }

    // 3. Seed Tenant Memberships
    for (const membership of user.tenants) {
      try {
        const { error: memberError } = await admin.from('tenant_users').upsert(
          {
            tenant_id: membership.tenantId,
            user_id: user.id,
            role: membership.role,
            approval_scopes: membership.approvalScopes,
          },
          { onConflict: 'tenant_id,user_id' },
        );

        if (memberError) {
          console.warn(`  ⚠ tenant_users error:`, memberError.message);
        } else {
          console.log(
            `  ✓ Synced tenant membership: tenant=${membership.tenantId.slice(0, 8)}... role=${membership.role}`,
          );
        }
      } catch (memberErr: any) {
        console.warn(`  ⚠ tenant_users sync error:`, memberErr?.message || memberErr);
      }
    }
  }
}

function seedViaDirectSql(dbUrl: string) {
  const sqlPath = resolve(__dirname, '../infra/supabase/seed-users.sql');
  if (!existsSync(sqlPath)) {
    console.error(`Error: Seed SQL file not found at ${sqlPath}`);
    return false;
  }

  console.log(`\n▶ Applying direct SQL user seed from ${sqlPath}...`);
  try {
    if (execSync('which psql || true', { encoding: 'utf-8' }).trim()) {
      execSync(`psql "${dbUrl}" -f "${sqlPath}"`, { stdio: 'inherit' });
      console.log('✓ Direct PostgreSQL seed completed via psql');
      return true;
    }
  } catch (err: any) {
    console.warn('⚠ psql execution notice:', err?.message || err);
  }

  return false;
}

function printSummaryRoster() {
  console.log('\n=================================================================');
  console.log('  Axiom Proof — Standard Authenticated User Roster               ');
  console.log('=================================================================');
  console.log('  1. Founder / Super Admin');
  console.log('     Email    : founder@axiomminds.ai');
  console.log('     Password : Admin@12345678');
  console.log('     Role     : owner (All Tenants)\n');

  console.log('  2. Fintech Compliance Admin (Meridian Pay)');
  console.log('     Email    : dpo@meridianpay.com');
  console.log('     Password : Meridian@123456');
  console.log('     Tenant   : Meridian Pay (Fintech) · Role: admin\n');

  console.log('  3. Healthcare Lead Auditor (Aarogya Health)');
  console.log('     Email    : auditor@aarogya.in');
  console.log('     Password : Aarogya@123456');
  console.log('     Tenant   : Aarogya Health (Healthcare) · Role: reviewer\n');

  console.log('  4. SaaS Security Operations Lead (Streamline SaaS)');
  console.log('     Email    : security@streamline.io');
  console.log('     Password : Streamline@123456');
  console.log('     Tenant   : Streamline SaaS (B2B SaaS) · Role: approver\n');
  console.log('=================================================================');
  console.log('  Direct SQL Seed file: infra/supabase/seed-users.sql');
  console.log('=================================================================\n');
}

async function main() {
  console.log('=================================================================');
  console.log('  Axiom Proof — Multi-Tenant User Provisioning Tool              ');
  console.log('=================================================================');

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printSummaryRoster();
    process.exit(0);
  }

  const env = loadEnv();
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  let directSqlSucceeded = false;
  if (dbUrl) {
    directSqlSucceeded = seedViaDirectSql(dbUrl);
  }

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    try {
      await seedViaSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    } catch (err: any) {
      console.warn('⚠ Supabase Admin API seed notice:', err?.message || err);
    }
  }

  printSummaryRoster();
}

main().catch((err) => {
  console.error('Fatal user seeding error:', err);
  process.exit(1);
});
