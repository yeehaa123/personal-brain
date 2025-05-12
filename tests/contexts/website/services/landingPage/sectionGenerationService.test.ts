import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Mock } from 'bun:test';
import { z } from 'zod';

import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import { FallbackContentGenerator } from '@/contexts/website/services/landingPage/fallbackContentGenerator';
import { SectionGenerationService } from '@/contexts/website/services/landingPage/sectionGenerationService';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';

interface MockBrainProtocolResult {
  object: {
    headline?: string;
    subheading?: string;
    ctaText?: string;
    ctaLink?: string;
    enabled?: boolean;
  };
}

// Create well-formed test data for the tests
const createTestLandingPage = (): Partial<LandingPageData> => ({
  title: 'Test Page',
  description: 'Test Description',
  name: 'Test Name',
  tagline: 'Test Tagline',
  hero: {
    headline: 'Original Hero Headline',
    subheading: 'Original Hero Subheading',
    ctaText: 'Learn More',
    ctaLink: '#contact',
  },
  services: {
    title: 'Services',
    items: [{ title: 'Service', description: 'Description' }],
  },
  sectionOrder: ['hero', 'services'],
});

const createTestIdentity = (): WebsiteIdentityData => ({
  personalData: { 
    name: 'Test User',
    email: 'test@example.com',
    occupation: 'Developer',
    company: 'Test Company',
    location: 'Test Location',
    industry: 'Technology',
    yearsExperience: 5,
  },
  brandIdentity: {
    tone: { 
      formality: 'casual' as const, 
      emotion: 'friendly', 
      personality: ['helpful'],
    },
    contentStyle: { 
      writingStyle: 'clear', 
      sentenceLength: 'medium' as const, 
      vocabLevel: 'moderate' as const,
      useJargon: false,
      useHumor: false,
      useStories: false,
    },
    values: {
      coreValues: ['quality'],
      targetAudience: ['professionals'],
      painPoints: ['complexity'],
      desiredAction: 'contact',
    },
  },
  creativeContent: {
    title: 'Creative Title',
    description: 'Creative Description',
    tagline: 'Creative Tagline',
    uniqueValue: 'Unique Value',
    keyAchievements: ['Achievement 1', 'Achievement 2'],
  },
});

// Mock the BrainProtocol
const createMockBrainProtocol = () => ({
  processQuery: mock<() => Promise<MockBrainProtocolResult>>(() => 
    Promise.resolve({ object: { headline: 'Generated Title' } }),
  ),
});

