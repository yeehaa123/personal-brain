/**
 * ConversationContext mock implementation
 * 
 * Provides a standardized mock for the ConversationContext class.
 */

import { nanoid } from 'nanoid';

// Import only what we need from the real implementations - primarily just types
import type { ResourceDefinition } from '@/contexts/contextInterface';
import type { McpFormattedConversation } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { TieredHistory } from '@/contexts/conversations/memory/tieredMemoryManager';
import type { ConversationInfo, ConversationSummary, SearchCriteria } from '@/contexts/conversations/storage/conversationStorage';
import type { FormattingOptions } from '@/contexts/formatterInterface';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';

import { MockBaseContext } from './baseContext';
import { MockConversationFormatter } from './conversationFormatter';
import { MockConversationMcpFormatter } from './conversationMcpFormatter';
import { MockConversationMemoryService } from './conversationMemoryService';
import { MockConversationQueryService } from './conversationQueryService';
import { MockConversationResourceService } from './conversationResourceService';
import { MockConversationStorageAdapter } from './conversationStorageAdapter';
import { MockConversationToolService } from './conversationToolService';

/**
 * Mock implementation for the ConversationContext
 */
export class MockConversationContext extends MockBaseContext {
  private static instance: MockConversationContext | null = null;
  
  // Mock services
  public storageAdapter: MockConversationStorageAdapter;
  public override formatter: MockConversationFormatter;
  public mcpFormatter: MockConversationMcpFormatter;
  public resourceService: MockConversationResourceService;
  public toolService: MockConversationToolService;
  public queryService: MockConversationQueryService;
  public memoryService: MockConversationMemoryService;
  
  // Configuration properties
  protected contextName: string;
  protected contextVersion: string;
  protected anchorName: string;
  protected anchorId: string;
  protected defaultUserName: string;
  protected defaultUserId: string;
  protected tieredMemoryConfig: Record<string, unknown>;
  
  /**
   * Get singleton instance of MockConversationContext
   */
  public static override getInstance(): MockConversationContext {
    if (!MockConversationContext.instance) {
      MockConversationContext.instance = new MockConversationContext();
    }
    return MockConversationContext.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockConversationContext.instance = null;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static override createFresh(config: Record<string, unknown> = {}): MockConversationContext {
    return new MockConversationContext(config);
  }
  
  /**
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    // Extract values for super constructor
    const name = config['name'] as string || 'ConversationBrain';
    const version = config['version'] as string || '1.0.0';
    
    super({
      name,
      version,
    });
    
    // Set configuration properties
    this.contextName = name;
    this.contextVersion = version;
    
    // Set display properties
    const display = config['display'] as Record<string, unknown> | undefined;
    this.anchorName = (display?.['anchorName'] as string) || 
                      (config['anchorName'] as string) || 
                      'Host';
    this.anchorId = (display?.['anchorId'] as string) || 
                    (config['anchorId'] as string) || 
                    '';
    this.defaultUserName = (display?.['defaultUserName'] as string) || 
                          (config['defaultUserName'] as string) || 
                          'User';
    this.defaultUserId = (display?.['defaultUserId'] as string) || 
                         (config['defaultUserId'] as string) || 
                         '';
    this.tieredMemoryConfig = (config['tieredMemoryConfig'] as Record<string, unknown>) || {};
    
    // Initialize mock services using standardized pattern
    this.storageAdapter = MockConversationStorageAdapter.createFresh();
    this.formatter = MockConversationFormatter.createFresh();
    this.mcpFormatter = MockConversationMcpFormatter.createFresh();
    this.resourceService = MockConversationResourceService.createFresh();
    this.toolService = MockConversationToolService.createFresh();
    this.queryService = MockConversationQueryService.createFresh();
    this.memoryService = MockConversationMemoryService.createFresh();
    
    // Set resources and tools
    const resources = this.resourceService.getResources(this);
    const tools = this.toolService.getTools(this);
    
    this.resources = resources as unknown as ResourceDefinition[];
    this.tools = tools as unknown as ResourceDefinition[];
  }
  
  /**
   * Get the context name
   */
  override getContextName(): string {
    return this.contextName;
  }
  
  /**
   * Get the context version
   */
  override getContextVersion(): string {
    return this.contextVersion;
  }

  /**
   * Override base format method from MockBaseContext
   * This handles the standard format method required by the interface
   */
  override format(data: ConversationTurn[], options?: FormattingOptions): string {
    return this.formatter.format(data, options);
  }
  
  /**
   * Get the storage adapter
   */
  override getStorage(): MockConversationStorageAdapter {
    return this.storageAdapter;
  }
  
  /**
   * Get the formatter
   */
  override getFormatter(): MockConversationFormatter {
    return this.formatter;
  }
  
  /**
   * Get the MCP formatter
   */
  getMcpFormatter(): MockConversationMcpFormatter {
    return this.mcpFormatter;
  }
  
  /**
   * Set a new storage adapter
   */
  setStorage(storage: MockConversationStorageAdapter): void {
    this.storageAdapter = storage;
  }
  
  /**
   * Get the query service
   */
  getQueryService(): MockConversationQueryService {
    return this.queryService;
  }
  
  /**
   * Get the memory service
   */
  getMemoryService(): MockConversationMemoryService {
    return this.memoryService;
  }
  
  /**
   * Get the resource service
   */
  getResourceService(): MockConversationResourceService {
    return this.resourceService;
  }
  
  /**
   * Get the tool service
   */
  getToolService(): MockConversationToolService {
    return this.toolService;
  }
  
  /**
   * Get the anchor name
   */
  getAnchorName(): string {
    return this.anchorName;
  }
  
  /**
   * Get the anchor ID
   */
  getAnchorId(): string | undefined {
    return this.anchorId;
  }
  
  /**
   * Check if a user is the anchor
   */
  isAnchor(userId: string): boolean {
    return this.anchorId === userId;
  }
  
  /**
   * Create a conversation
   * Delegates to query service
   */
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    return this.queryService.createConversation(interfaceType, roomId);
  }
  
