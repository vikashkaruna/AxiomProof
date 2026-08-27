#!/usr/bin/env tsx
/**
 * Seed the control library into Supabase.
 *
 * Usage: pnpm seed:controls
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';
import { buildLibrarySeed, validateLibrary } from '../src/index';

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:55321';
const DEFAULT_LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function main() {
  const url = process.env.SUPABASE_URL ?? DEFAULT_LOCAL_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? DEFAULT_LOCAL_SERVICE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    process.exit(1);
  }

  const validation = validateLibrary();
  if (!validation.ok) {
    console.error('Library validation failed:', validation.errors);
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  const seed = buildLibrarySeed();

  // Check if this version is already seeded (controls are immutable)
  const { data: existingLib } = await supabase
    .from('control_libraries')
    .select('version, control_count')
    .eq('version', seed.version)
    .maybeSingle();

  if (existingLib) {
    const { count } = await supabase
      .from('controls')
      .select('*', { count: 'exact', head: true })
      .eq('library_version', seed.version);

    if (count && count >= seed.controls.length) {
      console.log(
        `✓ Control library v${seed.version} is already seeded (${count} controls present; controls are immutable).`,
      );
      return;
    }
  }

  // Insert the library version row if not present
  const { error: libErr } = await supabase.from('control_libraries').upsert(
    {
      version: seed.version,
      published_at: seed.publishedAt,
      published_by: seed.publishedBy,
      change_log: seed.changeLog,
      control_count: seed.controls.length,
    },
    { onConflict: 'version', ignoreDuplicates: true },
  );
  if (libErr) {
    console.error('Library upsert failed:', libErr);
    process.exit(1);
  }

  // Bulk insert the controls with ignoreDuplicates so existing rows aren't updated (triggering immutability)
  const { error: ctrlErr } = await supabase
    .from('controls')
    .upsert(seed.controls, { onConflict: 'id,library_version', ignoreDuplicates: true });
  if (ctrlErr) {
    console.error('Controls insert failed:', ctrlErr);
    process.exit(1);
  }

  console.log(`✓ Seeded ${seed.controls.length} controls (library v${seed.version})`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
