import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalEngine, generateTestSecret } from './index.js';

describe('ApprovalEngine', () => {
  let engine: ApprovalEngine;
  const tenantId = 't1';

  beforeEach(() => {
    engine = new ApprovalEngine(generateTestSecret());
  });

  describe('issue + verify', () => {
    it('issues a valid token and verifies it', async () => {
      const token = await engine.issue(tenantId, {
        planId: 'p1',
        actionIds: ['a1', 'a2'],
        approverId: 'u1',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      const result = await engine.verify(tenantId, token);
      expect(result.valid).toBe(true);
    });

    it('sorts actionIds canonically so verifier order does not matter', async () => {
      const a = await engine.issue(tenantId, {
        planId: 'p1',
        actionIds: ['a2', 'a1', 'a3'],
        approverId: 'u1',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      // Mutate the spec to a different order — signature should still hold
      const tampered = { ...a, spec: { ...a.spec, actionIds: ['a3', 'a1', 'a2'] } };
      const result = await engine.verify(tenantId, tampered);
      expect(result.valid).toBe(true);
    });
  });

  describe('rejection', () => {
    it('rejects when signature is wrong', async () => {
      const token = await engine.issue(tenantId, {
        planId: 'p1',
        actionIds: ['a1'],
        approverId: 'u1',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      const tampered = { ...token, signature: 'a'.repeat(64) };
      const result = await engine.verify(tenantId, tampered);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('signature_mismatch');
    });

    it('rejects when expired', async () => {
      const token = await engine.issue(tenantId, {
        planId: 'p1',
        actionIds: ['a1'],
        approverId: 'u1',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const result = await engine.verify(tenantId, token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('rejects nonce replay', async () => {
      const token = await engine.issue(tenantId, {
        planId: 'p1',
        actionIds: ['a1'],
        approverId: 'u1',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      engine.markNonceUsed(token.spec.nonce);
      const result = await engine.verify(tenantId, token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('nonce_replay');
    });

    it('rejects when action is not covered', async () => {
      const token = await engine.issue(tenantId, {
        planId: 'p1',
        actionIds: ['a1', 'a2'],
        approverId: 'u1',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      expect(engine.isActionCovered(token, 'a1')).toBe(true);
      expect(engine.isActionCovered(token, 'a3')).toBe(false);
    });
  });

  describe('per-tenant secrets', () => {
    it('throws when no secret is configured', () => {
      const e = new ApprovalEngine();
      expect(() => e['getSecret']('unknown')).toThrow();
    });

    it('uses per-tenant secret when set', async () => {
      const e = new ApprovalEngine();
      e.setTenantSecret('t1', 'tenant-1-secret');
      e.setTenantSecret('t2', 'tenant-2-secret');
      const t1 = await e.issue('t1', {
        planId: 'p',
        actionIds: ['a'],
        approverId: 'u',
        mode: 'batch',
        concurrency: 1,
        stopOnFailure: true,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      // Cross-tenant verification should fail
      const result = await e.verify('t2', t1);
      expect(result.valid).toBe(false);
    });
  });
});
