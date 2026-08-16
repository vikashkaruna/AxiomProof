import type { MetadataRoute } from 'next';
import { BRAND } from '@axiom/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `https://${BRAND.primaryDomain}/sitemap.xml`,
  };
}
