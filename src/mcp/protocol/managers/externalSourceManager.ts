/**
 * External Source Manager for BrainProtocol
 * Manages external knowledge sources
 */
import type { ExternalSourceContext } from '@/mcp';
import type { ExternalSourceResult } from '@/mcp/contexts/externalSources/sources';
import { ExternalSourceService } from '@/mcp/protocol/components/externalSourceService';
import type { ProfileAnalyzer } from '@/mcp/protocol/components/profileAnalyzer';
import type { PromptFormatter } from '@/mcp/protocol/components/promptFormatter';
import type { Note } from '@/models/note';
import logger from '@/utils/logger';

import type { IExternalSourceManager } from '../types';

/**
 * Configuration options for ExternalSourceManager
 */
export interface ExternalSourceManagerConfig {
  /** External source context instance */
  externalSourceContext: ExternalSourceContext | null;
  /** Profile analyzer for relevance checks */
  profileAnalyzer: ProfileAnalyzer;
  /** Prompt formatter for excerpts */
  promptFormatter: PromptFormatter;
  /** Whether external sources are enabled */
  enabled?: boolean;
}

/**
 * Manages external knowledge sources
 */
export class ExternalSourceManager implements IExternalSourceManager {
  // Singleton instance
  private static instance: ExternalSourceManager | null = null;
  
  private externalSourceService: ExternalSourceService | null;
  private enabled: boolean;

  /**
   * Get the singleton instance of ExternalSourceManager
   * @param config Configuration options
   * @returns The shared ExternalSourceManager instance
   */
  public static getInstance(config: ExternalSourceManagerConfig): ExternalSourceManager {
    if (!ExternalSourceManager.instance) {
      ExternalSourceManager.instance = new ExternalSourceManager(
        config.externalSourceContext,
        config.profileAnalyzer,
        config.promptFormatter,
        config.enabled,
      );
    }
    return ExternalSourceManager.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    ExternalSourceManager.instance = null;
  }

  /**
   * Create a fresh ExternalSourceManager instance (primarily for testing)
   * @param config Configuration options
   * @returns A new ExternalSourceManager instance
   */
  public static createFresh(config: ExternalSourceManagerConfig): ExternalSourceManager {
    return new ExternalSourceManager(
      config.externalSourceContext,
      config.profileAnalyzer,
      config.promptFormatter,
      config.enabled,
    );
  }

  /**
   * Create a new external source manager
   * @param externalSourceContext External source context
   * @param profileAnalyzer Profile analyzer for relevance checks
   * @param promptFormatter Prompt formatter for excerpts
   * @param enabled Whether external sources are enabled
   */
  private constructor(
    externalSourceContext: ExternalSourceContext | null,
    profileAnalyzer: ProfileAnalyzer,
    promptFormatter: PromptFormatter,
    enabled: boolean = false,
  ) {
    this.enabled = enabled;
    
    // Initialize the service if we have a context
    if (externalSourceContext) {
      this.externalSourceService = new ExternalSourceService(
        externalSourceContext,
        profileAnalyzer,
        promptFormatter,
      );
      logger.debug('External source manager initialized with service');
    } else {
      this.externalSourceService = null;
      logger.debug('External source manager initialized without service');
    }
  }

  /**
   * Check if external sources are enabled
   * @returns Whether external sources are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable external sources
   * @param enabled Whether to enable external sources
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info(`External sources ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get external results for a query
   * @param query Query to get results for
   * @param relevantNotes Relevant notes for the query
   * @returns External results or null
   */
  async getExternalResults(query: string, relevantNotes: Note[]): Promise<ExternalSourceResult[] | null> {
    // If not enabled or no service, return null
    if (!this.enabled || !this.externalSourceService) {
      return null;
    }
    
    // Check if we should query external sources
    const shouldQueryExternal = this.externalSourceService.shouldQueryExternalSources(query, relevantNotes);
    
    if (shouldQueryExternal) {
      logger.info('Querying external sources for additional context');
      const results = await this.externalSourceService.fetchExternalContext(query);
      
      if (results && results.length > 0) {
        logger.info(`Found ${results.length} relevant external sources`);
        return results;
      }
    }
    
    return null;
  }
}