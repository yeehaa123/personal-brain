/**
 * External Source Tools for MCP
 * 
 * This file contains the tool definitions for the ExternalSourceContext
 * following the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { z } from 'zod';

import type { ResourceDefinition } from '@/contexts/contextInterface';
import type { ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';
import { Logger } from '@/utils/logger';

/**
 * Interface for external source contexts that provide tool functionality
 * This defines the minimum functionality needed from any external source context
 * for the tool service to work properly.
 */
export interface ExternalSourceToolContext {
  search(query: string, options?: { limit?: number; addEmbeddings?: boolean }): Promise<ExternalSourceResult[]>;
  semanticSearch(query: string, limit?: number): Promise<ExternalSourceResult[]>;
  getEnabledSources(): { name: string; enabled: boolean }[];
  updateEnabledSources(sourceNames: string[]): Promise<void>;
  checkSourcesAvailability(): Promise<Record<string, boolean>>;
}

/**
 * Configuration options for ExternalSourceToolService
 */
export interface ExternalSourceToolServiceConfig {
  /** Whether to include detailed debug info in error responses */
  includeDebugInfo?: boolean;
  /** Default limit for search results */
  defaultSearchLimit?: number;
}

/**
 * Dependencies for ExternalSourceToolService
 */
export interface ExternalSourceToolServiceDependencies {
  /** Logger instance */
  logger?: Logger;
}

/**
 * Service responsible for providing MCP tools for external sources
 * Follows the Component Interface Standardization pattern
 */
export class ExternalSourceToolService {
  /** The singleton instance */
  private static instance: ExternalSourceToolService | null = null;
  
  /** Configuration values */
  private readonly config: ExternalSourceToolServiceConfig;
  
  /** Logger instance for this class */
  private readonly logger: Logger;
  
  /**
   * Get the singleton instance of ExternalSourceToolService
   * 
   * @param config Optional configuration
   * @returns The shared ExternalSourceToolService instance
   */
  public static getInstance(config?: ExternalSourceToolServiceConfig): ExternalSourceToolService {
    if (!ExternalSourceToolService.instance) {
      ExternalSourceToolService.instance = new ExternalSourceToolService(config);
    } else if (config) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }
    return ExternalSourceToolService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    ExternalSourceToolService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param config Optional configuration
   * @returns A new ExternalSourceToolService instance
   */
  public static createFresh(config?: ExternalSourceToolServiceConfig): ExternalSourceToolService {
    return new ExternalSourceToolService(config);
  }
  
  
  /**
   * Private constructor to enforce factory methods
   * 
   * @param config Optional configuration
   * @param dependencies Optional dependencies
   */
  private constructor(
    config?: ExternalSourceToolServiceConfig,
    dependencies?: ExternalSourceToolServiceDependencies,
  ) {
    this.config = {
      includeDebugInfo: config?.includeDebugInfo ?? false,
      defaultSearchLimit: config?.defaultSearchLimit ?? 5,
    };
    this.logger = dependencies?.logger || Logger.getInstance();
    
    this.logger.debug('ExternalSourceToolService initialized', { context: 'ExternalSourceToolService' });
  }
  
  /**
   * Get the MCP tools for the external source context
   * 
   * @param context The external source context (during migration, supports both ExternalSourceContext and MCPExternalSourceContext)
   * @returns Array of MCP tools
   */
  getTools(context: ExternalSourceToolContext): ResourceDefinition[] {
    return [
      // search_external_sources
      this.searchExternalSourcesTool(context),
      
      // toggle_external_source
      this.toggleExternalSourceTool(context),
      
      // get_external_sources_status
      this.getExternalSourcesStatusTool(context),
    ];
  }

