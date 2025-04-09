import { z } from 'zod';

/**
 * Schema for landing page data
 * This is shared between the main application and the Astro website
 */
export const LandingPageSchema = z.object({
  name: z.string(),
  title: z.string(),
  tagline: z.string(),
});

export type LandingPageData = z.infer<typeof LandingPageSchema>;