  /**
   * Get a conversation
   * Delegates to query service
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.queryService.getConversation(conversationId);
  }
  
  /**
   * Get conversation ID by room
   * Delegates to query service
   */
  async getConversationIdByRoom(
    roomId: string,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<string | null> {
    return this.queryService.getConversationIdByRoom(roomId, interfaceType);
  }
  
  /**
   * Get or create conversation for room
   * Delegates to query service
   */
  async getOrCreateConversationForRoom(
    roomId: string,
    interfaceType: 'cli' | 'matrix',
  ): Promise<string> {
    return this.queryService.getOrCreateConversationForRoom(roomId, interfaceType);
  }
  
  /**
   * Add a turn to a conversation
   */
  async addTurn(
    conversationId: string,
    query: string,
    response?: string,
    options?: { userId?: string; userName?: string; metadata?: Record<string, unknown> },
  ): Promise<string> {
    // Ensure conversation exists
    const conversation = await this.queryService.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    // Default user ID and name from options or context defaults
    const userId = options?.userId || this.defaultUserId;
    const userName = options?.userName || this.defaultUserName;
    
    // Create turn
    const turn: Partial<ConversationTurn> = {
      id: `turn-${nanoid()}`,
      timestamp: new Date(),
      query,
      response: response || '',
      userId,
      userName,
      metadata: {
        ...(options?.metadata || {}),
        isActive: true,
      },
    };
    
    // Add turn through memory service
    return this.memoryService.addTurn(conversationId, turn);
  }
  
  /**
   * Get turns for a conversation
   * Delegates to memory service
   */
  async getTurns(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<ConversationTurn[]> {
    return this.memoryService.getTurns(conversationId, limit, offset);
  }
  
  /**
   * Force summarization
   * Delegates to memory service
   */
  async forceSummarize(conversationId: string): Promise<boolean> {
    return this.memoryService.forceSummarize(conversationId);
  }
  
  /**
   * Get tiered history
   * Delegates to memory service
   */
  async getTieredHistory(conversationId: string): Promise<TieredHistory> {
    return this.memoryService.getTieredHistory(conversationId);
  }
  
  /**
   * Get conversation history with formatting
   */
  async getConversationHistory(
    conversationId: string,
    options: { 
      format?: 'text' | 'markdown' | 'json' | 'html';
      maxTurns?: number;
      includeTimestamps?: boolean;
      includeMetadata?: boolean;
      includeSummaries?: boolean;
    } = {},
  ): Promise<string> {
    // Get turns based on options
    const turns = await this.memoryService.getTurns(
      conversationId,
      options.maxTurns || undefined,
    );
    
    // Get summaries if requested
    let summaries: ConversationSummary[] = [];
    if (options.includeSummaries) {
      summaries = await this.memoryService.getSummaries(conversationId);
    }
    
    // Format the conversation
    const formattingOptions = {
      format: options.format || 'text',
      includeTimestamps: options.includeTimestamps || false,
      includeMetadata: options.includeMetadata || false,
      anchorName: this.anchorName,
      anchorId: this.anchorId,
      highlightAnchor: true,
    };
    
    return this.formatter.formatConversation(turns, summaries, formattingOptions);
  }
  
  /**
   * Format history for prompt
   * Delegates to memory service
   */
  async formatHistoryForPrompt(conversationId: string, maxTokens?: number): Promise<string> {
    return this.memoryService.formatHistoryForPrompt(conversationId, maxTokens);
  }
  
  /**
   * Find conversations
   * Delegates to query service
   */
  async findConversations(criteria: SearchCriteria): Promise<ConversationInfo[]> {
    return this.queryService.findConversations(criteria);
  }
  
  /**
   * Get conversations by room
   * Delegates to query service
   */
  async getConversationsByRoom(
    roomId: string,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    return this.queryService.getConversationsByRoom(roomId, interfaceType);
  }
  
  /**
   * Get recent conversations
   * Delegates to query service
   */
  async getRecentConversations(
    limit?: number,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    return this.queryService.getRecentConversations(limit, interfaceType);
  }
  
  /**
   * Update conversation metadata
   * Delegates to query service
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    return this.queryService.updateMetadata(conversationId, metadata);
  }
  
  /**
   * Delete a conversation
   * Delegates to query service
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.queryService.deleteConversation(conversationId);
  }
  
  /**
   * Get formatted conversation data for MCP responses
   */
  async getFormattedConversationForMcp(
    conversationId: string,
    options: Record<string, unknown> = {},
  ): Promise<McpFormattedConversation | null> {
    // Get conversation
    const conversation = await this.queryService.getConversation(conversationId);
    if (!conversation) {
      return null;
    }
    
    // Get turns and summaries
    const turns = await this.memoryService.getTurns(conversationId);
    const summaries = await this.memoryService.getSummaries(conversationId);
    
    // Format them with MCP formatter
    return this.mcpFormatter.formatConversationForMcp(
      conversation,
      turns,
      summaries,
      options,
    );
  }
}