import type { MetadataRoute } from 'next';
import { BRAND } from '@axiom/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${BRAND.primaryDomain}`;
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/agents`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
