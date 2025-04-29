import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { SegmentCacheService } from '@/contexts/website/services/landingPage/segmentCacheService';
import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { Profile } from '@/models/profile';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { QueryOptions, QueryResult } from '@/protocol/types';
import { MockSegmentCacheService } from '@test/__mocks__/contexts/website/services/landingPage/segmentCacheService';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';

describe('LandingPageGenerationService', () => {
  let service: LandingPageGenerationService;
  let mockBrainProtocol: MockBrainProtocol;
  const mockProfile = MockProfile.createDefault();

  // Helper function removed since it's no longer used after we switched to directly mocking
  // specific query responses

  let mockSegmentCache: MockSegmentCacheService;
  
  beforeEach(() => {
    // Reset dependencies
    MockBrainProtocol.resetInstance();
    MockSegmentCacheService.resetInstance();
    LandingPageGenerationService.resetInstance();

    // Configure mock brain protocol
    mockBrainProtocol = MockBrainProtocol.getInstance();
    
    // Configure mock segment cache
    mockSegmentCache = MockSegmentCacheService.getInstance();
    
    // Mock the SegmentCacheService.getInstance to return our mock
    spyOn(SegmentCacheService, 'getInstance').mockImplementation(() => {
      return mockSegmentCache as unknown as SegmentCacheService;
    });

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

      // For identity segment
      if (query.includes('core identity segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          object: {
            title: 'Professional Services',
            description: 'Expert consulting services',
            name: 'Test Expert',
            tagline: 'Solving complex problems',
            hero: {
              headline: 'Transform Your Business',
              subheading: 'Expert guidance for modern challenges',
              ctaText: 'Get Started',
              ctaLink: '#contact',
            },
            segmentType: 'identity',
          },
        });
      }
      
      // For service offering segment
      if (query.includes('service offering segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          object: {
            services: {
              title: 'Services',
              items: [{
                title: 'Strategic Consulting',
                description: 'Expert guidance for your business',
              }],
            },
            segmentType: 'serviceOffering',
          },
        });
      }
      
      // For credibility segment
      if (query.includes('credibility segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          object: {
            caseStudies: {
              title: 'Case Studies',
              items: [{
                title: 'Business Transformation',
                challenge: 'Complex legacy systems',
                approach: 'Modern architecture implementation',
                results: 'Increased efficiency by 40%',
              }],
            },
            segmentType: 'credibility',
          },
        });
      }
      
      // For conversion segment
      if (query.includes('conversion segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          object: {
            faq: {
              title: 'FAQ',
              items: [{
                question: 'How does your service work?',
                answer: 'We follow a proven approach tailored to your needs.',
              }],
            },
            segmentType: 'conversion',
          },
        });
      }

      // For final review
      if (query.includes('CONTENT TO REVIEW')) {
        const landingPageData = {
          title: 'Professional Services Reviewed',
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
      
      // For content review (phase 2)
      if (query.includes('You are a professional editor for landing page content')) {
        const improvedLandingPageData = {
          title: 'Professional Services Enhanced',
          description: 'Expert services for ambitious professionals',
          name: 'Test Professional',
          tagline: 'Quality expertise you can trust',
          hero: {
            headline: 'Transform Your Business Today',
            subheading: 'Professional services precisely tailored to your needs',
            ctaText: 'Get Started Now',
            ctaLink: '#contact',
          },
          services: {
            title: 'Services',
            items: [
              { title: 'Strategic Consulting', description: 'Expert guidance to accelerate your projects' },
              { title: 'Professional Development', description: 'Implementation services with measurable results' },
            ],
          },
          sectionOrder: ['hero', 'services', 'about', 'cta', 'footer'],
        };

        return Promise.resolve({
          answer: 'Improved landing page content',
          citations: [],
          relatedNotes: [],
          object: improvedLandingPageData,
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
    // Clear cache and make hasSegment return false to force generation
    mockSegmentCache.clearAllSegments();
    mockSegmentCache.hasSegment.mockImplementation(() => false);
    
    // Call the method with default options
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
    
    // Verify that the segments were saved to cache
    expect(mockSegmentCache.saveSegment).toHaveBeenCalled();
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

  test('should generate only specified segments', async () => {
    // Clear cache and make hasSegment return false to force generation
    mockSegmentCache.clearAllSegments();
    mockSegmentCache.hasSegment.mockImplementation(() => false);
    
    // Call the method with specific segments
    const result = await service.generateLandingPageData({
      segmentsToGenerate: ['identity', 'serviceOffering'],
    });

    // Verify basic structure and required fields
    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.services).toBeDefined();
    
    // Check that processQuery was called for profile and selected segments
    let profileQueried = false;
    let identitySegmentQueried = false;
    let serviceOfferingSegmentQueried = false;
    
    // Type assertion to access mock property safely
    const mockProcessQuery = mockBrainProtocol.processQuery as unknown as {
      mock: { calls: Array<[string, unknown?]> };
    };
    
    for (const call of mockProcessQuery.mock.calls) {
      const query = call[0];
      if (typeof query === 'string') {
        if (query.includes('Get my profile information')) {
          profileQueried = true;
        }
        // Check for different variations of the segment prompt text
        if (query.includes('identity segment')) {
          identitySegmentQueried = true;
        }
        if (query.includes('service offering segment')) {
          serviceOfferingSegmentQueried = true;
        }
      }
    }
    
    // Verify that processQuery was called for profile and relevant segments
    expect(profileQueried).toBe(true);
    expect(identitySegmentQueried).toBe(true);
    expect(serviceOfferingSegmentQueried).toBe(true);
    
    // Verify that only the specified segments were saved
    let identitySaved = false;
    let serviceOfferingSaved = false;
    
    for (const call of mockSegmentCache.saveSegment.mock.calls) {
      const segmentType = call[0];
      if (segmentType === 'identity') {
        identitySaved = true;
      } 
      if (segmentType === 'serviceOffering') {
        serviceOfferingSaved = true;
      }
    }
    
    expect(identitySaved).toBe(true);
    expect(serviceOfferingSaved).toBe(true);
  });

  test('should skip review when specified', async () => {
    // Clear cache and make hasSegment return false to force generation
    mockSegmentCache.clearAllSegments();
    mockSegmentCache.hasSegment.mockImplementation(() => false);
    
    // Call the method with skipReview option
    await service.generateLandingPageData({
      skipReview: true,
    });
    
    // Check that the review was not called
    let reviewCalled = false;
    
    // Type assertion to access mock property safely
    const mockProcessQuery = mockBrainProtocol.processQuery as unknown as {
      mock: { calls: Array<[string, unknown?]> };
    };
    
    for (const call of mockProcessQuery.mock.calls) {
      if (call[0] && typeof call[0] === 'string' && call[0].includes('CONTENT TO REVIEW')) {
        reviewCalled = true;
      }
    }
    
    expect(reviewCalled).toBe(false);
    
    // Verify that the status was updated correctly
    const status = service.getSegmentGenerationStatus();
    expect(status.reviewed).toBe(false);
  });

  test('should apply custom overrides to landing page', async () => {
    // Clear cache and make hasSegment return false to force generation
    mockSegmentCache.clearAllSegments();
    mockSegmentCache.hasSegment.mockImplementation(() => false);
    
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

    const result = await service.generateLandingPageData({}, overrides);

    // Verify overrides were applied correctly
    expect(result.title).toBe('Custom Title');
    expect(result.tagline).toBe('Custom Tagline');
    expect(result.hero.headline).toBe('Custom Headline');
    expect(result.hero.subheading).toBe('Custom Subheading');
    expect(result.hero.ctaText).toBe('Custom CTA');
    expect(result.hero.ctaLink).toBe('#custom');
  });
  
  test('segmented approach with review should produce a cohesive result', async () => {
    // Clear cache and make hasSegment return false to force generation
    mockSegmentCache.clearAllSegments();
    mockSegmentCache.hasSegment.mockImplementation(() => false);
    
    // Mock review response
    mockBrainProtocol.processQuery = mock((query) => {
      // Profile query
      if (query.includes('Get my profile information')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          profile: mockProfile as Profile,
        });
      }
      
      // For content review prompt
      if (query.includes('CONTENT TO REVIEW')) {
        return Promise.resolve({
          answer: 'Generated landing page content',
          citations: [],
          relatedNotes: [],
          object: {
            title: 'Professional Services Reviewed',
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
          },
        });
      }
      
      // Default segment generation responses
      return Promise.resolve({
        answer: '',
        citations: [],
        relatedNotes: [],
        object: {
          segmentType: query.includes('identity') ? 'identity' :
            query.includes('service') ? 'serviceOffering' :
              query.includes('credibility') ? 'credibility' : 'conversion',
        },
      });
    }) as unknown as <T = unknown>(_query: string, _options?: QueryOptions<T>) => Promise<QueryResult<T>>;
    
    const result = await service.generateLandingPageData();
    
    // Verify the reviewed content was used
    expect(result.title).toBe('Professional Services Reviewed');
    
    // Verify it contains content from multiple segments
    expect(result.hero).toBeDefined();
    expect(result.services).toBeDefined();
    
    // Verify the segments were combined
    expect(result.sectionOrder).toContain('hero');
    expect(result.sectionOrder).toContain('services');
    
    // Verify that the review status is updated
    const status = service.getSegmentGenerationStatus();
    expect(status.reviewed).toBe(true);
  });

  test('should handle incomplete segments and provide defaults', async () => {
    // Mock BrainProtocol to return incomplete segments
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

      if (query.includes('identity segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          // Minimal identity segment
          object: {
            title: 'Incomplete Page',
            name: 'Test Person', 
            description: 'Test description',
            tagline: 'Test tagline',
            hero: {
              headline: 'Test headline',
              subheading: 'Test subheading',
              ctaText: 'Test CTA',
              ctaLink: '#test',
            },
            segmentType: 'identity',
          },
        });
      }
      
      if (query.includes('service offering segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          // Minimal service offering segment
          object: {
            services: {
              title: 'Minimal Services',
              items: [{ title: 'Basic Service', description: 'Test description' }],
            },
            segmentType: 'serviceOffering',
          },
        });
      }
      
      // Return minimal segments for the remaining types
      if (query.includes('credibility segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          object: {
            segmentType: 'credibility',
          },
        });
      }
      
      if (query.includes('conversion segment')) {
        return Promise.resolve({
          answer: '',
          citations: [],
          relatedNotes: [],
          object: {
            segmentType: 'conversion',
          },
        });
      }
      
      // Return empty for unknown queries
      return Promise.resolve({
        answer: '',
        citations: [],
        relatedNotes: [],
        object: null,
      });
    }) as unknown as <T = unknown>(_query: string, _options?: QueryOptions<T>) => Promise<QueryResult<T>>;

    // Clear the segment cache to ensure we generate new content
    mockSegmentCache.clearAllSegments();
    
    // Make sure hasSegment returns false so we generate new segments
    mockSegmentCache.hasSegment.mockImplementation(() => false);
    
    // Service should handle incomplete segments
    const result = await service.generateLandingPageData();

    // Verify the service included the provided values
    expect(result).toBeDefined();
    expect(result.title).toBe('Incomplete Page');      // Should keep provided value
    expect(result.name).toBe('Test Person');           // Should keep provided value
    expect(result.services.title).toBe('Minimal Services'); // Should keep provided value
    
    // Verify other required fields exist
    expect(result.sectionOrder).toBeDefined();
    expect(Array.isArray(result.sectionOrder)).toBe(true);
    expect(result.sectionOrder.length).toBeGreaterThan(0);
    
    // Verify that saveSegment was called for each segment
    expect(mockSegmentCache.saveSegment).toHaveBeenCalled();
  });
});
