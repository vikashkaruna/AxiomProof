import { z } from 'zod';

/**
 * Centralised runtime configuration. Loaded once at process start and
 * frozen — every service reads from this, never from `process.env`
 * directly. Validation fails fast at boot.
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_KEY: z.string().min(20),
  SUPABASE_DB_URL: z.string().url().optional(),

  // AWS / S3
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_EVIDENCE_BUCKET: z.string().default('axiom-proof-evidence'),
  AWS_S3_ENDPOINT: z.string().url().optional(), // for MinIO etc

  // Temporal
  TEMPORAL_ADDRESS: z.string().default('ap-south-1.aws.api.temporal.io:7233'),
  TEMPORAL_NAMESPACE: z.string().default('axiom-proof'),
  TEMPORAL_API_KEY: z.string().optional(),
  TEMPORAL_TLS: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // Model gateway
  MODEL_GATEWAY_URL: z.string().url().default('http://model-gateway.axiom-proof:8000'),
  MODEL_GATEWAY_API_KEY: z.string().optional(),

  // BFF
  BFF_PORT: z
    .string()
    .default('4000')
    .transform((v) => Number(v)),
  BFF_PUBLIC_URL: z.string().url().optional(),
  BFF_CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Approval token signing
  APPROVAL_SIGNING_KEY: z.string().min(32).optional(), // per-tenant in prod
  APPROVAL_TOKEN_TTL_MINUTES: z
    .string()
    .default('60')
    .transform((v) => Number(v)),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Feature flags
  FEATURE_DRY_RUN_ENGINE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_EXECUTION_ENGINE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_LIVE_CONNECTORS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  FEATURE_KILL_SWITCH: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = Object.freeze(parsed.data);
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}

/** Brand constants — the single source of truth. */
export const BRAND = {
  name: 'Axiom Proof',
  fullName: 'Axiom Proof — by Axiom Minds',
  tagline: 'Agents do the work. You approve. The proof is automatic.',
  company: 'Axiom Minds Private Limited',
  website: 'https://axiomminds.ai',
  primaryDomain: 'axiomminds.ai',
  productDomain: 'app.axiomminds.ai',
  contactEmail: 'hello@axiomminds.ai',
  privacyEmail: 'privacy@axiomminds.ai',
  copyright: `© ${new Date().getFullYear()} Axiom Minds Private Limited. All rights reserved.`,
  jurisdiction: 'India',
  dataResidencyRegion: 'ap-south-1',
} as const;
