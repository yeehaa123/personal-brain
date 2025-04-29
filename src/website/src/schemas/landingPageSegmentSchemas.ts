import { z } from 'zod';

import {
  AboutSectionSchema,
  CaseStudiesSectionSchema,
  CtaSectionSchema,
  ExpertiseSectionSchema,
  FaqSectionSchema,
  FooterSectionSchema,
  HeroSectionSchema,
  LandingPageSchema,
  PricingSectionSchema,
  ProblemStatementSectionSchema,
  ProcessSectionSchema,
  ServicesSectionSchema,
} from '../schemas';

/**
 * Schema definitions for landing page segment groups
 * 
 * These segment schemas allow for breaking down the landing page generation
 * into smaller, more manageable pieces that can be generated independently
 * and then combined into a complete landing page.
 */

/**
 * Core Identity Segment - Represents the essential brand identity elements
 * including basic metadata, hero section, and problem statement
 */
export const IdentitySegmentSchema = z.object({
  // Basic information that establishes identity
  title: z.string(),
  description: z.string(),
  name: z.string(),
  tagline: z.string(),
  
  // Key sections that define core identity
  hero: HeroSectionSchema,
  problemStatement: ProblemStatementSectionSchema.optional(),
  
  // Metadata for tracking
  segmentType: z.literal('identity'),
  version: z.number().default(1),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

export type IdentitySegment = z.infer<typeof IdentitySegmentSchema>;

/**
 * Service Offering Segment - Represents the professional services and process
 */
export const ServiceOfferingSegmentSchema = z.object({
  // Service-related sections
  services: ServicesSectionSchema,
  process: ProcessSectionSchema.optional(),
  pricing: PricingSectionSchema.optional(),
  
  // Metadata for tracking
  segmentType: z.literal('serviceOffering'),
  version: z.number().default(1),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

export type ServiceOfferingSegment = z.infer<typeof ServiceOfferingSegmentSchema>;

/**
 * Credibility Proof Segment - Represents case studies, expertise, and background
 */
export const CredibilitySegmentSchema = z.object({
  // Credibility-related sections
  caseStudies: CaseStudiesSectionSchema.optional(),
  expertise: ExpertiseSectionSchema.optional(),
  about: AboutSectionSchema.optional(),
  
  // Metadata for tracking
  segmentType: z.literal('credibility'),
  version: z.number().default(1),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

export type CredibilitySegment = z.infer<typeof CredibilitySegmentSchema>;

/**
 * Conversion Elements Segment - Represents FAQ, CTA, and footer elements
 */
export const ConversionSegmentSchema = z.object({
  // Conversion-related sections
  faq: FaqSectionSchema.optional(),
  cta: CtaSectionSchema.optional(),
  footer: FooterSectionSchema.optional(),
  
  // Metadata for tracking
  segmentType: z.literal('conversion'),
  version: z.number().default(1),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

export type ConversionSegment = z.infer<typeof ConversionSegmentSchema>;

/**
 * Union type of all segment types for type-safe handling
 */
export type LandingPageSegment = 
  | IdentitySegment
  | ServiceOfferingSegment
  | CredibilitySegment
  | ConversionSegment;

/**
 * Schema for segment storage - each type of segment with its versions
 */
export const SegmentStoreSchema = z.object({
  identity: IdentitySegmentSchema.optional(),
  serviceOffering: ServiceOfferingSegmentSchema.optional(),
  credibility: CredibilitySegmentSchema.optional(),
  conversion: ConversionSegmentSchema.optional(),
});

export type SegmentStore = z.infer<typeof SegmentStoreSchema>;

/**
 * Schema for segment generation status tracking
 */
export const SegmentGenerationStatusSchema = z.object({
  identity: z.boolean().default(false),
  serviceOffering: z.boolean().default(false),
  credibility: z.boolean().default(false),
  conversion: z.boolean().default(false),
  combined: z.boolean().default(false),
  reviewed: z.boolean().default(false),
});

export type SegmentGenerationStatus = z.infer<typeof SegmentGenerationStatusSchema>;

/**
 * Modified schema for the segment-based landing page data
 * This extends the regular landing page schema with segment tracking
 */
export const SegmentedLandingPageSchema = z.object({
  // The complete landing page data (same as LandingPageSchema)
  landingPage: LandingPageSchema,
  
  // Segment tracking
  segments: SegmentStoreSchema,
  
  // Status tracking
  status: SegmentGenerationStatusSchema,
  
  // Generation metadata
  generatedAt: z.string().default(() => new Date().toISOString()),
  version: z.number().default(1),
});

export type SegmentedLandingPageData = z.infer<typeof SegmentedLandingPageSchema>;