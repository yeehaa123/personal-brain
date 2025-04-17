/**
 * Context Manager for BrainProtocol
 * Manages access to note, profile, conversation, and external source contexts
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import {
  ConversationContext,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
} from '@/contexts';
import type { WebsiteContext } from '@/contexts/website/core/websiteContext';
import { ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import type { IContextManager } from '../types';

/**
 * Configuration options for ContextManager
 */
export interface ContextManagerConfig {
  /** BrainProtocol configuration */
  config: BrainProtocolConfig;
}

/**
 * Manages the various contexts used by the BrainProtocol
 * 
 * The ContextManager is responsible for:
 * 1. Creating and initializing context objects (notes, profile, external sources)
 * 2. Providing access to these contexts for other components
 * 3. Managing external source state (enabled/disabled)
 * 4. Ensuring contexts are properly initialized before use
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class ContextManager implements IContextManager {
  // Singleton instance
  private static instance: ContextManager | null = null;

  // Core context objects
  private readonly noteContext: NoteContext;
  private readonly profileContext: ProfileContext;
  private readonly externalSourceContext: ExternalSourceContext;
  private readonly conversationContext: ConversationContext;
  
  // State
  private useExternalSources: boolean;
  private initialized: boolean = false;
  private initializationError: Error | null = null;
  
  // Logger instance
  private logger = Logger.getInstance();

  /**
   * Get the singleton instance of ContextManager
   * 
   * @param options - Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  public static getInstance(options: ContextManagerConfig): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager(options.config);
      
      const logger = Logger.getInstance();
      logger.debug('ContextManager singleton instance created');
    } else if (options) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }
    
    return ContextManager.instance;
  }

  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   */
  public static resetInstance(): void {
    if (ContextManager.instance) {
      ContextManager.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('ContextManager singleton instance reset');
    }
  }

  /**
   * Create a fresh instance that is not the singleton
   * This method is primarily used for testing to create isolated instances
   * 
   * @param options - Configuration options
   * @returns A new ContextManager instance
   */
  public static createFresh(options: ContextManagerConfig): ContextManager {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ContextManager instance');
    
    return new ContextManager(options.config);
  }

  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   * 
   * @param config - Configuration for the brain protocol
   */
  private constructor(config: BrainProtocolConfig) {
    const apiKey = config.getApiKey();
    const newsApiKey = config.newsApiKey;
    const interfaceType = config.interfaceType || 'cli';
    const roomId = config.roomId;
    
    // Initialize the contexts with singletons
    // This ensures we're using the same context instances throughout the application
    try {
      this.noteContext = NoteContext.getInstance(apiKey);
      this.profileContext = ProfileContext.getInstance({ apiKey });
      this.externalSourceContext = ExternalSourceContext.getInstance({ 
        apiKey, 
        newsApiKey, 
      });
      this.conversationContext = ConversationContext.getInstance({
        // Pass any configuration needed for conversation context
        anchorName: config.anchorName || 'Host',
        anchorId: config.anchorId,
      });
      
      // Connect NoteContext to ProfileContext for related note operations
      this.profileContext.setNoteContext(this.noteContext);
      
      // Set initial state
      this.useExternalSources = config.useExternalSources;
      
      // Initialize conversation if roomId is provided
      if (roomId) {
        this.conversationContext.getOrCreateConversationForRoom(roomId, interfaceType)
          .then(conversationId => {
            this.logger.debug(`Initialized conversation for room ${roomId}: ${conversationId}`);
          })
          .catch(error => {
            this.logger.warn(`Failed to initialize conversation for room ${roomId}:`, error);
          });
      }
      
      // Mark as successfully initialized
      this.initialized = true;
      
      this.logger.debug('Context manager successfully initialized');
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to initialize one or more contexts:', error);
      throw new ValidationError(
        'Context manager failed to initialize',
        { apiKey: !!apiKey, newsApiKey: !!newsApiKey, interfaceType, error },
      );
    }
  }

  /**
   * Get the note context for data access operations
   * @returns The note context instance
   * @throws Error if context is not properly initialized
   */
  getNoteContext(): NoteContext {
    this.ensureContextsReady();
    return this.noteContext;
  }

  /**
   * Get the profile context for profile operations
   * @returns The profile context instance
   * @throws Error if context is not properly initialized
   */
  getProfileContext(): ProfileContext {
    this.ensureContextsReady();
    return this.profileContext;
  }

  /**
   * Get the external source context for external knowledge access
   * @returns The external source context instance
   * @throws Error if context is not properly initialized
   */
  getExternalSourceContext(): ExternalSourceContext {
    this.ensureContextsReady();
    return this.externalSourceContext;
  }
  
  /**
   * Get the conversation context for conversation management
   * @returns The conversation context instance
   * @throws Error if context is not properly initialized
   */
  getConversationContext(): ConversationContext {
    this.ensureContextsReady();
    return this.conversationContext;
  }
  
  /**
   * Get the website context
   * @returns The website context instance
   * @throws Error if context is not properly initialized
   */
  getWebsiteContext(): WebsiteContext {
    this.ensureContextsReady();
    
    // Import and return an instance of WebsiteContext
    // Using dynamic import to prevent circular dependencies
    return import('@/contexts/website/core/websiteContext').then(
      ({ WebsiteContext }) => WebsiteContext.getInstance(),
    ) as unknown as WebsiteContext;
  }

  /**
   * Enable or disable external sources functionality
   * @param enabled Whether external sources should be enabled
   */
  setExternalSourcesEnabled(enabled: boolean): void {
    // Only log if there's an actual change
    if (this.useExternalSources !== enabled) {
      this.useExternalSources = enabled;
      this.logger.info(`External sources ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get the current status of external sources
   * @returns Whether external sources are enabled
   */
  getExternalSourcesEnabled(): boolean {
    return this.useExternalSources;
  }

  /**
   * Check if all contexts are properly initialized
   * @returns Whether all contexts are ready
   */
  areContextsReady(): boolean {
    return this.initialized &&
           isDefined(this.noteContext) && 
           isDefined(this.profileContext) && 
           isDefined(this.externalSourceContext) &&
           isDefined(this.conversationContext);
  }

  /**
   * Ensure that all contexts are ready to use
   * @throws Error if contexts are not ready
   */
  private ensureContextsReady(): void {
    if (!this.areContextsReady()) {
      throw new Error(
        this.initializationError
          ? `Contexts not ready: ${this.initializationError.message}`
          : 'Contexts not ready: Initialization incomplete',
      );
    }
  }

  /**
   * Initialize the link between profile and note contexts
   * This should be called after contexts are initialized if needed
   */
  initializeContextLinks(): void {
    if (this.areContextsReady()) {
      // Connect NoteContext to ProfileContext for related note operations
      this.profileContext.setNoteContext(this.noteContext);
      this.logger.debug('Context links initialized');
    } else {
      this.logger.warn('Cannot initialize context links: contexts not ready');
    }
  }

  /**
   * Reset all context instances (useful for testing)
   * This resets the singleton instances to ensure clean state
   */
  static resetContexts(): void {
    const logger = Logger.getInstance();
    
    NoteContext.resetInstance();
    ProfileContext.resetInstance();
    ExternalSourceContext.resetInstance();
    // Reset the conversation context as well
    if (ConversationContext.resetInstance) {
      ConversationContext.resetInstance();
    } else {
      logger.warn('ConversationContext does not support resetInstance');
    }
    logger.debug('All context singletons have been reset');
  }
}