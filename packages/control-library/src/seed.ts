/**
 * Control library seed — transforms the v0 controls into a Supabase-ready
 * payload for `bulk insert` into the `controls` table.
 */

import {
  controls,
  LIBRARY_VERSION,
  LIBRARY_PUBLISHED_AT,
  LIBRARY_PUBLISHER,
  LIBRARY_CHANGELOG,
} from './controls.js';

export function buildLibrarySeed() {
  return {
    version: LIBRARY_VERSION,
    publishedAt: LIBRARY_PUBLISHED_AT,
    publishedBy: LIBRARY_PUBLISHER,
    changeLog: LIBRARY_CHANGELOG,
    controls: controls.map((c) => ({
      id: c.id,
      library_version: LIBRARY_VERSION,
      title: c.title,
      obligation: c.obligation,
      domain: c.domain,
      severity: c.severity,
      citations: c.citations,
      evidence_required: c.evidenceRequired,
      assessment_questions: c.assessmentQuestions,
      scoring: c.scoring,
      remediation_patterns: c.remediationPatterns,
      tags: c.tags,
      sdf_only: c.sdfOnly,
      children_only: c.childrenOnly,
      introduced_in_version: c.introducedInVersion,
      revised_in_version: c.revisedInVersion ?? null,
      notes: c.notes ?? null,
    })),
  };
}

// Auto-validate on import so misconfigured libraries fail fast.
const validation = (() => {
  // Lazy import to keep validateLibrary side-effect-free
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const c of controls) {
    if (seen.has(c.id)) errors.push(`Duplicate control id: ${c.id}`);
    seen.add(c.id);
  }
  if (controls.length !== 43) {
    errors.push(`Expected 43 controls, found ${controls.length}`);
  }
  return errors;
})();

if (validation.length > 0) {
  // eslint-disable-next-line no-console
  console.error('Control library validation failed:', validation);
  throw new Error('Control library invariants violated');
}
