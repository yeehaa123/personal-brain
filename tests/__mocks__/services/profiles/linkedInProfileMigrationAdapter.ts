import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Profile } from '@/models/profile';

/**
 * Mock implementation of the LinkedInProfileMigrationAdapter
 * Follows the Component Interface Standardization pattern
 */
export class MockLinkedInProfileMigrationAdapter {
  private static instance: MockLinkedInProfileMigrationAdapter | null = null;
  
  // Test callback for conversion
  private mockConvertFn: (linkedInProfile: LinkedInProfile) => Profile;
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockLinkedInProfileMigrationAdapter {
    if (!MockLinkedInProfileMigrationAdapter.instance) {
      MockLinkedInProfileMigrationAdapter.instance = new MockLinkedInProfileMigrationAdapter();
    }
    return MockLinkedInProfileMigrationAdapter.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockLinkedInProfileMigrationAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockLinkedInProfileMigrationAdapter {
    return new MockLinkedInProfileMigrationAdapter();
  }
  
  /**
   * Constructor
   */
  constructor() {
    // Default implementation of convert function
    this.mockConvertFn = (linkedInProfile: LinkedInProfile): Profile => {
      return {
        displayName: linkedInProfile.fullName || 'Unknown Name',
        email: 'converted@example.com',
        headline: linkedInProfile.headline || '',
        summary: linkedInProfile.summary || '',
      };
    };
  }
  
  /**
   * Set the mock conversion function
   */
  setMockConvertFn(fn: (linkedInProfile: LinkedInProfile) => Profile): void {
    this.mockConvertFn = fn;
  }
  
  /**
   * Convert a LinkedIn profile to our simplified format
   */
  convertToProfile(linkedInProfile: LinkedInProfile): Profile {
    return this.mockConvertFn(linkedInProfile);
  }
}