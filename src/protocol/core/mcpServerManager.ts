/**
 * MCP Server Manager
 * 
 * Encapsulates the creation, configuration, and access to the MCP server instance.
 * Provides a unified interface for interacting with the MCP server and registering
 * resources and tools from various contexts.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createUnifiedMcpServer } from '@/mcpServer';
import { Logger } from '@/utils/logger';

import type { ConfigurationManager } from './configurationManager';
import type { ContextOrchestrator } from './contextOrchestrator';

/**
 * Configuration options for McpServerManager
 */
export interface McpServerManagerOptions {
  /** Context orchestrator for registering context resources */
  contextOrchestrator: ContextOrchestrator;
  /** Configuration manager for accessing server config */
  configManager: ConfigurationManager;
}

/**
 * Manages the MCP server instance
 */
export class McpServerManager {
  private static instance: McpServerManager | null = null;
  
  /** Context orchestrator instance */
  private contextOrchestrator: ContextOrchestrator;
  /** Configuration manager instance */
  private configManager: ConfigurationManager;
  /** MCP server instance */
  private mcpServer: McpServer | null = null;
  
  /** Logger instance */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of McpServerManager
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options: McpServerManagerOptions): McpServerManager {
    if (!McpServerManager.instance) {
      McpServerManager.instance = new McpServerManager(options);
      
      const logger = Logger.getInstance();
      logger.debug('McpServerManager singleton instance created');
    }
    
    return McpServerManager.instance;
  }
  
  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   */
  public static resetInstance(): void {
    McpServerManager.instance = null;
    
    const logger = Logger.getInstance();
    logger.debug('McpServerManager singleton instance reset');
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options: McpServerManagerOptions): McpServerManager {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh McpServerManager instance');
    
    return new McpServerManager(options);
  }
  
  /**
   * Private constructor to enforce getInstance() usage
   * 
   * @param options Configuration options
   */
  private constructor(options: McpServerManagerOptions) {
    this.contextOrchestrator = options.contextOrchestrator;
    this.configManager = options.configManager;
    
    // Initialize the MCP server
    this.initializeMcpServer();
    
    this.logger.debug('McpServerManager initialized');
  }
  
  /**
   * Initialize the MCP server instance
   */
  private initializeMcpServer(): void {
    try {
      // Create the MCP server using config
      const mcpServerConfig = this.configManager.getMcpServerConfig();
      this.mcpServer = createUnifiedMcpServer(mcpServerConfig);
      
      // Register context resources on the server
      this.registerContextResources();
      
      this.logger.info('MCP server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCP server:', error);
      this.mcpServer = null;
    }
  }
  
  /**
   * Register context resources on the MCP server
   */
  private registerContextResources(): void {
    if (!this.mcpServer) {
      this.logger.warn('Cannot register context resources: MCP server not initialized');
      return;
    }
    
    try {
      // Get all contexts from the orchestrator
      const noteContext = this.contextOrchestrator.getNoteContext();
      const profileContext = this.contextOrchestrator.getProfileContext();
      const conversationContext = this.contextOrchestrator.getConversationContext();
      const externalSourceContext = this.contextOrchestrator.getExternalSourceContext();
      const websiteContext = this.contextOrchestrator.getWebsiteContext();
      
      // Register each context on the server
      noteContext.registerOnServer(this.mcpServer);
      profileContext.registerOnServer(this.mcpServer);
      conversationContext.registerOnServer(this.mcpServer);
      externalSourceContext.registerOnServer(this.mcpServer);
      websiteContext.registerOnServer(this.mcpServer);
      
      this.logger.debug('Context resources registered on MCP server');
    } catch (error) {
      this.logger.error('Failed to register context resources:', error);
    }
  }
  
  /**
   * Get the MCP server instance
   * @returns The MCP server instance
   */
  getMcpServer(): McpServer | null {
    return this.mcpServer;
  }
  
  /**
   * Check if the MCP server is initialized
   * @returns Whether the MCP server is initialized
   */
  hasMcpServer(): boolean {
    return !!this.mcpServer;
  }
  
  /**
   * Recreate the MCP server (for instance, when configuration changes)
   */
  recreateMcpServer(): void {
    this.logger.info('Recreating MCP server');
    this.mcpServer = null;
    this.initializeMcpServer();
  }
}