import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { SectionQualityService } from '@/contexts/website/services/landingPage/sectionQualityService';
import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { createTestIdentityData, createTestLandingPageData } from '@test/helpers';
import type { LandingPageData } from '@website/schemas';
import { REQUIRED_SECTION_TYPES } from '@website/schemas/sectionQualitySchema';

// Use the standard test helper for creating landing page data
const createMockLandingPage = (): LandingPageData => createTestLandingPageData({
  title: 'Original Title',
  description: 'Original Description',
  name: 'Original Name',
  tagline: 'Original Tagline',
  
  // Override specific sections for testing
  hero: {
    headline: 'Original Headline',
    subheading: 'Original Subheading',
    ctaText: 'Original CTA',
    ctaLink: '#contact',
    imageUrl: '/test.jpg',
  },
  services: {
    title: 'Original Services',
    introduction: 'Original intro',
    items: [{ title: 'Service', description: 'Description' }],
  },
});

// Test response fixtures
const TEST_RESPONSES = {
  // Mock responses for different section types
  identity: {
    title: 'Generated Title',
    description: 'Generated Description',
    name: 'Generated Name',
    tagline: 'Generated Tagline',
  },
  hero: {
    headline: 'Generated Headline',
    subheading: 'Generated Subheading',
    ctaText: 'Generated CTA',
    ctaLink: '#contact',
  },
  regeneratedHero: {
    headline: 'Regenerated Headline',
    subheading: 'Regenerated Subheading',
    ctaText: 'Regenerated CTA',
    ctaLink: '#contact',
    enabled: true,
  },
  pricing: {
    title: 'Fixed Pricing',
    tiers: [{ name: 'Basic', price: '$10' }],
    enabled: true,
  },
  generic: {
    title: 'Generated Section',
    enabled: true,
  },
};

// Mock dependencies
const mockProcessQuery = mock((prompt: string, _options: Record<string, unknown>) => {
  // Return responses based on prompt content for predictable testing
  if (prompt.includes('identity information')) return { object: TEST_RESPONSES.identity };
  if (prompt.includes('hero')) return { object: TEST_RESPONSES.hero };
  if (prompt.includes('problem')) return { object: TEST_RESPONSES.generic };
  
  // Default response for any other section
  return { object: TEST_RESPONSES.generic };
});

// Simplified quality assessment mock
const mockProcessSectionWithQualityAssessment = mock(
  async <T>(sectionType: string, content: T) => ({
    content,
    assessment: {
      qualityScore: 8,
      confidenceScore: 9,
      combinedScore: 8.5,
      enabled: sectionType !== 'pricing', // Only disable pricing for testing
      suggestedImprovements: 'Some improvements',
      improvementsApplied: true,
    },
    isRequired: REQUIRED_SECTION_TYPES.includes(sectionType),
  }),
);

