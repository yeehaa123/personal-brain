/**
 * Configuration management for BrainProtocol
 */
import { aiConfig, conversationConfig } from '@/config';
import type { ConversationMemoryStorage } from '@/mcp/protocol/schemas/conversationMemoryStorage';
import logger from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

import type { BrainProtocolOptions } from '../types';

/**
 * Manages configuration for the BrainProtocol system
 */
export class BrainProtocolConfig {
  /** Interface type (CLI or Matrix) */
  readonly interfaceType: 'cli' | 'matrix';
  
  /** Whether to use external knowledge sources */
  readonly useExternalSources: boolean;
  
  /** Room ID for the conversation */
  readonly roomId?: string;
  
  /** API key for AI services */
  readonly apiKey?: string;
  
  /** API key for news services */
  readonly newsApiKey?: string;
  
  /** Memory storage implementation for conversation memory */
  readonly memoryStorage?: ConversationMemoryStorage;

  /**
   * Create a new configuration object from options
   * @param optionsOrApiKey Options object or legacy API key string
   * @param legacyNewsApiKey Legacy news API key parameter
   * @param legacyUseExternalSources Legacy external sources flag
   */
  constructor(
    optionsOrApiKey?: BrainProtocolOptions | string,
    legacyNewsApiKey?: string,
    legacyUseExternalSources: boolean = false,
  ) {
    // Handle both new options object and legacy parameters
    const options: BrainProtocolOptions = typeof optionsOrApiKey === 'string'
      ? { apiKey: optionsOrApiKey, newsApiKey: legacyNewsApiKey, useExternalSources: legacyUseExternalSources }
      : optionsOrApiKey || {};

    // Extract values with defaults
    this.apiKey = options.apiKey;
    this.newsApiKey = options.newsApiKey || legacyNewsApiKey;
    this.useExternalSources = options.useExternalSources ?? legacyUseExternalSources;
    
    // Set interface type (default to CLI if not specified)
    this.interfaceType = options.interfaceType || 'cli';
    
    // Set room ID with default if not provided
    this.roomId = options.roomId || 
      (this.interfaceType === 'cli' ? conversationConfig.defaultCliRoomId : undefined);
    
    // Set memory storage
    this.memoryStorage = options.memoryStorage;

    // Validate the configuration
    this.validate();

    // Log configuration
    logger.debug(`BrainProtocol configured with interface type: ${this.interfaceType}`);
    logger.debug(`External sources: ${this.useExternalSources ? 'enabled' : 'disabled'}`);
    logger.debug(`Room ID: ${this.roomId || 'not set'}`);
  }

  /**
   * Validate the configuration
   * @throws Error if the configuration is invalid
   */
  validate(): void {
    // Room ID is now required for both interfaces
    if (!isNonEmptyString(this.roomId)) {
      logger.warn('No room ID provided, using default');
    }
  }

  /**
   * Get the API key, falling back to the environment variable
   */
  getApiKey(): string {
    return this.apiKey || aiConfig.anthropic.apiKey || aiConfig.openAI.apiKey || '';
  }

  /**
   * Check if Anthropic API key is available
   */
  hasAnthropicApiKey(): boolean {
    return Boolean(this.apiKey || aiConfig.anthropic.apiKey);
  }

  /**
   * Check if OpenAI API key is available
   */
  hasOpenAIApiKey(): boolean {
    return Boolean(this.apiKey || aiConfig.openAI.apiKey);
  }
}