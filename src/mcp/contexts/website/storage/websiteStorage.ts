import path from 'path';

import { z } from 'zod';

import { type LandingPageData, LandingPageSchema } from '@website/schemas';

// Default path for Astro project as a subdirectory within the project
const defaultAstroPath = path.join('src', 'website');

/**
 * Schema for website configuration
 */
export const WebsiteConfigSchema = z.object({
  title: z.string().default('Personal Brain'),
  description: z.string().default('My personal website'),
  author: z.string(),
  baseUrl: z.string().url().default('http://localhost:4321'),
  deploymentType: z.enum(['local', 'netlify', 'github']).default('local'),
  deploymentConfig: z.record(z.unknown()).optional(),
  astroProjectPath: z.string().default(defaultAstroPath),
});

export type WebsiteConfig = z.infer<typeof WebsiteConfigSchema>;

// Re-export the landing page schema and type from the shared location
export { LandingPageSchema, type LandingPageData };