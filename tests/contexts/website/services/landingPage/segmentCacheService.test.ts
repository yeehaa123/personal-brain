import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { SegmentCacheService } from '@/contexts/website/services/landingPage/segmentCacheService';
import fs from 'fs';
import path from 'path';
import { IdentitySegmentSchema } from '@website/schemas/landingPageSegmentSchemas';

// Create a mock identity segment for testing
const mockIdentitySegment = {
  title: 'Test Profile',
  description: 'Test description',
  name: 'Test Name',
  tagline: 'Test tagline',
  hero: {
    headline: 'Test headline',
    subheading: 'Test subheading',
    ctaText: 'Test CTA',
    ctaLink: '#test',
  },
  segmentType: 'identity' as const,
  version: 1,
  generatedAt: new Date().toISOString(),
};

// Setup temp directory for tests
const TEMP_CACHE_DIR = path.join(process.cwd(), 'tests', 'temp-cache');

describe('SegmentCacheService', () => {
  let cacheService: SegmentCacheService;

  beforeEach(() => {
    // Ensure test cache directory exists
    if (!fs.existsSync(TEMP_CACHE_DIR)) {
      fs.mkdirSync(TEMP_CACHE_DIR, { recursive: true });
    }
    
    // Create a fresh instance for each test
    SegmentCacheService.resetInstance();
    cacheService = SegmentCacheService.createFresh({ cachePath: TEMP_CACHE_DIR });
  });

  afterEach(() => {
    // Clean up test cache directory
    const files = ['identity-segment.json', 'service-offering-segment.json', 
                  'credibility-segment.json', 'conversion-segment.json'];
    
    for (const file of files) {
      const filePath = path.join(TEMP_CACHE_DIR, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test('should save and retrieve segment from cache', () => {
    // Save a segment to the cache
    cacheService.saveSegment('identity', mockIdentitySegment);
    
    // Then retrieve it
    const retrievedSegment = cacheService.getSegment('identity');
    
    // Verify it matches what we saved
    expect(retrievedSegment).toEqual(mockIdentitySegment);
  });

  test('should check if segment exists in cache', () => {
    // Initially should not have segment
    expect(cacheService.hasSegment('identity')).toBe(false);
    
    // After saving should have segment
    cacheService.saveSegment('identity', mockIdentitySegment);
    expect(cacheService.hasSegment('identity')).toBe(true);
  });

  test('should return all cached segments', () => {
    // Save identity segment
    cacheService.saveSegment('identity', mockIdentitySegment);
    
    // Get all segments
    const allSegments = cacheService.getAllSegments();
    
    // Verify segments are returned
    expect(allSegments).toHaveProperty('identity');
    expect(allSegments.identity).toEqual(mockIdentitySegment);
  });

  test('should clear specific segment from cache', () => {
    // First save a segment
    cacheService.saveSegment('identity', mockIdentitySegment);
    
    // Verify it exists
    expect(cacheService.hasSegment('identity')).toBe(true);
    
    // Clear it
    cacheService.clearSegment('identity');
    
    // Verify it's gone
    expect(cacheService.hasSegment('identity')).toBe(false);
  });

  test('should clear all segments from cache', () => {
    // Save segment
    cacheService.saveSegment('identity', mockIdentitySegment);
    
    // Verify it exists
    expect(cacheService.hasSegment('identity')).toBe(true);
    
    // Clear all
    cacheService.clearAllSegments();
    
    // Verify all are gone
    expect(cacheService.hasSegment('identity')).toBe(false);
  });

  test('should maintain singleton instance', () => {
    // Get instance twice with the same options
    const instance1 = SegmentCacheService.getInstance({ cachePath: TEMP_CACHE_DIR });
    const instance2 = SegmentCacheService.getInstance({ cachePath: TEMP_CACHE_DIR });
    
    // Should be the same instance
    expect(instance1).toBe(instance2);
  });

  test('should persist segments between instances', () => {
    // Save a segment with first instance
    cacheService.saveSegment('identity', mockIdentitySegment);
    
    // Create a new instance
    SegmentCacheService.resetInstance();
    const newInstance = SegmentCacheService.createFresh({ cachePath: TEMP_CACHE_DIR });
    
    // New instance should load the segment from disk
    expect(newInstance.hasSegment('identity')).toBe(true);
    expect(newInstance.getSegment('identity')).toEqual(mockIdentitySegment);
  });

  test('should validate segment schema', () => {
    // Valid segment should pass validation
    expect(() => {
      IdentitySegmentSchema.parse(mockIdentitySegment);
    }).not.toThrow();
    
    // Invalid segment should fail validation
    const invalidSegment = {
      title: 'Test', // Missing required fields
      segmentType: 'identity' as const,
    };
    
    expect(() => {
      IdentitySegmentSchema.parse(invalidSegment);
    }).toThrow();
  });
});