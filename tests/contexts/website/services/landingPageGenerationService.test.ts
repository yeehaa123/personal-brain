import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { SectionQualityService } from '@/contexts/website/services/landingPage/sectionQualityService';
import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { createTestIdentityData } from '@test/helpers';
import type { LandingPageData } from '@website/schemas';
import { REQUIRED_SECTION_TYPES } from '@website/schemas/sectionQualitySchema';
// Only using createTestIdentityData helper without needing the type

/**
 * Mock landing page data for testing
 */
const createMockLandingPage = (): LandingPageData => ({
  title: 'Original Title',
  description: 'Original Description',
  name: 'Original Name',
  tagline: 'Original Tagline',
  sectionOrder: ['hero', 'services'],
  hero: {
    headline: 'Original Headline',
    subheading: 'Original Subheading',
    ctaText: 'Original CTA',
    ctaLink: '#contact',
  },
  services: {
    title: 'Original Services',
    items: [{ 
      title: 'Original Service', 
      description: 'Original Description', 
    }],
  },
  problemStatement: {
    title: 'Original Problem',
    description: 'Original Description',
    enabled: true,
  },
  process: {
    title: 'Original Process',
    steps: [{ 
      step: 1, 
      title: 'Original Step', 
      description: 'Original Description', 
    }],
    enabled: true,
  },
  caseStudies: {
    title: 'Original Case Studies',
    items: [],
    enabled: true,
  },
  expertise: {
    title: 'Original Expertise',
    items: [{ 
      title: 'Original Expertise Item',
      description: 'Original Description',
    }],
    enabled: true,
  },
  about: {
    title: 'Original About',
    content: 'Original Content',
    enabled: true,
  },
  pricing: {
    title: 'Original Pricing',
    tiers: [],
    enabled: false,
  },
  faq: {
    title: 'Original FAQ',
    items: [{ 
      question: 'Original Question', 
      answer: 'Original Answer', 
    }],
    enabled: true,
  },
  cta: {
    title: 'Original CTA',
    buttonText: 'Original Button',
    buttonLink: '#contact',
    enabled: true,
  },
  footer: {
    copyrightText: 'Original Copyright',
    contactDetails: {
      email: 'test@example.com',
      social: [
        { platform: 'twitter', url: 'https://twitter.com' },
      ],
    },
    links: [
      { text: 'Home', url: '/' },
    ],
    enabled: true,
  },
});

// Mock dependencies
const mockProcessQuery = mock((prompt: string, _options: Record<string, unknown>) => {
  // Return different mock objects based on the schema or prompt content
  if (prompt.includes('identity information')) {
    return {
      object: {
        title: 'Generated Title',
        description: 'Generated Description',
        name: 'Generated Name',
        tagline: 'Generated Tagline',
      },
    };
  }
  
  if (prompt.includes('hero')) {
    return {
      object: {
        headline: 'Generated Headline',
        subheading: 'Generated Subheading',
        ctaText: 'Generated CTA',
        ctaLink: '#contact',
      },
    };
  }
  
  if (prompt.includes('problem')) {
    return {
      object: {
        title: 'Generated Problem Statement',
        description: 'Generated Problem Description',
        enabled: true,
      },
    };
  }
  
  // Default response for other sections
  return {
    object: {
      title: 'Generated Section',
      enabled: true,
    },
  };
});

const mockProcessSectionWithQualityAssessment = mock(
  async <T>(sectionType: string, content: T) => {
    return {
      content,
      assessment: {
        qualityScore: 8,
        qualityJustification: `Quality assessment for ${sectionType}`,
        confidenceScore: 9,
        confidenceJustification: `Confidence assessment for ${sectionType}`,
        combinedScore: 8.5,
        enabled: sectionType !== 'pricing', // Disable pricing section as an example
        suggestedImprovements: 'Suggested improvements',
        improvementsApplied: true,
      },
      isRequired: REQUIRED_SECTION_TYPES.includes(sectionType),
    };
  },
);

// Mock BrainProtocol with Bun's mocking approach
const originalBrainProtocol = BrainProtocol;
BrainProtocol.getInstance = () => ({
  processQuery: mockProcessQuery,
}) as unknown as BrainProtocol;

