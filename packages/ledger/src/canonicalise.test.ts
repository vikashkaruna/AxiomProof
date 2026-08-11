import { describe, it, expect } from 'vitest';
import { canonicalJson, sha256 } from './canonicalise.js';

describe('canonicalJson', () => {
  it('sorts object keys', () => {
    const a = canonicalJson({ b: 1, a: 2 });
    const b = canonicalJson({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('preserves array order', () => {
    expect(canonicalJson([1, 2, 3])).toBe('[1,2,3]');
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles nested structures', () => {
    const a = canonicalJson({ z: { y: 1, x: 2 }, a: [3, 2, 1] });
    const b = canonicalJson({ a: [3, 2, 1], z: { x: 2, y: 1 } });
    expect(a).toBe(b);
  });

  it('treats undefined as null', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"a":null,"b":1}');
  });

  it('produces no whitespace', () => {
    expect(canonicalJson({ a: 1 })).toBe('{"a":1}');
  });
});

describe('sha256', () => {
  it('hashes deterministically', async () => {
    const a = await sha256('hello');
    const b = await sha256('hello');
    expect(a).toBe(b);
  });

  it('produces 64-char hex', async () => {
    const h = await sha256('hello');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches known vector', async () => {
    // echo -n "hello" | sha256sum
    const h = await sha256('hello');
    expect(h).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
