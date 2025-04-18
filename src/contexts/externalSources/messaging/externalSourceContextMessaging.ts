/**
 * Messaging-Enabled External Source Context
 * 
 * This module extends the ExternalSourceContext with messaging capabilities,
 * allowing it to participate in cross-context communication.
 */

import { ContextId } from '@/protocol/core/contextOrchestratorExtended';
import type { ContextMediator } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { ExternalSourceContext } from '../core/externalSourceContext';
import type { ExternalSourceInterface } from '../sources/externalSourceInterface';
import type { ExternalSourceResult } from '../sources/externalSourceInterface';

import { ExternalSourceMessageHandler } from './externalSourceMessageHandler';
import { ExternalSourceNotifier } from './externalSourceNotifier';

/**
 * Messaging-enabled extension of ExternalSourceContext
 */
export class ExternalSourceContextMessaging {
  private logger = Logger.getInstance();
  private notifier: ExternalSourceNotifier;
  
  /**
   * Create a messaging-enabled wrapper for an ExternalSourceContext
   * 
   * @param externalSourceContext The external source context to extend
   * @param mediator The context mediator for messaging
   */
  constructor(
    private externalSourceContext: ExternalSourceContext,
    mediator: ContextMediator,
  ) {
    // Create notifier
    this.notifier = new ExternalSourceNotifier(mediator);
    
    // Register message handler
    const handler = ExternalSourceMessageHandler.createHandler(externalSourceContext);
    mediator.registerHandler(ContextId.EXTERNAL_SOURCES, handler);
    
    this.logger.debug('ExternalSourceContextMessaging initialized');
  }
  
  /**
   * Get the underlying external source context
   * @returns The external source context
   */
  getContext(): ExternalSourceContext {
    return this.externalSourceContext;
  }
  
  /**
   * Delegate methods to the original context
   */
  
  /**
   * Check if the external source service is enabled
   * This is an adapter method implemented at the messaging layer
   * @returns True if at least one external source is enabled
   */
  isEnabled(): boolean {
    // If we have any enabled sources, the service is considered enabled
    return this.externalSourceContext.getEnabledSources().length > 0;
  }
  
  /**
   * Enable or disable the external source service
   * This is an adapter method implemented at the messaging layer
   * @param enabled Whether the service should be enabled
   */
  setEnabled(_enabled: boolean): void {
    // This is a no-op since enabling/disabling is handled at the source level
    // through the storage adapter by adding/removing sources from the enabled list
    this.logger.debug('setEnabled called - no-op at messaging layer');
  }
  
  /**
   * Get a source by name
   * This is an adapter method implemented at the messaging layer
   * @param name Name of the source to retrieve
   * @returns The source if found, or null if not found
   */
  getSourceByName(name: string): ExternalSourceInterface | null {
    // Find the source by name in the enabled sources
    const sources = this.externalSourceContext.getEnabledSources();
    const source = sources.find(s => s.name === name);
    return source || null;
  }
  
  /**
   * Add a new external source
   * Delegates to the underlying context's registerSource method
   * @param source The source to add
   */
  addSource(source: ExternalSourceInterface): void {
    this.externalSourceContext.registerSource(source);
  }
  
  /**
   * Remove a source by name
   * This is an adapter method implemented at the messaging layer
   * @param name Name of the source to remove
   * @returns True if the source was removed, false otherwise
   */
  removeSource(_name: string): boolean {
    // External sources cannot be removed at runtime, only disabled
    // This would require updating the storage adapter's configuration
    this.logger.warn('removeSource called - not supported at runtime');
    return false;
  }
  
  /**
   * Get names of all available sources
   * This is an adapter method implemented at the messaging layer
   * @returns Array of source names
   */
  getAvailableSources(): string[] {
    // Map the enabled sources to their names
    const sources = this.externalSourceContext.getEnabledSources();
    return sources.map(source => source.name);
  }
  
  /**
   * Search external sources for information
   * Delegates to the underlying context's search method and sends notification
   * @param query The search query
   * @returns Promise that resolves to an array of results
   */
  async searchExternalSources(query: string): Promise<ExternalSourceResult[]> {
    // Delegate to the search method, which is actually available
    const results = await this.externalSourceContext.search(query);
    
    // Notify other contexts about the search
    await this.notifier.notifyExternalSourceSearched(query, results);
    
    return results;
  }
  
  /**
   * Check availability of all sources
   * Delegates to the underlying context's checkSourcesAvailability method
   * and sends notification
   * @returns Record mapping source names to availability status
   */
  async checkSourcesAvailability(): Promise<Record<string, boolean>> {
    const availability = await this.externalSourceContext.checkSourcesAvailability();
    
    // Notify other contexts about source availability changes
    await this.notifier.notifySourceAvailabilityChanged(availability);
    
    return availability;
  }
  
  /**
   * Perform semantic search on external sources
   * Delegates to the underlying context's semanticSearch method
   * and sends notification
   * @param query The search query
   * @param limit Maximum number of results to return
   * @returns Promise that resolves to an array of semantically relevant results
   */
  async semanticSearch(query: string, limit?: number): Promise<ExternalSourceResult[]> {
    const results = await this.externalSourceContext.semanticSearch(query, limit);
    
    // Notify other contexts about the search
    await this.notifier.notifyExternalSourceSearched(query, results);
    
    return results;
  }
}