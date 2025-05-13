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

// Test fixture constants
const TEST_HERO_CONTENT = {
  headline: 'New Hero Headline',
  subheading: 'New Hero Subheading',
  ctaText: 'New CTA Text',
  ctaLink: '#new-link',
  enabled: true,
};

const TEST_RETRY_CONTENT = {
  headline: 'Retry Hero Headline',
  subheading: 'Retry Hero Subheading',
  ctaText: 'Retry CTA Text',
  ctaLink: '#retry-link',
  enabled: true,
};

const TEST_FALLBACK_CONTENT = {
  headline: 'Fallback Hero Headline',
  subheading: 'Fallback hero subheading',
  ctaText: 'Contact Us',
  ctaLink: '#contact',
  enabled: false,
};

// Simplified test data factories
const createTestFixtures = () => {
  // Minimal landing page with just what's needed for tests
  const landingPage = {
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
    sectionOrder: ['hero'],
  } as LandingPageData;
  
  // Identity data with all required fields for the real implementation
  const identity = {
    personalData: { 
      name: 'Test User',
      email: 'test@example.com',
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
    },
  } as WebsiteIdentityData;
  
  // Schema used in all tests
  const heroSchema = z.object({
    headline: z.string(),
    subheading: z.string(),
    ctaText: z.string(),
    ctaLink: z.string(),
    enabled: z.boolean().optional(),
  });
  
  return { landingPage, identity, heroSchema };
};

describe('SectionGenerationService', () => {
  let service: SectionGenerationService;
  let mockBrainProtocol: MockBrainProtocol;
  let processQueryMock: ReturnType<typeof mock>;
  
  beforeEach(() => {
    // Reset instances for clean test state
    SectionGenerationService.resetInstance();
    FallbackContentGenerator.resetInstance();
    MockBrainProtocol.resetInstance();
    
    // Create mock brain protocol with default response
    mockBrainProtocol = MockBrainProtocol.createFresh({
      customQueryResponse: {
        answer: 'Mock landing page section response',
        object: TEST_HERO_CONTENT,
        citations: [],
        relatedNotes: [],
      },
    });
    
    // Create process query mock for verification
    processQueryMock = mock((_query: string, _options: Record<string, unknown>) => 
      Promise.resolve({
        answer: 'test',
        object: TEST_HERO_CONTENT,
        citations: [],
        relatedNotes: [],
      } as QueryResult<unknown>));
    
    mockBrainProtocol.processQuery = processQueryMock as unknown as typeof mockBrainProtocol.processQuery;
    
    // Initialize service with mock
    service = SectionGenerationService.getInstance();
    service.setBrainProtocol(mockBrainProtocol as unknown as BrainProtocol);
  });
  
  test('follows Component Interface Standardization pattern', () => {
    // Combine pattern tests into one to reduce boilerplate
    const instance1 = SectionGenerationService.getInstance();
    const instance2 = SectionGenerationService.getInstance();
    expect(instance1).toBe(instance2); // Singleton behavior
    
    SectionGenerationService.resetInstance();
    const instance3 = SectionGenerationService.getInstance();
    expect(instance3).not.toBe(instance1); // Reset works
    
    const freshInstance = SectionGenerationService.createFresh();
    expect(freshInstance).not.toBe(instance3); // CreateFresh works
  });
  
  test('successfully generates section content', async () => {
    const { landingPage, identity, heroSchema } = createTestFixtures();
    
    // Generate the section
    const result = await service.generateSection(
      landingPage,
      'hero',
      'Test prompt template',
      heroSchema,
      identity,
    );
    
    // Verify with minimal but sufficient assertions
    expect(result.status).toBe(SectionGenerationStatus.Completed);
    expect(result.data).toEqual(TEST_HERO_CONTENT);
    expect(landingPage.hero).toEqual(TEST_HERO_CONTENT);
    
    // Verify call parameters
    expect(processQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('Test prompt template'),
      expect.objectContaining({ schema: heroSchema }),
    );
  });
  
  test('handles errors and provides fallback content', async () => {
    const { landingPage, identity, heroSchema } = createTestFixtures();
    
    // Configure error case
    mockBrainProtocol.processQuery = mock(() => {
      throw new Error('Generation failed');
    }) as unknown as typeof mockBrainProtocol.processQuery;
    
    // Mock fallback generator
    const mockFallbackGenerator = FallbackContentGenerator.getInstance();
    mockFallbackGenerator.getFallbackContent = mock(() => TEST_FALLBACK_CONTENT);
    
    // Verify error is thrown during generation
    await expect(
      service.generateSection(landingPage, 'hero', 'Test prompt', heroSchema, identity),
    ).rejects.toThrow('Generation failed');
    
    // Verify fallback content
    const fallback = service.applyFallbackContent(landingPage, 'hero');
    expect(fallback).toEqual(TEST_FALLBACK_CONTENT);
    expect(landingPage.hero).toEqual(TEST_FALLBACK_CONTENT);
    expect(mockFallbackGenerator.getFallbackContent).toHaveBeenCalledWith('hero');
  });
  
  test('applies simplified options for retries', async () => {
    const { landingPage, identity, heroSchema } = createTestFixtures();
    
    // Configure retry response
    const retryResponseMock = mock(() => 
      Promise.resolve({
        answer: 'Retry response',
        object: TEST_RETRY_CONTENT,
        citations: [],
        relatedNotes: [],
      } as QueryResult<unknown>),
    );
    
    mockBrainProtocol.processQuery = retryResponseMock as unknown as typeof mockBrainProtocol.processQuery;
    
    // Generate with retry options
    const result = await service.generateSection(
      landingPage,
      'hero',
      'Test prompt template',
      heroSchema,
      identity,
      { isRetry: true, simplifyPrompt: true },
    );
    
    // Verify retry behavior
    expect(result.status).toBe(SectionGenerationStatus.Completed);
    expect(result.data).toEqual(TEST_RETRY_CONTENT);
    expect(result.retryCount).toBe(1);
    expect(retryResponseMock).toHaveBeenCalledTimes(1);
  });
});