/**
 * Mock FeatureCoordinator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type { FeatureFlag } from '@/protocol/core/featureCoordinator';

/**
 * Mock feature coordinator for testing
 */
export class MockFeatureCoordinator {
  private static instance: MockFeatureCoordinator | null = null;
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private externalSourcesEnabled = false;

  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockFeatureCoordinator {
    if (!MockFeatureCoordinator.instance) {
      MockFeatureCoordinator.instance = new MockFeatureCoordinator(options);
    }
    return MockFeatureCoordinator.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockFeatureCoordinator.instance = null;
  }

  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockFeatureCoordinator {
    return new MockFeatureCoordinator(options);
  }

  private constructor(options?: Record<string, unknown>) {
    // Initialize feature flags
    this.registerFeature({
      id: 'external-sources',
      enabledByDefault: false,
      enabled: false,
      description: 'Enable external knowledge sources for queries',
    });
    
    // Set up with options if provided
    if (options && typeof options['externalSourcesEnabled'] === 'boolean') {
      this.externalSourcesEnabled = options['externalSourcesEnabled'] as boolean;
      this.setFeatureEnabled('external-sources', this.externalSourcesEnabled);
    }
  }

  /**
   * Register a new feature flag
   */
  registerFeature(feature: FeatureFlag): void {
    this.featureFlags.set(feature.id, feature);
  }

  /**
   * Get all registered feature flags
   */
  getAllFeatures(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  /**
   * Get a specific feature flag by ID
   */
  getFeature(featureId: string): FeatureFlag | undefined {
    return this.featureFlags.get(featureId);
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureId: string): boolean {
    const feature = this.featureFlags.get(featureId);
    return feature ? feature.enabled : false;
  }

  /**
   * Enable or disable a feature flag
   */
  setFeatureEnabled(featureId: string, enabled: boolean): boolean {
    const feature = this.featureFlags.get(featureId);
    
    if (!feature) {
      return false;
    }
    
    feature.enabled = enabled;
    this.featureFlags.set(featureId, feature);
    
    // Special handling for external sources
    if (featureId === 'external-sources') {
      this.externalSourcesEnabled = enabled;
    }
    
    return true;
  }

  /**
   * Enable or disable external sources
   */
  setExternalSourcesEnabled(enabled: boolean): void {
    this.setFeatureEnabled('external-sources', enabled);
  }

  /**
   * Get whether external sources are enabled
   */
  areExternalSourcesEnabled(): boolean {
    return this.isFeatureEnabled('external-sources');
  }

  /**
   * Reset all feature flags to their default values
   */
  resetFeaturesToDefaults(): void {
    for (const feature of this.featureFlags.values()) {
      this.setFeatureEnabled(feature.id, feature.enabledByDefault);
    }
  }
}