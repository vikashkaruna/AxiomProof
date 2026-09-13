import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AxiomMark, type AxiomMarkSize } from './AxiomMark';
import { AxiomLogo } from './AxiomLogo';

const SIZES: AxiomMarkSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

describe('AxiomMark Component', () => {
  it('renders all size variants', () => {
    for (const size of SIZES) {
      const html = renderToString(<AxiomMark size={size} />);
      expect(html).toContain('<svg');
      expect(html).toContain('Axiom Proof Mark');
    }
  });

  it('renders color variants properly', () => {
    const gradHtml = renderToString(<AxiomMark variant="gradient" />);
    expect(gradHtml).toContain('linearGradient');
    expect(gradHtml).toContain('#0FB5A5');

    const darkHtml = renderToString(<AxiomMark variant="monochrome-dark" />);
    expect(darkHtml).toContain('#1E2A4A');

    const goldHtml = renderToString(<AxiomMark variant="gold" />);
    expect(goldHtml).toContain('#C9A227');
  });

  it('contains the chain-link circle and proof checkmark needle', () => {
    const html = renderToString(<AxiomMark />);
    expect(html).toContain('<circle');
    expect(html).toContain('<path');
  });
});

describe('AxiomLogo Component', () => {
  it('renders the logo lockup with text and subtitle', () => {
    const html = renderToString(<AxiomLogo size="md" theme="light" showSubtitle={true} />);
    expect(html).toContain('AXIOM PROOF');
    expect(html).toContain('by Axiom Minds');
    expect(html).toContain('<svg');
  });

  it('renders dark theme with white text', () => {
    const html = renderToString(<AxiomLogo size="lg" theme="dark" />);
    expect(html).toContain('text-white');
  });

  it('allows hiding subtitle', () => {
    const html = renderToString(<AxiomLogo size="sm" showSubtitle={false} />);
    expect(html).toContain('AXIOM PROOF');
    expect(html).not.toContain('by Axiom Minds');
  });
});
