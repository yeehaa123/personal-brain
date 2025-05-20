import { beforeEach, describe, expect, test } from 'bun:test';
import { z } from 'zod';

import { SectionGenerationService } from '@/contexts/website/services/landingPage/sectionGenerationService';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { QueryResult } from '@/protocol/types';
import { createTestIdentityData } from '@test/helpers/websiteTestHelpers';
import type { LandingPageData } from '@website/schemas';

// Mock BrainProtocol that returns test data
class MockBrainProtocol {
  private response: QueryResult = {
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
  };

  async processQuery<T = unknown>(): Promise<QueryResult<T>> {
    return this.response as QueryResult<T>;
  }

  setResponse(response: QueryResult | Promise<QueryResult>) {
    this.response = response as QueryResult;
  }

  throwError() {
    this.response = null as unknown as QueryResult;
  }
}

describe('SectionGenerationService', () => {
  let service: SectionGenerationService;
  let mockBrainProtocol: MockBrainProtocol;
  
  beforeEach(() => {
    mockBrainProtocol = new MockBrainProtocol();
    service = SectionGenerationService.createFresh();
    service.setBrainProtocol(mockBrainProtocol as unknown as BrainProtocol);
  });
  
  test('generates section content', async () => {
    const landingPage = {
      title: 'Test Page',
      hero: {
        headline: 'Original Hero Headline',
        subheading: 'Original Hero Subheading',
        ctaText: 'Learn More',
        ctaLink: '#contact',
      },
      sectionOrder: ['hero'],
    } as LandingPageData;
    
    const heroSchema = z.object({
      headline: z.string(),
      subheading: z.string(),
      ctaText: z.string(),
      ctaLink: z.string(),
      enabled: z.boolean().optional(),
    });
    
    const identity = createTestIdentityData();
    
    const result = await service.generateSection(
      landingPage,
      'hero',
      'Test prompt template',
      heroSchema,
      identity,
    );
    
    expect(result.status).toBe(SectionGenerationStatus.Completed);
    expect(result.data).toBeDefined();
    
    // Type assertion based on the schema we passed
    if (result.data) {
      const heroData = result.data as z.infer<typeof heroSchema>;
      expect(heroData.headline).toBe('New Hero Headline');
    }
    expect(landingPage.hero.headline).toBe('New Hero Headline');
  });
  
  test('handles errors gracefully', async () => {
    // Configure error case
    mockBrainProtocol.setResponse(Promise.reject(new Error('Generation failed')));
    
    const landingPage = {
      title: 'Test Page',
      hero: {},
      sectionOrder: ['hero'],
    } as LandingPageData;
    
    const heroSchema = z.object({
      headline: z.string(),
    });
    
    await expect(
      service.generateSection(landingPage, 'hero', 'Test', heroSchema, createTestIdentityData()),
    ).rejects.toThrow('Generation failed');
  });
  
  test('applies fallback content when needed', async () => {
    const landingPage = {
      title: 'Test Page',
      hero: {},
      sectionOrder: ['hero'],
    } as LandingPageData;
    
    const fallback = service.applyFallbackContent(landingPage, 'hero');
    
    expect(fallback).toBeDefined();
    
    // Type assertion for the fallback content
    const heroFallback = fallback as { headline: string; subheading: string };
    expect(heroFallback.headline).toBeDefined();
    
    // Compare with type assertion for both values
    expect(landingPage.hero).toEqual(fallback as typeof landingPage.hero);
  });
});