describe('SectionGenerationService', () => {
  let service: SectionGenerationService;
  let mockBrainProtocol: ReturnType<typeof createMockBrainProtocol>;
  
  beforeEach(() => {
    // Reset instances for clean test state
    SectionGenerationService.resetInstance();
    FallbackContentGenerator.resetInstance();
    
    // Initialize service and mocks
    service = SectionGenerationService.getInstance();
    mockBrainProtocol = createMockBrainProtocol();
    
    // Set the mock brain protocol
    service.setBrainProtocol(mockBrainProtocol as unknown as BrainProtocol);
  });
  
  test('follows Component Interface Standardization pattern', () => {
    // Test singleton behavior
    const instance1 = SectionGenerationService.getInstance();
    const instance2 = SectionGenerationService.getInstance();
    expect(instance1).toBe(instance2);
    
    // Test reset functionality
    SectionGenerationService.resetInstance();
    const instance3 = SectionGenerationService.getInstance();
    expect(instance3).not.toBe(instance1);
    
    // Test createFresh
    const freshInstance = SectionGenerationService.createFresh();
    expect(freshInstance).not.toBe(instance3);
  });
  
  test('successfully generates section content', async () => {
    // Create test data
    const landingPage = createTestLandingPage();
    const identity = createTestIdentity();
    
    // Define a schema for hero section
    const heroSchema = z.object({
      headline: z.string(),
      subheading: z.string(),
      ctaText: z.string(),
      ctaLink: z.string(),
      enabled: z.boolean().optional(),
    });
    
    // Mock processQuery to return a valid hero object
    const mockResult = {
      object: {
        headline: 'New Hero Headline',
        subheading: 'New Hero Subheading',
        ctaText: 'New CTA Text',
        ctaLink: '#new-link',
        enabled: true,
      },
    };
    
    (mockBrainProtocol.processQuery as Mock<() => Promise<MockBrainProtocolResult>>).mockResolvedValueOnce(mockResult);
    
    // Generate the section
    const result = await service.generateSection(
      landingPage as LandingPageData,
      'hero',
      'Test prompt template',
      heroSchema,
      identity,
    );
    
    // Verify the result
    expect(result.status).toBe(SectionGenerationStatus.Completed);
    expect(result.data).toMatchObject({
      headline: 'New Hero Headline',
      subheading: 'New Hero Subheading',
      ctaText: 'New CTA Text',
      ctaLink: '#new-link',
      enabled: true,
    });
    
    // Verify the landing page was updated
    expect(landingPage.hero).toMatchObject({
      headline: 'New Hero Headline',
      subheading: 'New Hero Subheading',
      ctaText: 'New CTA Text',
      ctaLink: '#new-link',
      enabled: true,
    });
    
    // Verify processQuery was called with the right parameters
    expect(mockBrainProtocol.processQuery).toHaveBeenCalledWith(
      expect.stringContaining('Test prompt template'),
      expect.objectContaining({
        schema: heroSchema,
      }),
    );
  });
  
  test('handles errors and provides fallback content', async () => {
    // Create test data
    const landingPage = createTestLandingPage();
    const identity = createTestIdentity();
    
    // Define a schema for hero section
    const heroSchema = z.object({
      headline: z.string(),
      subheading: z.string(),
      ctaText: z.string(),
      ctaLink: z.string(),
      enabled: z.boolean().optional(),
    });
    
    // Mock processQuery to throw an error
    (mockBrainProtocol.processQuery as Mock<() => Promise<MockBrainProtocolResult>>).mockRejectedValueOnce(
      new Error('Generation failed'),
    );
    
    // Mock the fallback content generator
    const mockFallbackContent = {
      headline: 'Fallback Hero Headline',
      subheading: 'Fallback hero subheading',
      ctaText: 'Contact Us',
      ctaLink: '#contact',
      enabled: false,
    };
    
    const mockFallbackGenerator = FallbackContentGenerator.getInstance();
    const originalGetFallbackContent = mockFallbackGenerator.getFallbackContent;
    mockFallbackGenerator.getFallbackContent = mock(() => mockFallbackContent);
    
    try {
      // Generate the section - this should throw
      await service.generateSection(
        landingPage as LandingPageData,
        'hero',
        'Test prompt template',
        heroSchema,
        identity,
      );
      
      // Should not reach here if properly throwing
      expect(true).toBe(false); // Force test to fail if we get here
    } catch (error) {
      // Expected - error should be thrown
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain('Generation failed');
    }
    
    // Apply fallback content
    const fallback = service.applyFallbackContent(landingPage as LandingPageData, 'hero');
    
    // Verify fallback was applied
    expect(fallback).toMatchObject(mockFallbackContent);
    expect(landingPage.hero).toMatchObject(mockFallbackContent);
    
    // Restore original function
    mockFallbackGenerator.getFallbackContent = originalGetFallbackContent;
  });
  
  test('applies simplified options for retries', async () => {
    // Create test data
    const landingPage = createTestLandingPage();
    const identity = createTestIdentity();
    
    // Define a schema for hero section
    const heroSchema = z.object({
      headline: z.string(),
      subheading: z.string(),
      ctaText: z.string(),
      ctaLink: z.string(),
      enabled: z.boolean().optional(),
    });
    
    // Mock processQuery to return a valid hero object
    const mockResult = {
      object: {
        headline: 'Retry Hero Headline',
        subheading: 'Retry Hero Subheading',
        ctaText: 'Retry CTA Text',
        ctaLink: '#retry-link',
        enabled: true,
      },
    };
    
    (mockBrainProtocol.processQuery as Mock<() => Promise<MockBrainProtocolResult>>).mockResolvedValueOnce(mockResult);
    
    // Generate the section with retry options
    const result = await service.generateSection(
      landingPage as LandingPageData,
      'hero',
      'Test prompt template',
      heroSchema,
      identity,
      { isRetry: true, simplifyPrompt: true },
    );
    
    // Verify the result
    expect(result.status).toBe(SectionGenerationStatus.Completed);
    expect(result.data).toMatchObject({
      headline: 'Retry Hero Headline',
      subheading: 'Retry Hero Subheading',
      ctaText: 'Retry CTA Text',
      ctaLink: '#retry-link',
      enabled: true,
    });
    
    // Verify processQuery was called with correct parameters
    expect(mockBrainProtocol.processQuery).toHaveBeenCalledWith(
      expect.stringContaining('Test prompt template'),
      expect.objectContaining({
        schema: heroSchema,
        userId: 'system',
      }),
    );
  });
});