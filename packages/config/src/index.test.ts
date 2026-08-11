import { describe, it, expect } from 'vitest';
import { loadEnv, resetEnvCache, BRAND } from './index.js';

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

  it('throws on missing required fields', () => {
    resetEnvCache();
    expect(() => loadEnv({})).toThrow(/Invalid environment configuration/);
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
});

describe('BRAND', () => {
  it('has a stable name', () => {
    expect(BRAND.name).toBe('Axiom Proof');
  });
  it('has a stable company', () => {
    expect(BRAND.company).toBe('Axiom Minds Private Limited');
  });
});
