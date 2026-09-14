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
});

describe('BRAND', () => {
  it('has a stable name', () => {
    expect(BRAND.name).toBe('Axiom Proof');
  });
  it('has a stable company', () => {
    expect(BRAND.company).toBe('Axiom Minds Private Limited');
  });
});