  /**
   * Get the Zod schema for a tool based on its name
   * 
   * @param tool Tool definition with parameters
   * @returns Zod schema object for tool parameters
   */
  getToolSchema(tool: { name?: string }): Record<string, z.ZodTypeAny> {
    // Return appropriate Zod schema based on tool name
    switch (tool.name) {
    case 'search_external_sources':
      return {
        query: z.string().min(1, 'Query must not be empty'),
        limit: z.number().min(1).max(20).optional(),
        semantic: z.boolean().optional(),
      };

    case 'toggle_external_source':
      return {
        sourceName: z.string(),
        enabled: z.boolean(),
      };
      
    case 'get_external_sources_status':
      return {}; // No parameters needed
      
    default:
      // For unknown tools, return an empty schema
      return {};
    }
  }

  /**
   * Create the search_external_sources tool
   */
  private searchExternalSourcesTool(context: ExternalSourceToolContext): ResourceDefinition {
    return {
      protocol: 'external',
      path: 'search',
      handler: async (params: Record<string, unknown>) => {
        try {
          const query = params['query'] as string;
          const limit = params['limit'] as number || this.config.defaultSearchLimit;
          const semantic = params['semantic'] as boolean !== false;
          
          const results = semantic
            ? await context.semanticSearch(query, limit)
            : await context.search(query, { limit });
          
          if (results.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No results found for query: "${query}"`,
              }],
            };
          }
          
          return {
            content: results.map(result => ({
              type: 'text',
              text: `### ${result.title}\nSource: ${result.source}\n\n${result.content}\n`,
            })),
          };
        } catch (error) {
          this.logger.error('Error searching external sources via MCP tool', { error, context: 'ExternalSourceContext' });
          return {
            content: [{
              type: 'text',
              text: `Failed to search external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
      name: 'search_external_sources',
      description: 'Search across multiple external knowledge sources with optional semantic search',
    };
  }

  /**
   * Create the toggle_external_source tool
   */
  private toggleExternalSourceTool(context: ExternalSourceToolContext): ResourceDefinition {
    return {
      protocol: 'external',
      path: 'toggle_source',
      handler: async (params: Record<string, unknown>) => {
        try {
          const sourceName = params['sourceName'] as string;
          const enabled = params['enabled'] as boolean;
          
          // Get current enabled sources from the context
          const sources = context.getEnabledSources();
          const sourceNames = sources.map(s => s.name);
          
          // Update the enabled sources list based on the toggle
          if (enabled && !sourceNames.includes(sourceName)) {
            // Add the source if not already enabled
            sourceNames.push(sourceName);
          } else if (!enabled) {
            // Remove the source if enabled
            const index = sourceNames.indexOf(sourceName);
            if (index >= 0) {
              sourceNames.splice(index, 1);
            }
          }
          
          // Update the enabled sources with the new list
          await context.updateEnabledSources(sourceNames);
          
          return {
            content: [{
              type: 'text',
              text: `Source "${sourceName}" is now ${enabled ? 'enabled' : 'disabled'}. Enabled sources: ${sourceNames.join(', ') || 'None'}`,
            }],
          };
        } catch (error) {
          this.logger.error('Error toggling external source via MCP tool', { error, context: 'ExternalSourceContext' });
          return {
            content: [{
              type: 'text',
              text: `Failed to toggle external source: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
      name: 'toggle_external_source',
      description: 'Enable or disable a specific external knowledge source',
    };
  }

  /**
   * Create the get_external_sources_status tool
   */
  private getExternalSourcesStatusTool(context: ExternalSourceToolContext): ResourceDefinition {
    return {
      protocol: 'external',
      path: 'sources_status',
      handler: async () => {
        try {
          const availability = await context.checkSourcesAvailability();
          
          const sourcesList = Object.entries(availability).map(([name, isAvailable]) => {
            return `- ${name}: ${isAvailable ? '✅ Available' : '❌ Unavailable'}`;
          }).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `# External Knowledge Sources\n\n${sourcesList}`,
            }],
            metadata: {
              sources: Object.keys(availability),
              availability,
            },
          };
        } catch (error) {
          this.logger.error('Error getting external sources status via MCP tool', { error, context: 'ExternalSourceContext' });
          return {
            content: [{
              type: 'text',
              text: `Failed to get external sources status: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
      name: 'get_external_sources_status',
      description: 'Get the status of all external knowledge sources',
    };
  }
}