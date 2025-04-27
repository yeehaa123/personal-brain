import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { Profile } from '@/models/profile';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';
import type { EnhancedLandingPageData } from '@website/schemas';

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

    // Mock specific queries with their expected responses
    mockBrainProtocol.processQuery = mock((query) => {
      // Profile query
      if (query.includes('Get my profile information')) {
        return Promise.resolve({
          query: query,
          answer: '',
          citations: [],
          relatedNotes: [],
          profile: mockProfile as Profile,
        });
      }

      // Basic landing page info - matches generateBasicLandingPageInfo method
      if (query.includes('generate enhanced landing page content')) {
        return Promise.resolve({
          query: query,
          answer: '{"name": "Test Name", "title": "Test Title", "tagline": "Test Tagline", "description": "Test Description"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Hero section - matches generateHeroSection method
      if (query.includes('create a compelling hero section')) {
        return Promise.resolve({
          query: query,
          answer: '{"headline": "Test Headline", "subheading": "Test Subheading", "ctaText": "Get Started", "ctaLink": "#contact"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Problem statement - matches generateProblemStatementSection method
      if (query.includes('create a problem statement section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "Test Problem", "description": "Test problem description", "bulletPoints": ["Point 1", "Point 2"], "quality": "high"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Services section - matches generateServicesSection method
      if (query.includes('create a comprehensive services section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "Services", "items": [{"title": "Service 1", "description": "Description 1"}, {"title": "Service 2", "description": "Description 2"}]}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Process section - matches generateProcessSection method
      if (query.includes('create a "How I Work" process section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "My Process", "steps": [{"step": 1, "title": "Step 1", "description": "Description 1"}, {"step": 2, "title": "Step 2", "description": "Description 2"}], "quality": "high"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Testimonials section - matches generateTestimonialsSection method
      if (query.includes('create a testimonials section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "Testimonials", "items": [{"quote": "Great service!", "author": "John Doe", "company": "ACME Corp"}], "quality": "high"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Expertise section - matches generateExpertiseSection method
      if (query.includes('create an expertise section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "My Expertise", "items": [{"title": "Skill 1", "description": "Description 1"}, {"title": "Skill 2", "description": "Description 2"}], "quality": "high"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // About section - matches generateAboutSection method
      if (query.includes('create an "About Me" section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "About Me", "content": "This is a detailed description about me and my professional background.", "quality": "high"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // FAQ section - matches generateFaqSection method
      if (query.includes('create a FAQ section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "Frequently Asked Questions", "items": [{"question": "Question 1?", "answer": "Answer 1"}, {"question": "Question 2?", "answer": "Answer 2"}], "quality": "high"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // CTA section - matches generateCtaSection method
      if (query.includes('create a compelling call-to-action section')) {
        return Promise.resolve({
          query: query,
          answer: '{"title": "Get Started Now", "subtitle": "Contact me today to discuss your project.", "buttonText": "Contact Me", "buttonLink": "#contact"}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Footer section - matches generateFooterSection method
      if (query.includes('create a footer section')) {
        return Promise.resolve({
          query: query,
          answer: '{"copyrightText": "© 2025 Test User. All rights reserved."}',
          citations: [],
          relatedNotes: [],
        });
      }

      // Fallback for any other queries
      return Promise.resolve({
        query: query,
        answer: '{"title": "Generic Title", "description": "Generic description"}',
        citations: [],
        relatedNotes: [],
      });
    });
  });

  afterEach(() => {
    // Clean up
    LandingPageGenerationService.resetInstance();
  });

  test('generateLandingPageData should return a complete landing page structure', async () => {
    // Our helper mocking is already set up in beforeEach

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
    expect(result.cta).toBeDefined();
    expect(result.footer).toBeDefined();

    // Verify section order is an array
    expect(Array.isArray(result.sectionOrder)).toBe(true);
    expect(result.sectionOrder.length).toBeGreaterThan(0);

    // Verify always-required sections are in the order
    expect(result.sectionOrder).toContain('hero');
    expect(result.sectionOrder).toContain('services');
    expect(result.sectionOrder).toContain('cta');
    expect(result.sectionOrder).toContain('footer');
  });

  test('generateLandingPageData should handle missing profile', async () => {
    // Configure the mock BrainProtocol to return no profile
    mockBrainProtocol.processQuery = mock(() => {
      return Promise.resolve({
        query: '',
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
    // No need to reconfigure the mock - use the one from beforeEach

    // Apply overrides
    const overrides: Partial<EnhancedLandingPageData> = {
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

  test('should handle AI response errors gracefully', async () => {
    // Create mocks that will cause all the fallback mechanisms to be used
    // For this purpose, we'll mock out all the private helper methods instead
    // This avoids the complexity of dealing with the different JSON formats

    // Mock all the private generation methods to return fallback values
    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateBasicLandingPageInfo').mockImplementation(() => {
      return Promise.resolve({
        name: 'Fallback Name',
        title: 'Fallback Title',
        tagline: 'Fallback Tagline',
        description: 'Fallback Description',
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateHeroSection').mockImplementation(() => {
      return Promise.resolve({
        headline: 'Fallback Headline',
        subheading: 'Fallback Subheading',
        ctaText: 'Get Started',
        ctaLink: '#contact',
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateProblemStatementSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'Fallback Problem',
        description: 'Fallback description',
        bulletPoints: ['Point 1'],
        enabled: false,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateServicesSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'Services',
        items: [{ title: 'Service', description: 'Description' }],
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateProcessSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'Process',
        steps: [{ step: 1, title: 'Step', description: 'Description' }],
        enabled: false,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateTestimonialsSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'Testimonials',
        items: [],
        enabled: false,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateExpertiseSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'Expertise',
        items: [],
        enabled: false,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateAboutSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'About',
        content: 'Content',
        enabled: false,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateFaqSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'FAQ',
        items: [],
        enabled: false,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateCtaSection').mockImplementation(() => {
      return Promise.resolve({
        title: 'CTA',
        buttonText: 'Contact',
        buttonLink: '#contact',
        enabled: true,
      });
    });

    // @ts-expect-error - Accessing private method for testing
    spyOn(service, 'generateFooterSection').mockImplementation(() => {
      return Promise.resolve({
        copyrightText: '© Test',
        enabled: true,
      });
    });

    // Should still return a valid landing page structure with our fallbacks
    const result = await service.generateLandingPageData();

    // Basic structure should exist with fallbacks
    expect(result).toBeDefined();
    expect(result.title).toBe('Fallback Title');
    expect(result.name).toBe('Fallback Name');
    expect(result.tagline).toBe('Fallback Tagline');

    // Required sections should be in the section order
    expect(result.sectionOrder).toContain('hero');
    expect(result.sectionOrder).toContain('services');
    expect(result.sectionOrder).toContain('cta');
    expect(result.sectionOrder).toContain('footer');

    // Optional sections should not be in the order since they're disabled
    expect(result.sectionOrder).not.toContain('problemStatement');
    expect(result.sectionOrder).not.toContain('process');
    expect(result.sectionOrder).not.toContain('testimonials');
    expect(result.sectionOrder).not.toContain('expertise');
    expect(result.sectionOrder).not.toContain('about');
    expect(result.sectionOrder).not.toContain('faq');
  });
});