// Set up mocks
const originalBrainProtocol = BrainProtocol;
BrainProtocol.getInstance = () => ({
  processQuery: mockProcessQuery,
}) as unknown as BrainProtocol;

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
  
  // Note: We're not testing implementation details like singleton patterns 
  // but focusing on what the service actually does
  
  /**
   * Consolidated tests for core landing page functionality
   */
  const landingPageTests = [
    // Content generation test cases
    {
      name: 'generateLandingPageData creates page with identity data',
      test: async () => {
        const identity = createTestIdentityData();
        const result = await service.generateLandingPageData(identity);
        
        // Check essential functionality: identity data applied and all required sections present
        expect(result.landingPage.name).toBe(identity.personalData.name);
        expect(result.landingPage.title).toBe(identity.creativeContent.title);
        expect(result.landingPage.description).toBe(identity.creativeContent.description);
        
        for (const sectionType of REQUIRED_SECTION_TYPES) {
          expect(result.landingPage[sectionType as keyof LandingPageData]).toBeDefined();
        }
        
        expect(mockProcessQuery).toHaveBeenCalled();
      },
    },
    
    // Content quality assessment
    {
      name: 'assessLandingPageQuality evaluates content quality',
      test: async () => {
        const identity = createTestIdentityData();
        const { landingPage } = await service.generateLandingPageData(identity);
        
        const result = await service.assessLandingPageQuality(landingPage, { 
          qualityThresholds: { minQualityScore: 7 },
          applyRecommendations: true,
        });
        
        expect(result.landingPage).toBeDefined();
        expect(result.assessments).toBeDefined();
        
        const storedAssessments = service.getSectionQualityAssessments();
        expect(Object.keys(storedAssessments).length).toBeGreaterThan(0);
      },
    },
    
    // Dependency injection
    {
      name: 'dependency injection works for protocol and services',
      test: () => {
        const customProtocol = {} as BrainProtocol;
        service.setBrainProtocol(customProtocol);
        expect(service.getBrainProtocol()).toBe(customProtocol);
      },
    },
  ];

  /**
   * Tests for landing page editing capabilities
   */
  const editingTests = [
    {
      name: 'editLandingPage updates content section by section',
      test: async () => {
        const landingPage = createMockLandingPage();
        mockProcessQuery.mockReset();
        
        // Setup mock responses
        mockProcessQuery.mockImplementationOnce(() => ({
          object: {
            title: 'Edited Title',
            description: 'Edited Description',
            name: 'Edited Name',
            tagline: 'Edited Tagline',
          },
        })).mockImplementationOnce(() => ({
          object: {
            headline: 'Edited Headline',
            subheading: 'Edited Subheading',
            ctaText: 'Edited CTA',
            ctaLink: '#contact',
          },
        })).mockImplementationOnce(() => ({
          object: {
            title: 'Edited Services',
            items: [{ title: 'Edited Service', description: 'Edited Description' }],
            enabled: true,
          },
        }));
        
        // Act
        const result = await service.editLandingPage(landingPage);
        
        // Assert critical outputs only
        expect(result.title).toBe('Edited Title');
        expect(result.hero.headline).toBe('Edited Headline');
        expect(result.services.title).toBe('Edited Services');
        
        // Verify editing was attempted
        expect(mockProcessQuery.mock.calls.length).toBeGreaterThanOrEqual(3);
      },
    },
    
    {
      name: 'editLandingPage with identity applies branding',
      test: async () => {
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        mockProcessQuery.mockReset();
        mockProcessQuery.mockReturnValue({ object: { title: 'Mock Title', enabled: true } });
        
        const result = await service.editLandingPage(landingPage, identity);
        
        // Identity data should be directly applied
        expect(result.name).toBe(identity.personalData.name);
        expect(result.title).toBe(identity.creativeContent.title);
        expect(result.description).toBe(identity.creativeContent.description);
        expect(mockProcessQuery).toHaveBeenCalled();
      },
    },
  ];

  /**
   * Tests for section regeneration functionality
   */
  const regenerationTests = [
    {
      name: 'regenerateSection fixes failed sections',
      test: async () => {
        // Setup
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // Setup failed section status
        (service as unknown as { 
          generationStatus: Record<string, { status: SectionGenerationStatus; error?: string; data?: unknown }> 
        }).generationStatus = {
          'hero': {
            status: SectionGenerationStatus.Failed,
            error: 'Previous failure',
          },
        };
        
        // Create mock for successful regeneration
        service.setBrainProtocol({
          processQuery: mock(() => Promise.resolve({
            object: TEST_RESPONSES.regeneratedHero,
          })),
        } as unknown as BrainProtocol);
        
        // Test regeneration
        const result = await service.regenerateSection(landingPage, 'hero', identity);
        
        // Check basic functionality
        expect(result.success).toBe(true);
        expect(landingPage.hero?.headline).toBe('Regenerated Headline');
        
        // Status should be updated
        const status = (service as unknown as { 
          generationStatus: Record<string, { status: SectionGenerationStatus; data?: unknown; error?: string }> 
        }).generationStatus['hero'];
        expect(status.status).toBe(SectionGenerationStatus.Completed);
      },
    },
    
    {
      name: 'regenerateSection handles errors',
      test: async () => {
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // Mock error case
        service.setBrainProtocol({
          processQuery: mock(() => Promise.reject(new Error('Regeneration failed'))),
        } as unknown as BrainProtocol);
        
        const result = await service.regenerateSection(landingPage, 'hero', identity);
        
        // Should handle error gracefully
        expect(result.success).toBe(false);
        expect(result.message).toContain('failed');
        
        // Failed status should be recorded
        const status = (service as unknown as { 
          generationStatus: Record<string, { status: SectionGenerationStatus; error?: string }> 
        }).generationStatus['hero'];
        expect(status.status).toBe(SectionGenerationStatus.Failed);
      },
    },
    
    {
      name: 'regenerateFailedSections processes multiple sections',
      test: async () => {
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // Setup multiple failed sections
        type GenerationStatusType = {
          status: SectionGenerationStatus; 
          data?: unknown; 
          error?: string;
        };
        
        (service as unknown as { 
          generationStatus: Record<string, GenerationStatusType> 
        }).generationStatus = {
          'hero': { status: SectionGenerationStatus.Completed },
          'pricing': { status: SectionGenerationStatus.Failed },
          'faq': { status: SectionGenerationStatus.Failed },
        };
        
        // Mock regenerateSection to control test behavior
        const regenerateSectionMock = mock((lp, section) => {
          if (section === 'pricing') {
            // Simulate success
            if (lp.pricing) {
              (lp.pricing as Record<string, unknown>)['title'] = 'Regenerated Pricing';
              (lp.pricing as Record<string, unknown>)['enabled'] = true;
            }
            return Promise.resolve({
              success: true,
              message: `Successfully regenerated ${section} section`,
            });
          } else {
            // Simulate failure
            return Promise.resolve({
              success: false,
              message: `Failed to regenerate ${section} section`,
            });
          }
        });
        
        service.regenerateSection = regenerateSectionMock;
        
        // Test regeneration of all failed sections
        const result = await service.regenerateFailedSections(landingPage, identity);
        
        // Should track overall statistics
        expect(result.success).toBe(false); // Overall status is false because of partial failure
        expect(result.results.attempted).toBe(2);
        expect(result.results.succeeded).toBe(1);
        expect(result.results.failed).toBe(1);
        
        // Should update content
        if (landingPage.pricing) {
          expect((landingPage.pricing as Record<string, unknown>)['title']).toBe('Regenerated Pricing');
        }
      },
    },
    
    {
      name: 'regenerateFailedSections handles no failures',
      test: async () => {
        const landingPage = createMockLandingPage();
        const identity = createTestIdentityData();
        
        // Setup with no failed sections
        (service as unknown as { 
          generationStatus: Record<string, { status: SectionGenerationStatus; data?: unknown }> 
        }).generationStatus = {
          'hero': { status: SectionGenerationStatus.Completed },
          'services': { status: SectionGenerationStatus.Completed },
        };
        
        const regenerateSectionMock = mock();
        service.regenerateSection = regenerateSectionMock;
        
        const result = await service.regenerateFailedSections(landingPage, identity);
        
        // Should report no work needed
        expect(result.success).toBe(true);
        expect(result.message).toBe('No failed sections found to regenerate');
        expect(regenerateSectionMock).not.toHaveBeenCalled();
        expect(result.results.attempted).toBe(0);
      },
    },
  ];
  
  // No component interface tests - we're focusing on functionality, not implementation
  
  // Run all test groups
  for (const { name, test: testFn } of landingPageTests) {
    test(`[Core] ${name}`, testFn);
  }
  
  for (const { name, test: testFn } of editingTests) {
    test(`[Editing] ${name}`, testFn);
  }
  
  for (const { name, test: testFn } of regenerationTests) {
    test(`[Regeneration] ${name}`, testFn);
  }
});
