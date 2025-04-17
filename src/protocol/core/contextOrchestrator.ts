/**
 * Context Orchestrator
 * 
 * Coordinates interactions between different contexts in the system.
 * This class is responsible for managing access to contexts, initializing them,
 * and ensuring they can communicate with each other.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type {
  ConversationContext,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
  WebsiteContext,
} from '@/contexts';
import { Logger } from '@/utils/logger';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ContextManager } from '../managers/contextManager';

/**
 * Configuration options for ContextOrchestrator
 */
export interface ContextOrchestratorOptions {
  /** Configuration for the orchestrator */
  config: BrainProtocolConfig;
}

/**
 * Orchestrates interactions between contexts in the system
 */
export class ContextOrchestrator {
  private static instance: ContextOrchestrator | null = null;
  
  /** Context manager for accessing contexts */
  private contextManager: ContextManager;
  
  /** Logger instance */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of ContextOrchestrator
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options: ContextOrchestratorOptions): ContextOrchestrator {
    if (!ContextOrchestrator.instance) {
      ContextOrchestrator.instance = new ContextOrchestrator(options);
      
      const logger = Logger.getInstance();
      logger.debug('ContextOrchestrator singleton instance created');
    }
    
    return ContextOrchestrator.instance;
  }
  
  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   */
  public static resetInstance(): void {
    if (ContextManager.resetInstance) {
      ContextManager.resetInstance();
    }
    
    ContextOrchestrator.instance = null;
    
    const logger = Logger.getInstance();
    logger.debug('ContextOrchestrator singleton instance reset');
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options: ContextOrchestratorOptions): ContextOrchestrator {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ContextOrchestrator instance');
    
    return new ContextOrchestrator(options);
  }
  
  /**
   * Private constructor to enforce getInstance() usage
   * 
   * @param options Configuration options
   */
  private constructor(options: ContextOrchestratorOptions) {
    // Initialize the context manager
    this.contextManager = ContextManager.getInstance({ config: options.config });
    
    // Ensure contexts are ready
    if (!this.contextManager.areContextsReady()) {
      throw new Error('Context manager initialization failed: contexts not ready');
    }
    
    // Initialize context links
    this.contextManager.initializeContextLinks();
    
    this.logger.debug('ContextOrchestrator initialized');
  }
  
  /**
   * Get the note context
   * @returns Note context
   */
  getNoteContext(): NoteContext {
    return this.contextManager.getNoteContext();
  }
  
  /**
   * Get the profile context
   * @returns Profile context
   */
  getProfileContext(): ProfileContext {
    return this.contextManager.getProfileContext();
  }
  
  /**
   * Get the conversation context
   * @returns Conversation context
   */
  getConversationContext(): ConversationContext {
    return this.contextManager.getConversationContext();
  }
  
  /**
   * Get the external source context
   * @returns External source context
   */
  getExternalSourceContext(): ExternalSourceContext {
    return this.contextManager.getExternalSourceContext();
  }
  
  /**
   * Get the website context
   * @returns Website context
   */
  getWebsiteContext(): WebsiteContext {
    return this.contextManager.getWebsiteContext();
  }
  
  /**
   * Enable or disable external sources
   * @param enabled Whether external sources are enabled
   */
  setExternalSourcesEnabled(enabled: boolean): void {
    this.contextManager.setExternalSourcesEnabled(enabled);
    this.logger.debug(`External sources ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if external sources are enabled
   * @returns Whether external sources are enabled
   */
  getExternalSourcesEnabled(): boolean {
    return this.contextManager.getExternalSourcesEnabled();
  }
  
  /**
   * Check if all contexts are ready
   * @returns Whether all contexts are ready
   */
  areContextsReady(): boolean {
    return this.contextManager.areContextsReady();
  }
  
  /**
   * Get the context manager
   * @returns Context manager
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }
}