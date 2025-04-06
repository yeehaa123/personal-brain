/**
 * Context Manager for BrainProtocol
 * Manages access to note, profile, and external source contexts
 */
import {
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
} from '@/mcp';
import logger from '@/utils/logger';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import type { IContextManager } from '../types';

/**
 * Manages the various contexts used by the BrainProtocol
 */
export class ContextManager implements IContextManager {
  private noteContext: NoteContext;
  private profileContext: ProfileContext;
  private externalSourceContext: ExternalSourceContext;
  private useExternalSources: boolean;

  /**
   * Create a new context manager
   * @param config Configuration for the brain protocol
   */
  constructor(config: BrainProtocolConfig) {
    const apiKey = config.getApiKey();
    const newsApiKey = config.newsApiKey;
    
    // Initialize the contexts
    this.noteContext = NoteContext.getInstance(apiKey);
    this.profileContext = ProfileContext.getInstance(apiKey);
    this.externalSourceContext = ExternalSourceContext.getInstance(apiKey, newsApiKey);
    
    // Set initial state
    this.useExternalSources = config.useExternalSources;
    
    logger.debug('Context manager initialized');
  }

  /**
   * Get the note context
   * @returns The note context
   */
  getNoteContext(): NoteContext {
    return this.noteContext;
  }

  /**
   * Get the profile context
   * @returns The profile context
   */
  getProfileContext(): ProfileContext {
    return this.profileContext;
  }

  /**
   * Get the external source context
   * @returns The external source context
   */
  getExternalSourceContext(): ExternalSourceContext {
    return this.externalSourceContext;
  }

  /**
   * Enable or disable external sources
   * @param enabled Whether external sources should be enabled
   */
  setExternalSourcesEnabled(enabled: boolean): void {
    this.useExternalSources = enabled;
    logger.info(`External sources ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get the current status of external sources
   * @returns Whether external sources are enabled
   */
  getExternalSourcesEnabled(): boolean {
    return this.useExternalSources;
  }
}