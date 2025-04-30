import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { SectionQualityService } from '@/contexts/website/services/landingPage/sectionQualityService';
import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import { BrainProtocol } from '@/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';
import { REQUIRED_SECTION_TYPES } from '@website/schemas/sectionQualitySchema';

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
  
  test('getInstance should return a singleton instance', () => {
    const instance1 = LandingPageGenerationService.getInstance();
    const instance2 = LandingPageGenerationService.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh should create a new instance', () => {
    const instance1 = LandingPageGenerationService.getInstance();
    const instance2 = LandingPageGenerationService.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('resetInstance should reset the singleton instance', () => {
    const instance1 = LandingPageGenerationService.getInstance();
    LandingPageGenerationService.resetInstance();
    const instance2 = LandingPageGenerationService.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('generateLandingPageData should create a landing page with all required sections', async () => {
    // Act
    const result = await service.generateLandingPageData();
    
    // Assert
    expect(result).toBeDefined();
    expect(result.title).toBe('Generated Title');
    expect(result.description).toBe('Generated Description');
    expect(result.name).toBe('Generated Name');
    expect(result.tagline).toBe('Generated Tagline');
    
    // Check that all required sections exist
    for (const sectionType of REQUIRED_SECTION_TYPES) {
      expect(result[sectionType as keyof LandingPageData]).toBeDefined();
    }
    
    // Verify brain protocol was called for identity and sections
    expect(mockProcessQuery.mock.calls.length).toBeGreaterThan(0);
  });
  
  test('generateLandingPageData with skipReview should skip quality assessment', async () => {
    // Act
    const result = await service.generateLandingPageData({ skipReview: true });
    
    // Assert
    expect(result).toBeDefined();
    expect(mockProcessSectionWithQualityAssessment.mock.calls.length).toBe(0);
  });
  
  test('generateLandingPageData should apply quality thresholds when provided', async () => {
    // Arrange
    const mockSetQualityThresholds = mock();
    // @ts-expect-error - We're mocking a private method
    service.sectionQualityService = { 
      setQualityThresholds: mockSetQualityThresholds,
      processSectionWithQualityAssessment: mockProcessSectionWithQualityAssessment,
    };
    
    // Act
    const qualityThresholds = {
      minCombinedScore: 7.5,
      minQualityScore: 7,
      minConfidenceScore: 7,
    };
    
    await service.generateLandingPageData({ qualityThresholds });
    
    // Assert
    expect(mockSetQualityThresholds.mock.calls.length).toBe(1);
    expect(mockSetQualityThresholds.mock.calls[0][0]).toEqual(qualityThresholds);
  });
  
  test('getSectionQualityAssessments should return assessment results', async () => {
    // Arrange - Generate landing page with quality assessment
    await service.generateLandingPageData();
    
    // Act
    const assessments = service.getSectionQualityAssessments();
    
    // Assert
    expect(assessments).toBeDefined();
    expect(Object.keys(assessments).length).toBeGreaterThan(0);
  });
  
  test('setBrainProtocol should set a custom protocol instance', () => {
    // Arrange
    const customProtocol = {} as BrainProtocol;
    
    // Act
    service.setBrainProtocol(customProtocol);
    const result = service.getBrainProtocol();
    
    // Assert
    expect(result).toBe(customProtocol);
  });
});
