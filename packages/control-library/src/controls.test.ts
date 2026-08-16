import { describe, expect, it } from 'vitest';
import {
  buildLibrarySeed,
  CONTROL_LIBRARY_COUNT,
  controls,
  LIBRARY_VERSION,
  validateLibrary,
} from './index';

describe('control library v0.1.0', () => {
  it('contains the published count and passes invariants', () => {
    expect(controls).toHaveLength(CONTROL_LIBRARY_COUNT);
    expect(validateLibrary()).toEqual({ ok: true });
  });

  it('builds a versioned seed without changing the source count', () => {
    const seed = buildLibrarySeed();
    expect(seed.version).toBe(LIBRARY_VERSION);
    expect(seed.controls).toHaveLength(CONTROL_LIBRARY_COUNT);
    expect(new Set(seed.controls.map((control) => control.id)).size).toBe(CONTROL_LIBRARY_COUNT);
  });
});
