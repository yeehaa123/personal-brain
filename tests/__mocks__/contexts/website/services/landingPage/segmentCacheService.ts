import { mock } from 'bun:test';

import type { SegmentStore } from '@website/schemas/landingPageSegmentSchemas';

/**
 * Mock implementation of SegmentCacheService for testing
 * Follows the Component Interface Standardization pattern
 */
export class MockSegmentCacheService {
  private static instance: MockSegmentCacheService | null = null;
  
  // Mock state
  private segments: SegmentStore = {};
  
  // Mock methods
  hasSegment = mock((type: keyof SegmentStore): boolean => {
    return !!this.segments[type];
  });
  
  getSegment = mock(<T extends keyof SegmentStore>(type: T) => {
    return this.segments[type];
  });
  
  saveSegment = mock(<T extends keyof SegmentStore>(type: T, segment: SegmentStore[T]) => {
    this.segments[type] = segment;
  });
  
  getAllSegments = mock((): SegmentStore => {
    return { ...this.segments };
  });
  
  clearSegment = mock((type: keyof SegmentStore) => {
    delete this.segments[type];
  });
  
  clearAllSegments = mock(() => {
    this.segments = {};
  });
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockSegmentCacheService {
    if (!MockSegmentCacheService.instance) {
      MockSegmentCacheService.instance = new MockSegmentCacheService();
    }
    return MockSegmentCacheService.instance;
  }
  
  /**
   * Reset the singleton instance (for test isolation)
   */
  static resetInstance(): void {
    if (MockSegmentCacheService.instance) {
      // Reset all mocks
      MockSegmentCacheService.instance.hasSegment.mockClear();
      MockSegmentCacheService.instance.getSegment.mockClear();
      MockSegmentCacheService.instance.saveSegment.mockClear();
      MockSegmentCacheService.instance.getAllSegments.mockClear();
      MockSegmentCacheService.instance.clearSegment.mockClear();
      MockSegmentCacheService.instance.clearAllSegments.mockClear();
    }
    MockSegmentCacheService.instance = null;
  }
  
  /**
   * Create a fresh instance (for test isolation)
   */
  static createFresh(): MockSegmentCacheService {
    return new MockSegmentCacheService();
  }
  
  /**
   * Set segment data for testing
   * @param segments The segments to set
   */
  setSegments(segments: Partial<SegmentStore>): void {
    this.segments = { ...this.segments, ...segments };
  }
}