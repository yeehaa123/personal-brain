import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { Profile } from '@/models/profile';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { QueryOptions, QueryResult } from '@/protocol/types';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';

describe('LandingPageGenerationService', () => {
  let service: LandingPageGenerationService;
  let mockBrainProtocol: MockBrainProtocol;
  const mockProfile = MockProfile.createDefault();

  // Helper function removed since it's no longer used after we switched to directly mocking
  // specific query responses

  beforeEach(() => {
    // Reset dependencies
    MockBrainProtocol.resetInstance();
    LandingPageGenerationService.resetInstance();

    // Configure mock brain protocol
    mockBrainProtocol = MockBrainProtocol.getInstance();

    // Create a fresh service instance
    service = LandingPageGenerationService.createFresh();

    // Mock getBrainProtocol to return our configured mock
    spyOn(service, 'getBrainProtocol').mockImplementation(() => {
      return mockBrainProtocol as unknown as BrainProtocol;
    });

    // Use any type for the mock, then we can cast the final result
    mockBrainProtocol.processQuery = mock(function (query: string, _options?: unknown) {
      // Profile query
      if (query.includes('Get my profile information')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          profile: mockProfile as Profile,
        });
      }

      // For schema-based landing page generation
      if (query.includes('professional landing page')) {
        const landingPageData = {
          title: 'Professional Services',
          description: 'Expert services for professionals',
          name: 'Test Professional',
          tagline: 'Quality expertise you can trust',
          hero: {
            headline: 'Transform Your Business',
            subheading: 'Professional services tailored to your needs',
            ctaText: 'Get Started',
            ctaLink: '#contact',
          },
          services: {
            title: 'Services',
            items: [
              { title: 'Consulting', description: 'Expert advice for your projects' },
              { title: 'Development', description: 'Professional implementation services' },
            ],
          },
          sectionOrder: ['hero', 'services', 'about', 'cta', 'footer'],
        };

        return Promise.resolve({
          answer: 'Generated landing page content',
          citations: [],
          relatedNotes: [],
          object: landingPageData,
        });
      }

      // Fallback for any other queries
      return Promise.resolve({
        answer: 'Default mock response',
        citations: [],
        relatedNotes: [],
      });
    }) as unknown as <T = unknown>(_query: string, _options?: QueryOptions<T>) => Promise<QueryResult<T>>;
  });

  afterEach(() => {
    // Clean up
    LandingPageGenerationService.resetInstance();
  });

  test('generateLandingPageData should return a complete landing page structure', async () => {
    // Call the method
    const result = await service.generateLandingPageData();

    // Verify basic structure and required fields
    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.tagline).toBeDefined();

    // Verify required sections exist
    expect(result.hero).toBeDefined();
    expect(result.services).toBeDefined();

    // Verify section order is an array
    expect(Array.isArray(result.sectionOrder)).toBe(true);
    expect(result.sectionOrder.length).toBeGreaterThan(0);

    // Verify always-required sections are in the order
    expect(result.sectionOrder).toContain('hero');
    expect(result.sectionOrder).toContain('services');
  });

  test('generateLandingPageData should handle missing profile', async () => {
    // Configure the mock BrainProtocol to return no profile
    mockBrainProtocol.processQuery = mock(() => {
      return Promise.resolve({
        answer: '',
        citations: [],
        relatedNotes: [],
        profile: undefined,
      });
    });

    // Should throw when profile is missing
    expect(service.generateLandingPageData()).rejects.toThrow('No profile found');
  });

  test('should apply custom overrides to landing page', async () => {
    // Apply overrides
    const overrides: Partial<LandingPageData> = {
      title: 'Custom Title',
      tagline: 'Custom Tagline',
      hero: {
        headline: 'Custom Headline',
        subheading: 'Custom Subheading',
        ctaText: 'Custom CTA',
        ctaLink: '#custom',
      },
    };

    const result = await service.generateLandingPageData(overrides);

    // Verify overrides were applied correctly
    expect(result.title).toBe('Custom Title');
    expect(result.tagline).toBe('Custom Tagline');
    expect(result.hero.headline).toBe('Custom Headline');
    expect(result.hero.subheading).toBe('Custom Subheading');
    expect(result.hero.ctaText).toBe('Custom CTA');
    expect(result.hero.ctaLink).toBe('#custom');
  });

  test('should handle schema validation and provide defaults for missing fields', async () => {
    // Mock BrainProtocol to return a response missing some required fields
    mockBrainProtocol.processQuery = mock((query) => {
      // Profile query should still return a profile
      if (query.includes('Get my profile information')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          profile: mockProfile as Profile,
        });
      }

      // Return incomplete landing page data
      return Promise.resolve({
        answer: 'Partial landing page content',
        citations: [],
        relatedNotes: [],
        // Partial object missing some required fields
        object: {
          title: 'Incomplete Page',
          name: 'Test Person',
          // Missing: description, tagline, hero, services, sectionOrder
        },
      });
    }) as unknown as <T = unknown>(_query: string, _options?: QueryOptions<T>) => Promise<QueryResult<T>>;

    // Service should handle missing fields with defaults
    const result = await service.generateLandingPageData();

    // Verify the service provided default values for missing fields
    expect(result).toBeDefined();
    expect(result.title).toBe('Incomplete Page');  // Should keep provided value
    expect(result.name).toBe('Test Person');       // Should keep provided value
    expect(result.description).toBeDefined();      // Should have default
    expect(result.tagline).toBeDefined();          // Should have default
    expect(result.hero).toBeDefined();             // Should have default
    expect(result.services).toBeDefined();         // Should have default
    expect(result.sectionOrder).toBeDefined();     // Should have default
    expect(Array.isArray(result.sectionOrder)).toBe(true);
  });
});
