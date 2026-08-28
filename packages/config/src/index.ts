import { z } from 'zod';

/**
 * Centralised runtime configuration. Loaded once at process start and
 * frozen — every service reads from this, never from `process.env`
 * directly. Validation fails fast at boot.
 */

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    ENVIRONMENT: z.enum(['development', 'staging', 'preprod', 'production', 'local']).default('development').optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Supabase
    SUPABASE_URL: z.string().url().default('http://127.0.0.1:55321'),
    SUPABASE_ANON_KEY: z
      .string()
      .min(20)
      .default(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      ),
    SUPABASE_SERVICE_KEY: z
      .string()
      .min(20)
      .default(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      ),
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

    // BFF → agent-runtime service-to-service authentication
    AGENT_RUNTIME_URL: z.string().url().optional(),
    AGENT_RUNTIME_INTERNAL_TOKEN: z.string().optional(),

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
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production' || env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'local') return;

    if (
      !env.SUPABASE_URL ||
      env.SUPABASE_URL.includes('localhost') ||
      env.SUPABASE_URL.includes('127.0.0.1')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message: 'Valid production SUPABASE_URL is required',
      });
    }
    if (
      !env.SUPABASE_SERVICE_KEY ||
      env.SUPABASE_SERVICE_KEY.startsWith(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1v',
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SERVICE_KEY'],
        message: 'Valid production SUPABASE_SERVICE_KEY is required',
      });
    }
    if (env.AWS_REGION !== 'ap-south-1') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AWS_REGION'],
        message: 'Production data-plane services must run in ap-south-1',
      });
    }
    if (!env.APPROVAL_SIGNING_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APPROVAL_SIGNING_KEY'],
        message: 'Required in production; do not use a development signing fallback',
      });
    }
    if (!env.AGENT_RUNTIME_INTERNAL_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AGENT_RUNTIME_INTERNAL_TOKEN'],
        message: 'Required in production for BFF-to-agent authentication',
      });
    }
    if (!env.AGENT_RUNTIME_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AGENT_RUNTIME_URL'],
        message: 'Required in production for BFF-to-agent routing',
      });
    }
    if (!env.MODEL_GATEWAY_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MODEL_GATEWAY_API_KEY'],
        message: 'Required in production for model-gateway authentication',
      });
    }
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
