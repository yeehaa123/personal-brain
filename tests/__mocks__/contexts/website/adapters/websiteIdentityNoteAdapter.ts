import { mock } from 'bun:test';

import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';

/**
 * Mock implementation of WebsiteIdentityNoteAdapter
 * Follows the Component Interface Standardization pattern
 */
export class MockWebsiteIdentityNoteAdapter {
  private static instance: MockWebsiteIdentityNoteAdapter | null = null;
  
  // Mock storage for identity data
  private identityData: WebsiteIdentityData | null = null;
  
  // Mock methods
  public getIdentityData = mock(async (): Promise<WebsiteIdentityData | null> => {
    return this.identityData ? { ...this.identityData } : null;
  });
  
  public saveIdentityData = mock(async (data: WebsiteIdentityData): Promise<boolean> => {
    this.identityData = { ...data };
    return true;
  });
  
  /**
   * Set identity data for testing
   */
  setIdentityData(data: WebsiteIdentityData | null): void {
    this.identityData = data ? { ...data } : null;
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): MockWebsiteIdentityNoteAdapter {
    if (!MockWebsiteIdentityNoteAdapter.instance) {
      MockWebsiteIdentityNoteAdapter.instance = new MockWebsiteIdentityNoteAdapter();
    }
    return MockWebsiteIdentityNoteAdapter.instance;
  }
  
  /**
   * Reset singleton instance
   */
  static resetInstance(): void {
    MockWebsiteIdentityNoteAdapter.instance = null;
  }
  
  /**
   * Create fresh instance
   */
  static createFresh(): MockWebsiteIdentityNoteAdapter {
    return new MockWebsiteIdentityNoteAdapter();
  }
}

export default MockWebsiteIdentityNoteAdapter;