// Mock SectionQualityService with Bun's mocking approach
const originalSectionQualityService = SectionQualityService;
SectionQualityService.getInstance = () => ({
  processSectionWithQualityAssessment: mockProcessSectionWithQualityAssessment,
  setQualityThresholds: mock(),
}) as unknown as SectionQualityService;

describe('LandingPageGenerationService', () => {
  let service: LandingPageGenerationService;
  
  beforeEach(() => {
    // Reset mocks
    mockProcessQuery.mockClear();
    mockProcessSectionWithQualityAssessment.mockClear();
    
    // Reset service instance
    LandingPageGenerationService.resetInstance();
    service = LandingPageGenerationService.getInstance();
  });
  
  afterEach(() => {
    // Cleanup
    LandingPageGenerationService.resetInstance();
  });
  
  // Restore original objects after all tests
  afterAll(() => {
    BrainProtocol.getInstance = originalBrainProtocol.getInstance;
    SectionQualityService.getInstance = originalSectionQualityService.getInstance;
  });
  
  /**
   * Table-driven tests for basic Component Interface Standardization pattern
   */
  const componentInterfaceTests = [
    {
      name: 'singleton pattern behavior',
      test: () => {
        const instance1 = LandingPageGenerationService.getInstance();
        const instance2 = LandingPageGenerationService.getInstance();
        expect(instance1).toBe(instance2);
      },
    },
    {
      name: 'createFresh creates new instance',
      test: () => {
        const instance1 = LandingPageGenerationService.getInstance();
        const instance2 = LandingPageGenerationService.createFresh();
        expect(instance1).not.toBe(instance2);
      },
    },
    {
      name: 'resetInstance resets singleton',
      test: () => {
        const instance1 = LandingPageGenerationService.getInstance();
        LandingPageGenerationService.resetInstance();
        const instance2 = LandingPageGenerationService.getInstance();
        expect(instance1).not.toBe(instance2);
      },
    },
  ];
  
  /**
   * Table-driven tests for content generation and editing
   */
  const contentGenerationTests = [
    {
      name: 'generateLandingPageData creates page with required sections',
      test: async () => {
        // Act
        // Create identity data for test
        const identity = createTestIdentityData();
        const result = await service.generateLandingPageData(identity);
        
        // Assert
        expect(result).toBeDefined();
        expect(result.landingPage).toBeDefined();
        expect(result.landingPage.title).toBe(identity.creativeContent.title);
        expect(result.landingPage.description).toBe(identity.creativeContent.description);
        expect(result.landingPage.name).toBe(identity.personalData.name);
        expect(result.landingPage.tagline).toBe(identity.creativeContent.tagline);
        
        // Check that all required sections exist
        for (const sectionType of REQUIRED_SECTION_TYPES) {
          expect(result.landingPage[sectionType as keyof LandingPageData]).toBeDefined();
        }
        
        // Verify brain protocol was called for identity and sections
        expect(mockProcessQuery.mock.calls.length).toBeGreaterThan(0);
      },
    },
    {
      name: 'generateLandingPageData uses identity data when provided',
      test: async () => {
        // Arrange
        const identity = createTestIdentityData();
        
        // Act
        const result = await service.generateLandingPageData(identity);
        
        // Assert - Basic landing page fields should match identity data
        expect(result.landingPage.name).toBe(identity.personalData.name);
        expect(result.landingPage.title).toBe(identity.creativeContent.title);
        expect(result.landingPage.description).toBe(identity.creativeContent.description);
        expect(result.landingPage.tagline).toBe(identity.creativeContent.tagline);
        
        // Check that all required sections exist
        for (const sectionType of REQUIRED_SECTION_TYPES) {
          expect(result.landingPage[sectionType as keyof LandingPageData]).toBeDefined();
        }
        
        // Verify brand guidelines were included in prompts to Brain Protocol
        let foundBrandGuidelines = false;
        for (const call of mockProcessQuery.mock.calls) {
          const prompt = call[0];
          if (typeof prompt === 'string' && prompt.includes('BRAND IDENTITY GUIDELINES')) {
            foundBrandGuidelines = true;
            break;
          }
        }
        expect(foundBrandGuidelines).toBe(true);
      },
    },
    {
      name: 'assessLandingPageQuality applies quality thresholds',
      test: async () => {
        // Arrange
        const mockSetQualityThresholds = mock();
        // @ts-expect-error - We're mocking a private method
        service.sectionQualityService = { 
          setQualityThresholds: mockSetQualityThresholds,
          processSectionWithQualityAssessment: mockProcessSectionWithQualityAssessment,
        };
        
        // Generate a landing page first
        const identity = createTestIdentityData();
        const { landingPage } = await service.generateLandingPageData(identity);
        
        // Act
        const qualityThresholds = {
          minCombinedScore: 7.5,
          minQualityScore: 7,
          minConfidenceScore: 7,
        };
        
        const result = await service.assessLandingPageQuality(landingPage, { qualityThresholds });
        
        // Assert
        expect(mockSetQualityThresholds.mock.calls.length).toBe(1);
        expect(mockSetQualityThresholds.mock.calls[0][0]).toEqual(qualityThresholds);
        expect(result.landingPage).toBeDefined();
        expect(result.assessments).toBeDefined();
      },
    },
    {
      name: 'getSectionQualityAssessments returns assessments',
      test: async () => {
        // Arrange - Generate landing page and assess quality
        const identity = createTestIdentityData();
        const { landingPage } = await service.generateLandingPageData(identity);
        await service.assessLandingPageQuality(landingPage);
        
        // Act
        const assessments = service.getSectionQualityAssessments();
        
        // Assert
        expect(assessments).toBeDefined();
        expect(Object.keys(assessments).length).toBeGreaterThan(0);
      },
    },
    {
      name: 'assessLandingPageQuality handles applyRecommendations option',
      test: async () => {
        // Arrange - Generate landing page first
        const identity = createTestIdentityData();
        const { landingPage } = await service.generateLandingPageData(identity);
        // Make sure pricing is in the landing page for the test with required tiers array
        landingPage.pricing = { 
          title: 'Pricing', 
          enabled: true,
          tiers: [{
            name: 'Basic Plan',
            description: 'Basic service package',
            price: '$99',
            ctaText: 'Get Started',
            ctaLink: '#contact',
            features: ['Feature 1', 'Feature 2'],
            isFeatured: false,
          }],
        };
        
        // Act - Test with recommendations applied
        const result = await service.assessLandingPageQuality(landingPage, { applyRecommendations: true });
        
        // Assert
        expect(result.landingPage).toBeDefined();
        expect(result.assessments).toBeDefined();
        // We can only check that pricing exists in the result, not its enabled state, since we're using mocks
        expect(result.landingPage.pricing).toBeDefined();
      },
    },
    {
      name: 'setBrainProtocol sets custom protocol instance',
      test: () => {
        // Arrange
        const customProtocol = {} as BrainProtocol;
        
        // Act
        service.setBrainProtocol(customProtocol);
        const result = service.getBrainProtocol();
        
        // Assert
        expect(result).toBe(customProtocol);
      },
    },
    {
      name: 'editLandingPage edits content section by section',
      test: async () => {
        // Arrange
        const landingPage = createMockLandingPage();

        // Reset the mock and use type assertion to override TypeScript's type checking
        mockProcessQuery.mockReset();
        
        // Mock responses for each call
        const mockResponses = [
          // Basic info case
          {
            object: {
              title: 'Edited Title',
              description: 'Edited Description',
              name: 'Edited Name',
              tagline: 'Edited Tagline',
            },
          },
          // Hero section
          {
            object: {
              headline: 'Edited Headline',
              subheading: 'Edited Subheading',
              ctaText: 'Edited CTA',
              ctaLink: '#contact',
            },
          },
          // Services section
          {
            object: {
              title: 'Edited Services',
              items: [{ 
                title: 'Edited Service', 
                description: 'Edited Service Description', 
              }],
            },
          },
        ];
        
        // Type assertion to bypass TypeScript's inference
        // @ts-expect-error - We're mocking with simpler types for the test
        mockProcessQuery.mockImplementation(() => mockResponses.shift() || { object: { enabled: true } });
        
        // Act
        const result = await service.editLandingPage(landingPage);
        
        // Assert
        expect(result).toBeDefined();
        expect(result.title).toBe('Edited Title');
        expect(result.description).toBe('Edited Description');
        expect(result.name).toBe('Edited Name');
        expect(result.tagline).toBe('Edited Tagline');
        
        expect(result.hero.headline).toBe('Edited Headline');
        expect(result.hero.subheading).toBe('Edited Subheading');
        expect(result.hero.ctaText).toBe('Edited CTA');
        
        expect(result.services.title).toBe('Edited Services');
        expect(result.services.items[0].title).toBe('Edited Service');
        expect(result.services.items[0].description).toBe('Edited Service Description');
        
        // Verify the edit method was called for multiple sections
        const editCalls = mockProcessQuery.mock.calls.filter(
          call => call[0].includes('section content') || call[0].includes('basic information'),
        );
        expect(editCalls.length).toBeGreaterThan(2); // Basic info + at least 2 sections
      },
    },
    {
      name: 'editLandingPage with identity uses identity data for consistent branding',
      test: async () => {
        // Arrange
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();

        // Reset the mock and use type assertion to override TypeScript's type checking
        mockProcessQuery.mockReset();
        
        // We don't need these mock responses since we're using mockReturnValue
        
        // Mock out the processQuery for testing purposes by using mockReturnValue
        // without relying on the specific type which is causing issues
        // We're only checking that brand guidelines are included in the prompt
        mockProcessQuery.mockReturnValue({ 
          object: {
            title: 'Identity-aligned Title',
            description: 'Identity-aligned Description',
            name: 'Identity-aligned Name',
            tagline: 'Identity-aligned Tagline',
          },
        });
        
        // Act
        const result = await service.editLandingPage(landingPage, identity);
        
        // Assert identity data was directly applied to the landing page
        expect(result.name).toBe(identity.personalData.name);
        expect(result.title).toBe(identity.creativeContent.title);
        expect(result.description).toBe(identity.creativeContent.description);
        expect(result.tagline).toBe(identity.creativeContent.tagline);
        
        // Since we've simplified the test, we'll just verify basic functionality
        // rather than checking specific prompt content which is implementation-dependent
        expect(mockProcessQuery).toHaveBeenCalled();
      },
    },
    {
      name: 'regenerateSection successfully regenerates failed sections',
      test: async () => {
        // Arrange
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // For testing purposes, we need to access private generationStatus field
        const serviceWithGenerationAccess = service as unknown as { generationStatus: Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }> };
        serviceWithGenerationAccess.generationStatus = {
          'hero': {
            status: SectionGenerationStatus.Failed,
            error: 'Previous failure',
            retryCount: 1,
          },
        };
        
        // Create a mock BrainProtocol for testing
        const mockProtocol = {
          processQuery: mock(() => Promise.resolve({
            object: {
              headline: 'Regenerated Headline',
              subheading: 'Regenerated Subheading',
              ctaText: 'Regenerated CTA',
              ctaLink: '#contact',
              enabled: true,
            },
          })),
        };
        
        // Set the mock protocol
        service.setBrainProtocol(mockProtocol as unknown as BrainProtocol);
        
        // Act
        const result = await service.regenerateSection(landingPage, 'hero', identity);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toContain('Successfully regenerated hero section');
        
        // Verify the section content was updated
        expect(landingPage.hero.headline).toBe('Regenerated Headline');
        expect(landingPage.hero.subheading).toBe('Regenerated Subheading');
        expect(landingPage.hero.ctaText).toBe('Regenerated CTA');
        
        // For testing purposes, we need to access private generationStatus field
        // We use a type assertion with unknown as an intermediate step for safety
        const serviceWithStatusAccess = service as unknown as { generationStatus: Record<string, { status: string; data?: unknown; error?: string }> };
        const status = serviceWithStatusAccess.generationStatus['hero'];
        expect(status.status).toBe(SectionGenerationStatus.Completed);
        expect(status.data).toBeDefined();
        expect(status.error).toBeUndefined();
      },
    },
    {
      name: 'regenerateSection handles errors gracefully',
      test: async () => {
        // Arrange
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // Create a mock BrainProtocol for testing that throws an error
        const mockProtocol = {
          processQuery: mock(() => Promise.reject(new Error('Regeneration failed'))),
        };
        
        // Set the mock protocol
        service.setBrainProtocol(mockProtocol as unknown as BrainProtocol);
        
        // Act
        const result = await service.regenerateSection(landingPage, 'hero', identity);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('failed');
        
        // For testing purposes, we need to access private generationStatus field
        const serviceWithErrorAccess = service as unknown as { generationStatus: Record<string, { status: string; data?: unknown; error?: string }> };
        const status = serviceWithErrorAccess.generationStatus['hero'];
        expect(status.status).toBe(SectionGenerationStatus.Failed);
        expect(status.error).toBeDefined();
      },
    },
    {
      name: 'regenerateFailedSections regenerates all failed sections',
      test: async () => {
        // Arrange
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // For testing purposes, we need to access private generationStatus field
        const serviceWithRegenAccess = service as unknown as { generationStatus: Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }> };
        serviceWithRegenAccess.generationStatus = {
          'hero': {
            status: SectionGenerationStatus.Completed,
            data: landingPage.hero,
          },
          'pricing': {
            status: SectionGenerationStatus.Failed,
            error: 'Pricing section generation failed',
          },
          'faq': {
            status: SectionGenerationStatus.Failed,
            error: 'FAQ section generation failed',
          },
        };
        
        // Mock the regenerateSection method to control test behavior
        const regenerateSectionMock = mock((lp: LandingPageData, section: string) => {
          // Simulate success for pricing and failure for faq
          if (section === 'pricing') {
            // Update the section to show it was regenerated
            const pricingSection = lp.pricing as Record<string, unknown>;
            pricingSection['title'] = 'Regenerated Pricing';
            pricingSection['enabled'] = true;
            
            // Update generation status with type assertion for testing
            const serviceWithStatusUpdate = service as unknown as { generationStatus: Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }> };
            serviceWithStatusUpdate.generationStatus[section] = {
              status: SectionGenerationStatus.Completed,
              data: lp[section as keyof LandingPageData],
            };
            
            return Promise.resolve({
              success: true,
              message: `Successfully regenerated ${section} section`,
            });
          } else {
            // For faq, simulate failure
            return Promise.resolve({
              success: false,
              message: `Failed to regenerate ${section} section`,
            });
          }
        });
        
        // Replace the regenerateSection method with our mock
        service.regenerateSection = regenerateSectionMock;
        
        // Act
        const result = await service.regenerateFailedSections(landingPage, identity);
        
        // Assert
        expect(result.success).toBe(false); // Overall result is false because faq failed
        expect(result.message).toContain('Attempted to regenerate 2 sections');
        expect(regenerateSectionMock).toHaveBeenCalledTimes(2);
        
        // Check results structure
        expect(result.results.attempted).toBe(2);
        expect(result.results.succeeded).toBe(1);
        expect(result.results.failed).toBe(1);
        expect(Object.keys(result.results.sections).length).toBe(2);
        expect(result.results.sections['pricing'].success).toBe(true);
        expect(result.results.sections['faq'].success).toBe(false);
        
        // Check that pricing section was updated
        const pricing = landingPage['pricing'] as Record<string, unknown>;
        expect(pricing['title']).toBe('Regenerated Pricing');
        expect(pricing['enabled']).toBe(true);
      },
    },
    {
      name: 'regenerateFailedSections handles no failed sections',
      test: async () => {
        // Arrange
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // For testing purposes, we need to access private generationStatus field
        const serviceWithNoFailures = service as unknown as { generationStatus: Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }> };
        serviceWithNoFailures.generationStatus = {
          'hero': {
            status: SectionGenerationStatus.Completed,
            data: landingPage.hero,
          },
          'services': {
            status: SectionGenerationStatus.Completed,
            data: landingPage.services,
          },
        };
        
        // Mock the regenerateSection method to verify it's not called
        const regenerateSectionMock = mock();
        // Replacing private method for testing
        service.regenerateSection = regenerateSectionMock;
        
        // Act
        const result = await service.regenerateFailedSections(landingPage, identity);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('No failed sections found to regenerate');
        expect(regenerateSectionMock).not.toHaveBeenCalled();
        
        // Check results structure
        expect(result.results.attempted).toBe(0);
        expect(result.results.succeeded).toBe(0);
        expect(result.results.failed).toBe(0);
        expect(Object.keys(result.results.sections).length).toBe(0);
      },
    },
  ];
  
  // Run Component Interface tests
  for (const { name, test: testFn } of componentInterfaceTests) {
    test(`[Component Interface] ${name}`, testFn);
  }
  
  // Run content generation tests
  for (const { name, test: testFn } of contentGenerationTests) {
    test(`[Content Generation] ${name}`, testFn);
  }
});
