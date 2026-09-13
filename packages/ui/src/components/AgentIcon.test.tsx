import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AgentIcon } from './AgentIcon';
import { AgentPill } from './AgentPill';
import type { AgentName } from '@axiom/design-tokens';

const AGENTS: AgentName[] = [
  'drishti',
  'vibhaag',
  'parikshan',
  'saakshi',
  'sudhaar',
  'karya',
  'lekha',
  'nazar',
  'prativedan',
  'sanket',
];

describe('AgentIcon Component', () => {
  it('renders all 10 agents in idle state', () => {
    for (const agent of AGENTS) {
      const html = renderToString(<AgentIcon agent={agent} state="idle" size="sm" />);
      expect(html).toContain(agent);
      expect(html).toContain('<svg');
    }
  });

  it('renders animated states: thinking and working', () => {
    const thinkingHtml = renderToString(<AgentIcon agent="drishti" state="thinking" size="md" />);
    expect(thinkingHtml).toContain('drishti (thinking)');

    const workingHtml = renderToString(
      <AgentIcon agent="saakshi" state="working" size="lg" showBadge />
    );
    expect(workingHtml).toContain('saakshi (working)');
  });

  it('renders AgentPill embedding AgentIcon', () => {
    const pillHtml = renderToString(<AgentPill agent="karya" state="working" showPersona />);
    expect(pillHtml).toContain('karya');
    expect(pillHtml).toContain('Execution');
    expect(pillHtml).toContain('<svg');
  });
});
