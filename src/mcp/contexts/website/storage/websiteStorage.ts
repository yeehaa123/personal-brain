import { z } from 'zod';
import path from 'path';

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
  deploymentType: z.enum(['local', 'github']).default('local'),
  deploymentConfig: z.record(z.unknown()).optional(),
  astroProjectPath: z.string().default(defaultAstroPath),
});

export type WebsiteConfig = z.infer<typeof WebsiteConfigSchema>;

/**
 * Simplified schema for landing page data (initial MVP)
 */
export const LandingPageSchema = z.object({
  name: z.string(),
  title: z.string(),
  tagline: z.string(),
});

export type LandingPageData = z.infer<typeof LandingPageSchema>;