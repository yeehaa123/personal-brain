/**
 * Zod schemas for Website Identity data
 * 
 * These schemas provide validation and type inference for website identity data,
 * which is used to maintain consistent branding and content across the website.
 */

import { z } from 'zod';

/**
 * Personal data schema - basic information from profile
 */
export const PersonalDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().optional(),
  location: z.string().optional(),
  occupation: z.string().optional(),
  industry: z.string().optional(),
  yearsExperience: z.number().positive().optional(),
});

/**
 * Creative content schema - marketing-oriented content
 */
export const CreativeContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  tagline: z.string().min(1, 'Tagline is required'),
  pitch: z.string().optional(),
  uniqueValue: z.string().optional(),
  keyAchievements: z.array(z.string()).optional().default([]),
});

/**
 * Tone settings schema - voice and tone guidelines
 */
export const ToneSchema = z.object({
  formality: z.enum(['casual', 'conversational', 'professional', 'academic']),
  personality: z.array(z.string()).min(1, 'At least one personality trait is required'),
  emotion: z.string().min(1, 'Emotion is required'),
});

/**
 * Content style schema - writing style preferences
 */
export const ContentStyleSchema = z.object({
  writingStyle: z.string().min(1, 'Writing style description is required'),
  sentenceLength: z.enum(['short', 'medium', 'varied', 'long']),
  vocabLevel: z.enum(['simple', 'moderate', 'advanced', 'technical']),
  useJargon: z.boolean(),
  useHumor: z.boolean(),
  useStories: z.boolean(),
});

/**
 * Values schema - brand values and audience targeting
 */
export const ValuesSchema = z.object({
  coreValues: z.array(z.string()).min(1, 'At least one core value is required'),
  targetAudience: z.array(z.string()).min(1, 'At least one target audience is required'),
  painPoints: z.array(z.string()).min(1, 'At least one pain point is required'),
  desiredAction: z.string().min(1, 'Desired action is required'),
});

/**
 * Brand identity schema - guidelines for consistent content
 */
export const BrandIdentitySchema = z.object({
  tone: ToneSchema,
  contentStyle: ContentStyleSchema,
  values: ValuesSchema,
});

/**
 * Full website identity schema
 */
export const WebsiteIdentitySchema = z.object({
  personalData: PersonalDataSchema,
  creativeContent: CreativeContentSchema,
  brandIdentity: BrandIdentitySchema,
});

// Export types derived from schemas
export type PersonalData = z.infer<typeof PersonalDataSchema>;
export type CreativeContent = z.infer<typeof CreativeContentSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type ContentStyle = z.infer<typeof ContentStyleSchema>;
export type Values = z.infer<typeof ValuesSchema>;
export type BrandIdentity = z.infer<typeof BrandIdentitySchema>;
export type WebsiteIdentityData = z.infer<typeof WebsiteIdentitySchema>;

/**
 * Schema for tools related to website identity
 */
export const GenerateWebsiteIdentityToolSchema = z.object({
  forceRegenerate: z.boolean().optional().default(false),
});

export const GetWebsiteIdentityToolSchema = z.object({});

export const UpdateWebsiteIdentityToolSchema = z.object({
  identityData: z.record(z.unknown()).optional(),
  partialUpdate: z.boolean().optional().default(true),
});