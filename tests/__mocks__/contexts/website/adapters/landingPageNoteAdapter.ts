/**
 * Mock LandingPageNoteAdapter for testing
 * 
 * Provides a standardized mock implementation following the Component Interface
 * Standardization pattern with getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { LandingPageData } from '@/contexts/website/websiteStorage';
import type { Note } from '@/models/note';

/**
 * Mock implementation of LandingPageNoteAdapter
 */
export class MockLandingPageNoteAdapter {
  private static instance: MockLandingPageNoteAdapter | null = null;
  
  // Mock data storage
  private landingPageData: LandingPageData | null = null;
  
  // Mock methods
  getLandingPageData = mock(() => Promise.resolve(this.landingPageData));
  saveLandingPageData = mock((data: LandingPageData) => {
    this.landingPageData = data;
    return Promise.resolve(true);
  });
  convertNoteToLandingPageData = mock((note: Note) => {
    try {
      return JSON.parse(note.content) as LandingPageData;
    } catch (_error) {
      return null;
    }
  });
  convertLandingPageDataToNote = mock((data: LandingPageData) => {
    return {
      id: 'website-landing-page',
      title: 'Website Landing Page Data',
      content: JSON.stringify(data, null, 2),
      tags: ['website', 'landing-page'],
      source: 'landing-page',
      updatedAt: new Date(),
    };
  });
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): MockLandingPageNoteAdapter {
    if (!MockLandingPageNoteAdapter.instance) {
      MockLandingPageNoteAdapter.instance = new MockLandingPageNoteAdapter();
    }
    return MockLandingPageNoteAdapter.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockLandingPageNoteAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance
   * 
   * @param initialData Optional initial landing page data
   * @returns A new MockLandingPageNoteAdapter instance
   */
  public static createFresh(initialData: LandingPageData | null = null): MockLandingPageNoteAdapter {
    const adapter = new MockLandingPageNoteAdapter();
    adapter.landingPageData = initialData;
    return adapter;
  }
  
  /**
   * Set landing page data directly (for testing)
   */
  setLandingPageData(data: LandingPageData | null): void {
    this.landingPageData = data;
  }
  
  /**
   * Get landing page data directly (for testing)
   */
  getData(): LandingPageData | null {
    return this.landingPageData;
  }
  
  /**
   * Reset mock call counters
   */
  resetMocks(): void {
    this.getLandingPageData.mockClear();
    this.saveLandingPageData.mockClear();
    this.convertNoteToLandingPageData.mockClear();
    this.convertLandingPageDataToNote.mockClear();
  }
}