import { mock } from 'bun:test';

import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { 
  AssessedSection, 
  QualityThresholds, 
  SectionQualityAssessment, 
} from '@website/schemas/sectionQualitySchema';

/**
 * Mock implementation of SectionQualityService
 * Follows the Component Interface Standardization pattern
 */
export class MockSectionQualityService {
  private static instance: MockSectionQualityService | null = null;
  
  // Default quality thresholds
  private qualityThresholds: QualityThresholds = {
    minCombinedScore: 7,
    minQualityScore: 6,
    minConfidenceScore: 6,
  };
  
  // Mock methods
  public assessSectionQuality = mock(async <T>(
    _sectionType: string,
    _sectionContent: T,
  ): Promise<SectionQualityAssessment> => {
    return {
      qualityScore: 8,
      qualityJustification: 'Good quality content',
      confidenceScore: 7,
      confidenceJustification: 'Reasonable confidence',
      combinedScore: 7.5,
      enabled: true,
      suggestedImprovements: 'Could be improved with more specific examples',
      improvementsApplied: false,
    };
  });
  
  public improveSectionContent = mock(async <T>(
    _sectionType: string,
    sectionContent: T,
    _assessment: SectionQualityAssessment,
  ): Promise<T> => {
    // By default, return the original content
    return sectionContent;
  });
  
  public processSectionWithQualityAssessment = mock(async <T>(
    sectionType: string,
    sectionContent: T,
  ): Promise<AssessedSection<T>> => {
    // Default implementation returns section with assessment
    const isRequired = ['hero', 'services', 'cta', 'footer'].includes(sectionType);
    
    return {
      content: sectionContent,
      assessment: {
        qualityScore: 8,
        qualityJustification: 'Good quality content',
        confidenceScore: 7,
        confidenceJustification: 'Reasonable confidence',
        combinedScore: 7.5,
        enabled: true,
        suggestedImprovements: 'Could be improved with more specific examples',
        improvementsApplied: false,
      },
      isRequired,
    };
  });
  
  public setQualityThresholds = mock((thresholds: Partial<QualityThresholds>): void => {
    this.qualityThresholds = {
      ...this.qualityThresholds,
      ...thresholds,
    };
  });
  
  public getQualityThresholds = mock((): QualityThresholds => {
    return { ...this.qualityThresholds };
  });
  
  public setBrainProtocol = mock((_protocol: BrainProtocol): void => {
    // Mock method, no implementation needed
  });
  
  public getBrainProtocol = mock((): BrainProtocol => {
    return {} as BrainProtocol;
  });

  /**
   * Get singleton instance
   */
  static getInstance(): MockSectionQualityService {
    if (!MockSectionQualityService.instance) {
      MockSectionQualityService.instance = new MockSectionQualityService();
    }
    return MockSectionQualityService.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    MockSectionQualityService.instance = null;
  }

  /**
   * Create fresh instance (for testing)
   */
  static createFresh(): MockSectionQualityService {
    return new MockSectionQualityService();
  }
}

// Default export for Jest mock
export default MockSectionQualityService;