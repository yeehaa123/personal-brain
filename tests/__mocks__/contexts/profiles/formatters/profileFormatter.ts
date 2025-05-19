import type { ProfileFormatter } from '@/contexts/profiles/formatters/profileFormatter';
import type { Education, Experience, Language, Profile, Project, Publication } from '@/models/profile';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock ProfileFormatter for testing
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockProfileFormatter {
  private static instance: MockProfileFormatter | null = null;
  
  // Add private config to match ProfileFormatter interface (unused but required)
  // @ts-expect-error - Intentionally unused in mock
  private config: Record<string, unknown> = {};
  
  // Use standardized mock logger
  public logger = MockLogger.getInstance();
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProfileFormatter {
    if (!MockProfileFormatter.instance) {
      MockProfileFormatter.instance = new MockProfileFormatter();
    }
    return MockProfileFormatter.instance as unknown as ProfileFormatter;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockProfileFormatter.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(): ProfileFormatter {
    return new MockProfileFormatter() as unknown as ProfileFormatter;
  }
  
  format(profile: Profile | unknown, _options?: Record<string, unknown>): string {
    if (profile && typeof profile === 'object') {
      const p = profile as Profile;
      const name = p.displayName || 'Unknown';
      return `Formatted Profile: ${name}
Headline: ${p.headline || 'N/A'}`;
    }
    return 'Formatted Profile: Unknown';
  }
  
  formatProfileForDisplay(profile: Profile): string {
    return `Display: ${profile.displayName}`;
  }
  
  // Missing private methods made public in the mock
  safeNonEmptyString(value: string | null | undefined): string | undefined {
    return value || undefined;
  }
  
  formatExperience(experience: Experience, _formatField: (value: string | null | undefined) => string): string {
    return `Experience: ${experience.organization} - ${experience.title}`;
  }
  
  formatEducation(education: Education, _formatField: (value: string | null | undefined) => string): string {
    return `Education: ${education.institution} - ${education.degree}`;
  }
  
  formatProject(project: Project, _formatField: (value: string | null | undefined) => string): string {
    return `Project: ${project.title}`;
  }
  
  formatPublication(publication: Publication, _formatField: (value: string | null | undefined) => string): string {
    return `Publication: ${publication.title}`;
  }
  
  formatLanguage(language: Language, _formatField: (value: string | null | undefined) => string): string {
    return `Language: ${language.name} - ${language.proficiency}`;
  }
  
  // Existing public methods from original
  formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return date instanceof Date ? date.toISOString() : 'N/A';
  }
  
  formatLocation(location: string | null): string {
    return location || 'N/A';
  }
  
  formatLinks(links: Record<string, string>): string {
    return Object.entries(links).map(([key, value]) => `${key}: ${value}`).join(', ');
  }
  
  formatHeadline(headline: string | null): string {
    return headline || 'N/A';
  }
  
  formatSummary(summary: string | null): string {
    return summary || 'N/A';
  }
  
  formatProfile(profile: Profile): string {
    return this.format(profile);
  }
}