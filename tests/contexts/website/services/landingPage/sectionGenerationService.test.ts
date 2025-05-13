import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { z } from 'zod';

import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import { FallbackContentGenerator } from '@/contexts/website/services/landingPage/fallbackContentGenerator';
import { SectionGenerationService } from '@/contexts/website/services/landingPage/sectionGenerationService';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { QueryResult } from '@/protocol/types';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';

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

describe('SectionGenerationService', () => {
  let service: SectionGenerationService;
  let mockBrainProtocol: MockBrainProtocol;
  
  beforeEach(() => {
    // Reset instances for clean test state
    SectionGenerationService.resetInstance();
    FallbackContentGenerator.resetInstance();
    MockBrainProtocol.resetInstance();
    
    // Create with custom response setup for tests
    mockBrainProtocol = MockBrainProtocol.createFresh({
      customQueryResponse: {
        answer: 'Mock landing page section response',
        object: {
          headline: 'New Hero Headline',
          subheading: 'New Hero Subheading',
          ctaText: 'New CTA Text',
          ctaLink: '#new-link',
          enabled: true,
        },
        citations: [],
        relatedNotes: [],
      },
    });
    
    // Initialize service and mocks
    service = SectionGenerationService.getInstance();
    
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
    
    // Configure custom response for this test
    const mockResponse: QueryResult<unknown> = {
      answer: 'Generated hero section',
      object: {
        headline: 'New Hero Headline',
        subheading: 'New Hero Subheading',
        ctaText: 'New CTA Text',
        ctaLink: '#new-link',
        enabled: true,
      },
      citations: [],
      relatedNotes: [],
    };
    
    mockBrainProtocol.setOptions({
      customQueryResponse: mockResponse,
    });
    
    // Mock processQuery with a spy function
    const processQueryMock = mock((_query: string, _options: Record<string, unknown>) => Promise.resolve(mockResponse));
    const originalProcessQuery = mockBrainProtocol.processQuery;
    mockBrainProtocol.processQuery = processQueryMock as unknown as typeof mockBrainProtocol.processQuery;
    
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
    expect(processQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('Test prompt template'),
      expect.objectContaining({
        schema: heroSchema,
      }),
    );
    
    // Restore original function
    mockBrainProtocol.processQuery = originalProcessQuery;
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
    
    // Configure processQuery to throw an error for this test
    mockBrainProtocol.processQuery = mock(() => {
      throw new Error('Generation failed');
    });
    
    // Mock the fallback content generator
    const mockFallbackContent = {
      headline: 'Fallback Hero Headline',
      subheading: 'Fallback hero subheading',
      ctaText: 'Contact Us',
      ctaLink: '#contact',
      enabled: false,
    };
    
    const mockFallbackGenerator = FallbackContentGenerator.getInstance();
    const getFallbackContentMock = mock(() => mockFallbackContent);
    mockFallbackGenerator.getFallbackContent = getFallbackContentMock;
    
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
    
    // Verify getFallbackContent was called
    expect(getFallbackContentMock).toHaveBeenCalledWith('hero');
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
    
    // Configure custom response for retry scenario
    const mockResponse: QueryResult<unknown> = {
      answer: 'Retry generated hero section',
      object: {
        headline: 'Retry Hero Headline',
        subheading: 'Retry Hero Subheading',
        ctaText: 'Retry CTA Text',
        ctaLink: '#retry-link',
        enabled: true,
      },
      citations: [],
      relatedNotes: [],
    };
    
    mockBrainProtocol.setOptions({
      customQueryResponse: mockResponse,
    });
    
    // Mock processQuery with a spy function
    const processQueryMock = mock((_query: string, _options: Record<string, unknown>) => Promise.resolve(mockResponse));
    const originalProcessQuery = mockBrainProtocol.processQuery;
    mockBrainProtocol.processQuery = processQueryMock as unknown as typeof mockBrainProtocol.processQuery;
    
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
    expect(processQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('Test prompt template'),
      expect.objectContaining({
        schema: heroSchema,
      }),
    );
    
    // Verify retryCount in result
    expect(result.retryCount).toBe(1);
    
    // Restore original function
    mockBrainProtocol.processQuery = originalProcessQuery;
  });
});