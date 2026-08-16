import { describe, it, expect } from 'vitest';
import { contentKey } from './index';

describe('contentKey', () => {
  it('builds a tenant-scoped key without engagement', () => {
    const k = contentKey({
      tenantId: 't1',
      contentHash: 'a'.repeat(64),
    });
    expect(k).toBe(`tenants/t1/evidence/${'a'.repeat(64)}`);
  });

  it('builds a tenant+engagement-scoped key', () => {
    const k = contentKey({
      tenantId: 't1',
      engagementId: 'e1',
      contentHash: 'b'.repeat(64),
    });
    expect(k).toBe(`tenants/t1/engagements/e1/evidence/${'b'.repeat(64)}`);
  });

  it('appends filename when present', () => {
    const k = contentKey({
      tenantId: 't1',
      contentHash: 'c'.repeat(64),
      filename: 'privacy-notice.pdf',
    });
    expect(k).toBe(`tenants/t1/evidence/${'c'.repeat(64)}/privacy-notice.pdf`);
  });
});
