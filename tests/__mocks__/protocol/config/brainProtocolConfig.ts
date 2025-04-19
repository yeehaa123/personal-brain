/**
 * Mock BrainProtocolConfig for testing
 */

import type { BrainProtocolOptions, InterfaceType } from '@/protocol/types';

/**
 * Creates a mock BrainProtocolConfig with required methods for testing
 */
export class MockBrainProtocolConfig {
  readonly useExternalSources: boolean;
  readonly interfaceType: InterfaceType;
  readonly roomId: string;
  readonly apiKey?: string;
  readonly newsApiKey?: string;
  readonly version: string = '1.0.0';
  readonly name: string = 'MockBrainProtocol';

  constructor(options: BrainProtocolOptions = {}) {
    this.useExternalSources = options.useExternalSources ?? false;
    this.interfaceType = options.interfaceType || 'cli';
    this.roomId = options.roomId || 'test-room-id';
    this.apiKey = options.apiKey || 'mock-api-key';
    this.newsApiKey = options.newsApiKey;
  }

  getApiKey(): string {
    return this.apiKey || 'mock-api-key';
  }

  hasAnthropicApiKey(): boolean {
    return true;
  }

  hasOpenAIApiKey(): boolean {
    return false;
  }

  getDefaultRoomId(): string {
    return 'test-room-id';
  }

  getMcpServerConfig(): {
    apiKey: string;
    newsApiKey?: string;
    name: string;
    version: string;
    enableExternalSources: boolean;
    } {
    return {
      apiKey: this.getApiKey(),
      newsApiKey: this.newsApiKey,
      name: this.name,
      version: this.version,
      enableExternalSources: this.useExternalSources,
    };
  }

  validate(): void {
    // No-op for mock
  }

  static createMock(overrides: Partial<BrainProtocolOptions> = {}): MockBrainProtocolConfig {
    const defaults = {
      useExternalSources: true,
      interfaceType: 'cli' as const,
      roomId: 'test-room-id',
      apiKey: 'mock-api-key',
    };
    
    const options = { ...defaults, ...overrides };
    const config = new MockBrainProtocolConfig(options);
    
    // Return as any to allow casting to BrainProtocolConfig
    return config;
  }
}