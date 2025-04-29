import type { 
  IdentitySegment, 
  ServiceOfferingSegment, 
  CredibilitySegment, 
  ConversionSegment,
  SegmentStore
} from '@website/schemas/landingPageSegmentSchemas';
import fs from 'fs';
import path from 'path';
import { Logger } from '@/utils/logger';

/**
 * Service for caching landing page segments
 * Enables segment regeneration and storage for iterative refinement
 * 
 * Implements the Component Interface Standardization pattern
 */
export class SegmentCacheService {
  private static instance: SegmentCacheService | null = null;
  private logger = Logger.getInstance();
  private cachePath: string;
  private segmentCache: SegmentStore = {};
  
  private constructor(options?: { cachePath?: string }) {
    this.cachePath = options?.cachePath || path.join(process.cwd(), '.cache', 'landing-page-segments');
    this.ensureCacheDirectory();
    this.loadCache();
  }
  
  /**
   * Get singleton instance of SegmentCacheService
   */
  static getInstance(options?: { cachePath?: string }): SegmentCacheService {
    if (!SegmentCacheService.instance) {
      SegmentCacheService.instance = new SegmentCacheService(options);
    }
    return SegmentCacheService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    SegmentCacheService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(options?: { cachePath?: string }): SegmentCacheService {
    return new SegmentCacheService(options);
  }
  
  /**
   * Ensure the cache directory exists
   * @private
   */
  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(this.cachePath)) {
        fs.mkdirSync(this.cachePath, { recursive: true });
        this.logger.info('Created landing page segment cache directory', {
          context: 'SegmentCacheService',
          path: this.cachePath
        });
      }
    } catch (error) {
      this.logger.error('Failed to create cache directory', {
        context: 'SegmentCacheService',
        error,
        path: this.cachePath
      });
    }
  }
  
  /**
   * Load cached segments from disk
   * @private
   */
  private loadCache(): void {
    try {
      // Identity segment
      const identityPath = path.join(this.cachePath, 'identity-segment.json');
      if (fs.existsSync(identityPath)) {
        this.segmentCache.identity = JSON.parse(fs.readFileSync(identityPath, 'utf8')) as IdentitySegment;
      }
      
      // Service offering segment
      const serviceOfferingPath = path.join(this.cachePath, 'service-offering-segment.json');
      if (fs.existsSync(serviceOfferingPath)) {
        this.segmentCache.serviceOffering = JSON.parse(fs.readFileSync(serviceOfferingPath, 'utf8')) as ServiceOfferingSegment;
      }
      
      // Credibility segment
      const credibilityPath = path.join(this.cachePath, 'credibility-segment.json');
      if (fs.existsSync(credibilityPath)) {
        this.segmentCache.credibility = JSON.parse(fs.readFileSync(credibilityPath, 'utf8')) as CredibilitySegment;
      }
      
      // Conversion segment
      const conversionPath = path.join(this.cachePath, 'conversion-segment.json');
      if (fs.existsSync(conversionPath)) {
        this.segmentCache.conversion = JSON.parse(fs.readFileSync(conversionPath, 'utf8')) as ConversionSegment;
      }
      
      this.logger.debug('Loaded cached landing page segments', {
        context: 'SegmentCacheService',
        segments: Object.keys(this.segmentCache).filter(key => !!this.segmentCache[key as keyof SegmentStore])
      });
    } catch (error) {
      this.logger.error('Failed to load cached segments', {
        context: 'SegmentCacheService',
        error
      });
      
      // Reset cache on error
      this.segmentCache = {};
    }
  }
  
  /**
   * Save a segment to the cache
   * @param segment The segment to cache
   */
  saveSegment<T extends keyof SegmentStore>(type: T, segment: SegmentStore[T]): void {
    try {
      // Update in-memory cache
      this.segmentCache[type] = segment;
      
      // Determine file path based on segment type
      let filePath = '';
      switch (type) {
        case 'identity':
          filePath = path.join(this.cachePath, 'identity-segment.json');
          break;
        case 'serviceOffering':
          filePath = path.join(this.cachePath, 'service-offering-segment.json');
          break;
        case 'credibility':
          filePath = path.join(this.cachePath, 'credibility-segment.json');
          break;
        case 'conversion':
          filePath = path.join(this.cachePath, 'conversion-segment.json');
          break;
        default:
          throw new Error(`Unknown segment type: ${type}`);
      }
      
      // Write to disk
      fs.writeFileSync(filePath, JSON.stringify(segment, null, 2), 'utf8');
      
      this.logger.debug('Saved segment to cache', {
        context: 'SegmentCacheService',
        type,
        path: filePath
      });
    } catch (error) {
      this.logger.error('Failed to save segment to cache', {
        context: 'SegmentCacheService',
        type,
        error
      });
    }
  }
  
  /**
   * Get a segment from the cache
   * @param type The type of segment to retrieve
   * @returns The cached segment or undefined if not found
   */
  getSegment<T extends keyof SegmentStore>(type: T): SegmentStore[T] | undefined {
    return this.segmentCache[type];
  }
  
  /**
   * Check if a segment exists in the cache
   * @param type The type of segment to check
   * @returns True if the segment exists in cache
   */
  hasSegment(type: keyof SegmentStore): boolean {
    return !!this.segmentCache[type];
  }
  
  /**
   * Get all cached segments
   * @returns The complete segment store
   */
  getAllSegments(): SegmentStore {
    return { ...this.segmentCache };
  }
  
  /**
   * Clear the cache for a specific segment
   * @param type The type of segment to clear
   */
  clearSegment(type: keyof SegmentStore): void {
    try {
      // Remove from in-memory cache
      delete this.segmentCache[type];
      
      // Determine file path based on segment type
      let filePath = '';
      switch (type) {
        case 'identity':
          filePath = path.join(this.cachePath, 'identity-segment.json');
          break;
        case 'serviceOffering':
          filePath = path.join(this.cachePath, 'service-offering-segment.json');
          break;
        case 'credibility':
          filePath = path.join(this.cachePath, 'credibility-segment.json');
          break;
        case 'conversion':
          filePath = path.join(this.cachePath, 'conversion-segment.json');
          break;
        default:
          throw new Error(`Unknown segment type: ${type}`);
      }
      
      // Remove from disk if exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      this.logger.debug('Cleared segment from cache', {
        context: 'SegmentCacheService',
        type
      });
    } catch (error) {
      this.logger.error('Failed to clear segment from cache', {
        context: 'SegmentCacheService',
        type,
        error
      });
    }
  }
  
  /**
   * Clear all segments from the cache
   */
  clearAllSegments(): void {
    try {
      // Clear in-memory cache
      this.segmentCache = {};
      
      // Clear all files in cache directory
      const files = [
        'identity-segment.json',
        'service-offering-segment.json',
        'credibility-segment.json',
        'conversion-segment.json'
      ];
      
      for (const file of files) {
        const filePath = path.join(this.cachePath, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      this.logger.info('Cleared all segments from cache', {
        context: 'SegmentCacheService'
      });
    } catch (error) {
      this.logger.error('Failed to clear all segments from cache', {
        context: 'SegmentCacheService',
        error
      });
    }
  }
}