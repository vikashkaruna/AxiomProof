#!/usr/bin/env tsx
/**
 * Seed the control library into Supabase.
 *
 * Usage: pnpm seed:controls
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';
import { buildLibrarySeed, validateLibrary } from '../src/index.js';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
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

  // Upsert the library version row.
  const { error: libErr } = await supabase.from('control_libraries').upsert(
    {
      version: seed.version,
      published_at: seed.publishedAt,
      published_by: seed.publishedBy,
      change_log: seed.changeLog,
      control_count: seed.controls.length,
    },
    { onConflict: 'version' },
  );
  if (libErr) {
    console.error('Library upsert failed:', libErr);
    process.exit(1);
  }

  // Bulk insert the controls.
  const { error: ctrlErr } = await supabase
    .from('controls')
    .upsert(seed.controls, { onConflict: 'id,library_version' });
  if (ctrlErr) {
    console.error('Controls upsert failed:', ctrlErr);
    process.exit(1);
  }

  console.log(`✓ Seeded ${seed.controls.length} controls (library v${seed.version})`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
