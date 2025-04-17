/**
 * Mock ConfigurationManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { BrainProtocolConfig } from '@/protocol/config/brainProtocolConfig';
import type { InterfaceType } from '@/protocol/types';


/**
 * Mock configuration manager for testing
 */
export class MockConfigurationManager {
  private static instance: MockConfigurationManager | null = null;
  private apiKey = 'mock-api-key';
  private interfaceType: InterfaceType = 'cli';
  private useExternalSources = false;

  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockConfigurationManager {
    if (!MockConfigurationManager.instance) {
      MockConfigurationManager.instance = new MockConfigurationManager(options);
    }
    return MockConfigurationManager.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockConfigurationManager.instance = null;
  }

  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockConfigurationManager {
    return new MockConfigurationManager(options);
  }

  private constructor(options?: Record<string, unknown>) {
    // Set up mock with options if provided
    if (options) {
      if (typeof options['apiKey'] === 'string') {
        this.apiKey = options['apiKey'];
      }
      
      if (options['interfaceType'] === 'cli' || options['interfaceType'] === 'matrix') {
        this.interfaceType = options['interfaceType'];
      }
      
      if (typeof options['useExternalSources'] === 'boolean') {
        this.useExternalSources = options['useExternalSources'];
      }
      
      // Removed config option handling as it's not used
    }
  }

  getConfig(): BrainProtocolConfig {
    // Return a mock BrainProtocolConfig
    return {
      apiKey: this.apiKey,
      interfaceType: this.interfaceType,
      useExternalSources: this.useExternalSources,
      hasAnthropicApiKey: mock(() => true),
      hasOpenAIApiKey: mock(() => false),
      getApiKey: mock(() => this.apiKey),
      getMcpServerConfig: mock(() => ({ port: 3000 })),
    } as unknown as BrainProtocolConfig;
  }

  hasAnthropicApiKey(): boolean {
    return true;
  }

  hasOpenAIApiKey(): boolean {
    return false;
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  getUseExternalSources(): boolean {
    return this.useExternalSources;
  }

  setUseExternalSources(enabled: boolean): void {
    this.useExternalSources = enabled;
  }

  getInterfaceType(): InterfaceType {
    return this.interfaceType;
  }

  getMcpServerConfig(): Record<string, unknown> {
    return { port: 3000 };
  }
}