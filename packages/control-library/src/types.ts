import { z } from 'zod';

/**
 * DPDPA control taxonomy.
 *
 * Each control is a single testable obligation derived from a specific
 * Act section and/or DPDP Rule, with a defined evidence type, assessment
 * question, scoring rubric, and remediation pattern.
 *
 * IDs follow the pattern: DPDPA-<DOMAIN>-<SEQ>
 *   domain codes:
 *     GOV  — governance / accountability
 *     CNS  — consent & notice
 *     DAT  — data principal rights
 *     RCD  — record-keeping & processing records
 *     BRCH — breach & incident
 *     XBR  — cross-border transfer
 *     CHD  — children's data
 *     SDF  — significant data fiduciary
 *     SEC  — security safeguards
 *     RTN  — retention & erasure
 *     DPF  — Data Protection Officer / contact
 *     AUD  — audit & oversight
 *     DPIA — Data Protection Impact Assessment
 */

export const ControlDomainSchema = z.enum([
  'GOV',
  'CNS',
  'DAT',
  'RCD',
  'BRCH',
  'XBR',
  'CHD',
  'SDF',
  'SEC',
  'RTN',
  'DPF',
  'AUD',
  'DPIA',
]);
export type ControlDomain = z.infer<typeof ControlDomainSchema>;

export const ControlSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type ControlSeverity = z.infer<typeof ControlSeveritySchema>;

export const EvidenceTypeSchema = z.enum([
  'document', // uploaded file (notice, policy, contract)
  'config', // system setting / database row
  'screenshot', // UI proof
  'log', // system log / audit trail
  'attestation', // signed human statement
  'interview', // founder's recorded Q&A with the client
  'inventory', // data map / schema dump
  'report', // generated report artifact
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const RemediationPatternSchema = z.enum([
  'policy', // write / publish a policy or notice
  'consent', // add / fix a consent mechanism
  'config', // change a system configuration
  'data-deletion', // delete specific records (data principal request)
  'data-masking', // pseudonymize / mask data at rest
  'data-portability', // export data in portable format
  'dpo-appointment', // appoint a DPO / contact
  'dpa-execution', // execute a data processing agreement
  'breach-process', // stand up a breach response process
  'training', // train staff
  'discovery', // run a discovery scan
  'vendor-risk', // assess a vendor / processor
  'review', // human review (no code change)
  'reporting', // produce a report
]);
export type RemediationPattern = z.infer<typeof RemediationPatternSchema>;

export const AssessmentQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  type: z.enum(['boolean', 'scale', 'text', 'multi', 'evidence']),
  /** For scale: what 1=worst, 5=best mean. */
  scaleAnchors: z.array(z.string()).optional(),
  /** For multi-choice. */
  options: z.array(z.string()).optional(),
  /** Required evidence types to back an answer. */
  evidenceTypes: z.array(EvidenceTypeSchema).default([]),
  /** If present, the answer must reference one of these control IDs (cross-link). */
  dependsOn: z.array(z.string()).default([]),
});
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;

export const ScoringRubricSchema = z.object({
  /** 0–100. Baseline score when no evidence is present (worst case). */
  baseline: z.number().min(0).max(100),
  /** Weight in the overall posture score (0–1). Must sum to 1 across a domain. */
  weight: z.number().min(0).max(1),
  /** Risk-points penalty for a finding (0–100). Adds to exposure estimate. */
  penaltyPoints: z.number().min(0).max(100),
  /** Statutory citation of the maximum fine for non-compliance with this control. */
  maxPenaltyINR: z.number().int().nonnegative(),
});
export type ScoringRubric = z.infer<typeof ScoringRubricSchema>;

export const ControlSchema = z.object({
  /** Stable internal ID, e.g. "DPDPA-CNS-001". */
  id: z.string().regex(/^DPDPA-[A-Z]+-\d{3}$/),
  /** Short, human-readable title. */
  title: z.string().min(5).max(200),
  /** One-paragraph plain-English statement of the obligation. */
  obligation: z.string().min(20),
  domain: ControlDomainSchema,
  severity: ControlSeveritySchema,
  /** Statutory citation(s) — Act sections and Rules. */
  citations: z.array(
    z.object({
      instrument: z.enum(['DPDPA-2023', 'DPDPR-2025', 'IT-Act-2000', 'CERT-In-2022', 'Other']),
      reference: z.string(), // e.g. "Section 6(1)" or "Rule 4(2)"
      url: z.string().url().optional(),
    }),
  ),
  /** Authoritative evidence required to demonstrate compliance. */
  evidenceRequired: z.array(
    z.object({
      type: EvidenceTypeSchema,
      description: z.string(),
      retention: z.string().optional(), // e.g. "7 years from last consent"
    }),
  ),
  /** Pre-built questions for the assessment agent. */
  assessmentQuestions: z.array(AssessmentQuestionSchema).min(1),
  /** Scoring & risk weighting. */
  scoring: ScoringRubricSchema,
  /** Default remediation pattern(s) the planner agent will consider. */
  remediationPatterns: z.array(RemediationPatternSchema).min(1),
  /** Tags for grouping / filtering. */
  tags: z.array(z.string()).default([]),
  /** Whether this control applies to Significant Data Fiduciaries (SDFs). */
  sdfOnly: z.boolean().default(false),
  /** Whether this control applies only to children's data fiduciaries. */
  childrenOnly: z.boolean().default(false),
  /** Library version this control first appeared in. */
  introducedInVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Last revised in this library version. */
  revisedInVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
  /** Free-text notes for the assessor (longer rationale, edge cases). */
  notes: z.string().optional(),
});
export type Control = z.infer<typeof ControlSchema>;

/** Library version. Once published, the contents of a given version are immutable. */
export interface ControlLibraryVersion {
  version: string; // semver
  publishedAt: string; // ISO date
  publishedBy: string; // 'founder' | human name
  changeLog: string;
  controls: Control[];
}
