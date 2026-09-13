import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StatusBadge } from './StatusBadge';
import { SeverityChip } from '../primitives/SeverityChip';

describe('StatusBadge Component', () => {
  it('renders standard lifecycle status badges', () => {
    const html = renderToString(<StatusBadge status="approved" />);
    expect(html).toContain('Approved');
  });

  it('renders statutory remediation action dry_run_complete status badge', () => {
    const html = renderToString(<StatusBadge status="dry_run_complete" />);
    expect(html).toContain('Dry-Run Complete');
  });

  it('renders statutory dry-run statuses without error', () => {
    for (const status of [
      'awaiting_dry_run',
      'dry_run_pending',
      'dry_run_failed',
      'awaiting_approval',
    ]) {
      const html = renderToString(<StatusBadge status={status} />);
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it('gracefully handles completely unknown or null/undefined statuses with fallback', () => {
    const unknownHtml = renderToString(<StatusBadge status={'some_future_custom_status' as any} />);
    expect(unknownHtml).toContain('some future custom status');

    const emptyHtml = renderToString(<StatusBadge status={'' as any} />);
    expect(emptyHtml).toContain('Unknown');
  });

  it('handles case-insensitive and whitespace statuses', () => {
    const html = renderToString(<StatusBadge status={'  DRY_RUN_COMPLETE  ' as any} />);
    expect(html).toContain('Dry-Run Complete');
  });
});

describe('SeverityChip Component', () => {
  it('renders standard severities with symbols', () => {
    const html = renderToString(<SeverityChip severity="high" />);
    expect(html).toContain('High');
    expect(html).toContain('▲');
  });

  it('gracefully handles unknown severity values with fallback', () => {
    const html = renderToString(<SeverityChip severity={'extreme' as any} />);
    expect(html).toContain('Extreme');
  });
});
