import { describe, it, expect } from 'vitest';
import { loadEnv, resetEnvCache, BRAND } from './index';

describe('loadEnv', () => {
  it('loads valid env', () => {
    resetEnvCache();
    const env = loadEnv({
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'a'.repeat(40),
      SUPABASE_SERVICE_KEY: 'b'.repeat(40),
      NODE_ENV: 'test',
    });
    expect(env.NODE_ENV).toBe('test');
    expect(env.SUPABASE_URL).toBe('http://localhost:54321');
  });

  it('throws on invalid production configuration', () => {
    resetEnvCache();
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/Invalid environment configuration/);
  });

  it('defaults NODE_ENV to development', () => {
    resetEnvCache();
    const env = loadEnv({
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'a'.repeat(40),
      SUPABASE_SERVICE_KEY: 'b'.repeat(40),
    });
    expect(env.NODE_ENV).toBe('development');
  });

  it('fails closed when production service credentials are incomplete', () => {
    resetEnvCache();
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'a'.repeat(40),
        SUPABASE_SERVICE_KEY: 'b'.repeat(40),
      }),
    ).toThrow(/AGENT_RUNTIME_INTERNAL_TOKEN|APPROVAL_SIGNING_KEY/);
  });

  it('allows preprod and staging environments without requiring production secrets', () => {
    resetEnvCache();
    const envPreprod = loadEnv({
      NODE_ENV: 'production',
      ENVIRONMENT: 'preprod',
    });
    expect(envPreprod.ENVIRONMENT).toBe('preprod');

    resetEnvCache();
    const envStaging = loadEnv({
      NODE_ENV: 'production',
      ENVIRONMENT: 'staging',
    });
    expect(envStaging.ENVIRONMENT).toBe('staging');
  });

  it('resolves primary AXIOM_* storage variables and mirrors to legacy AWS_* aliases', () => {
    resetEnvCache();
    const env = loadEnv({
      AXIOM_REGION: 'asia-south1',
      AXIOM_EVIDENCE_BUCKET: 'custom-evidence-bucket',
      AXIOM_STORAGE_ENDPOINT: 'https://storage.googleapis.com',
      AXIOM_STORAGE_ACCESS_KEY_ID: 'GOOG12345',
      AXIOM_STORAGE_SECRET_ACCESS_KEY: 'secret12345',
      AXIOM_PROJECT_ID: 'axiom-proof-preprod',
    });

    expect(env.AXIOM_REGION).toBe('asia-south1');
    expect(env.AWS_REGION).toBe('asia-south1');
    expect(env.AXIOM_EVIDENCE_BUCKET).toBe('custom-evidence-bucket');
    expect(env.AWS_S3_EVIDENCE_BUCKET).toBe('custom-evidence-bucket');
    expect(env.AXIOM_STORAGE_ENDPOINT).toBe('https://storage.googleapis.com');
    expect(env.AWS_S3_ENDPOINT).toBe('https://storage.googleapis.com');
    expect(env.AXIOM_STORAGE_ACCESS_KEY_ID).toBe('GOOG12345');
    expect(env.AWS_ACCESS_KEY_ID).toBe('GOOG12345');
    expect(env.AXIOM_STORAGE_SECRET_ACCESS_KEY).toBe('secret12345');
    expect(env.AWS_SECRET_ACCESS_KEY).toBe('secret12345');
    expect(env.AXIOM_PROJECT_ID).toBe('axiom-proof-preprod');
    expect(env.GCP_PROJECT_ID).toBe('axiom-proof-preprod');
  });

  it('accepts legacy AWS_* variables and mirrors them to AXIOM_* variables', () => {
    resetEnvCache();
    const env = loadEnv({
      AWS_REGION: 'ap-south-1',
      AWS_S3_EVIDENCE_BUCKET: 'legacy-bucket',
      AWS_S3_ENDPOINT: 'https://storage.googleapis.com',
      AWS_ACCESS_KEY_ID: 'AWS123',
      AWS_SECRET_ACCESS_KEY: 'AWSSEC123',
      GCP_PROJECT_ID: 'legacy-gcp-project',
    });

    expect(env.AXIOM_REGION).toBe('ap-south-1');
    expect(env.AXIOM_EVIDENCE_BUCKET).toBe('legacy-bucket');
    expect(env.AXIOM_STORAGE_ENDPOINT).toBe('https://storage.googleapis.com');
    expect(env.AXIOM_STORAGE_ACCESS_KEY_ID).toBe('AWS123');
    expect(env.AXIOM_STORAGE_SECRET_ACCESS_KEY).toBe('AWSSEC123');
    expect(env.AXIOM_PROJECT_ID).toBe('legacy-gcp-project');
  });
});

describe('BRAND', () => {
  it('has a stable name', () => {
    expect(BRAND.name).toBe('Axiom Proof');
  });
  it('has a stable company', () => {
    expect(BRAND.company).toBe('Axiom Minds Private Limited');
  });
  it('has correct product and company domains', () => {
    expect(BRAND.primaryDomain).toBe('axiomproof.ai');
    expect(BRAND.productDomain).toBe('app.axiomproof.ai');
    expect(BRAND.companyDomain).toBe('axiomminds.ai');
  });
});
