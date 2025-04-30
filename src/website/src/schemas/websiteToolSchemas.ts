import { z } from 'zod';

/**
 * Schema definitions for website tools
 */

// Import existing quality thresholds schema
import { QualityThresholdsSchema } from './sectionQualitySchema';

/**
 * Schema for landing page generation tool
 */
export const LandingPageGenerationToolSchema = z.object({
  skipReview: z.boolean().optional()
    .describe('Whether to skip the final quality assessment phase'),
  qualityThresholds: QualityThresholdsSchema.optional()
    .describe('Custom thresholds for section quality assessment'),
});

export type LandingPageGenerationToolOptions = z.infer<typeof LandingPageGenerationToolSchema>;

/**
 * Schema for website build tool
 */
export const WebsiteBuildToolSchema = z.object({
  environment: z.enum(['preview', 'production']).optional()
    .describe('Environment to build for (default: preview)'),
  generateBeforeBuild: z.boolean().optional()
    .describe('Whether to generate landing page before building (default: true)'),
});

export type WebsiteBuildToolOptions = z.infer<typeof WebsiteBuildToolSchema>;

/**
 * Schema for website promotion tool
 */
export const WebsitePromoteToolSchema = z.object({
  skipConfirmation: z.boolean().optional()
    .describe('Whether to skip confirmation prompt'),
});

export type WebsitePromoteToolOptions = z.infer<typeof WebsitePromoteToolSchema>;

/**
 * Schema for website status tool
 */
export const WebsiteStatusToolSchema = z.object({
  environment: z.enum(['preview', 'production']).optional()
    .describe('Environment to check status for (default: preview)'),
});

export type WebsiteStatusToolOptions = z.infer<typeof WebsiteStatusToolSchema>;