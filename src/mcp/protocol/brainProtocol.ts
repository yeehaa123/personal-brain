/**
 * BrainProtocol orchestrates the interaction between models and context
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';


import { aiConfig, conversationConfig, relevanceConfig } from '@/config';
import {
  ConversationContext,
  createUnifiedMcpServer,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
} from '@/mcp'; // Import all MCP implementations
import type { ExternalSourceResult } from '@/mcp/contexts/externalSources/sources';
import { ClaudeModel, EmbeddingService } from '@/mcp/model';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import type { Profile } from '@models/profile';
import logger from '@utils/logger';
import { isDefined, isNonEmptyString } from '@utils/safeAccessUtils';

import { ExternalSourceService } from './components/externalSourceService';
import { NoteService } from './components/noteService';
import { ProfileAnalyzer } from './components/profileAnalyzer';
import { PromptFormatter } from './components/promptFormatter';
import { SystemPromptGenerator } from './components/systemPromptGenerator';
import type { ExternalCitation, IConversationManager, ProtocolResponse } from './types';

/**
 * Interface for BrainProtocol constructor options
 */
export interface BrainProtocolOptions {
  apiKey?: string;
  newsApiKey?: string;
  useExternalSources?: boolean;
  interfaceType?: 'cli' | 'matrix';
  roomId?: string; // Now expected for both CLI and Matrix
  anchorName?: string; // Name for the anchor user in conversations
  anchorId?: string; // ID for the anchor user in conversations
}

export class BrainProtocol {
  // Core services
  private model: ClaudeModel;
  private context: NoteContext;
  private profileContext: ProfileContext;
  private externalContext: ExternalSourceContext;
  private conversationContext: ConversationContext; // New conversation context
  private embeddingService: EmbeddingService;

  // Unified MCP server
  private unifiedMcpServer: McpServer;

  // Component classes
  private promptFormatter: PromptFormatter;
  private systemPromptGenerator: SystemPromptGenerator;
  private profileAnalyzer: ProfileAnalyzer;
  private externalSourceService: ExternalSourceService;
  private noteService: NoteService;

  // State
  private profile: Profile | undefined;
  private useExternalSources: boolean = false;
  private interfaceType: 'cli' | 'matrix';
  private currentRoomId?: string;

  // Current conversation id for the active room
  private currentConversationId: string | null = null;

  /**
   * Creates a new instance of the BrainProtocol
   * @param options Options or legacy API key parameter
   * @param newsApiKey Legacy news API key parameter
   * @param useExternalSources Legacy external sources flag
   */
  // Singleton instance
  private static instance: BrainProtocol | null = null;

  /**
   * Get singleton instance of BrainProtocol
   * @param options Configuration options
   * @param forceNew Create a new instance (for testing)
   * @returns The BrainProtocol instance
   */
  public static getInstance(options?: BrainProtocolOptions, forceNew = false): BrainProtocol {
    if (!BrainProtocol.instance || forceNew) {
      BrainProtocol.instance = new BrainProtocol(options);
    }
    return BrainProtocol.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    BrainProtocol.instance = null;
  }

  constructor(
    optionsOrApiKey?: BrainProtocolOptions | string,
    newsApiKey?: string,
    useExternalSources: boolean = false,
  ) {
    // Handle both new options object and legacy parameters
    const options: BrainProtocolOptions = typeof optionsOrApiKey === 'string'
      ? { apiKey: optionsOrApiKey, newsApiKey, useExternalSources }
      : optionsOrApiKey || {};

    // Extract values with defaults
    const apiKey = options.apiKey;
    const newsApiKeyValue = options.newsApiKey || newsApiKey;
    const useExternalSourcesValue = options.useExternalSources ?? useExternalSources;

    // Set interface type (default to CLI if not specified)
    this.interfaceType = options.interfaceType || 'cli';
    this.currentRoomId = options.roomId;

    // Initialize core services
    this.model = new ClaudeModel(apiKey);

    // Get the singleton instance of EmbeddingService
    this.embeddingService = EmbeddingService.getInstance(apiKey ? { apiKey } : undefined);

    // Create the unified MCP server
    this.unifiedMcpServer = createUnifiedMcpServer({
      apiKey,
      newsApiKey: newsApiKeyValue,
      name: 'BrainProtocol',
      version: '1.0.0',
      enableExternalSources: useExternalSourcesValue,
    });

    // Initialize context objects using singletons
    this.context = NoteContext.getInstance(apiKey);
    this.profileContext = ProfileContext.getInstance({ apiKey });
    this.externalContext = ExternalSourceContext.getInstance(apiKey, newsApiKeyValue);
    this.conversationContext = ConversationContext.getInstance({
      // Pass any needed configuration
      anchorName: options.anchorName || 'Host',
      anchorId: options.anchorId,
    });

    // Initialize component classes
    this.promptFormatter = new PromptFormatter();
    this.systemPromptGenerator = new SystemPromptGenerator();
    this.profileAnalyzer = new ProfileAnalyzer(this.embeddingService);
    this.externalSourceService = new ExternalSourceService(
      this.externalContext,
      this.profileAnalyzer,
      this.promptFormatter,
    );
    this.noteService = new NoteService(this.context);

    // Initialize the conversation context
    // The conversation context is already initialized earlier in this constructor
    // We'll configure the current conversation when initializeConversation is called

    // Set initial state
    this.useExternalSources = useExternalSourcesValue;

    // Initialize conversation based on interface type
    this.initializeConversation();

    // Load profile asynchronously
    this.loadProfile();

    logger.info(`Brain protocol initialized with external sources ${useExternalSourcesValue ? 'enabled' : 'disabled'}`);
    logger.info(`Using interface type: ${this.interfaceType}`);
    logger.info('Using unified MCP server for all contexts');
  }

  /**
   * Get the note context to allow external access to note operations
   */
  getNoteContext(): NoteContext {
    return this.context;
  }

  /**
   * Get the unified MCP server instance
   * Returns a single MCP server with resources and tools from all contexts
   */
  getMcpServer(): McpServer {
    return this.unifiedMcpServer;
  }

  /**
   * Get the profile context to allow external access to profile operations
   */
  getProfileContext(): ProfileContext {
    return this.profileContext;
  }

  /**
   * Get the external source context to allow access to external knowledge operations
   */
  getExternalSourceContext(): ExternalSourceContext {
    return this.externalContext;
  }
  
  /**
   * Get the conversation context to allow access to conversation operations
   */
  getConversationContext(): ConversationContext {
    return this.conversationContext;
  }
  
  /**
   * Get the conversation manager (implements compatibility interface)
   * @returns This instance, which implements the required interface methods
   */
  getConversationManager(): IConversationManager {
    return this as unknown as IConversationManager;
  }

  /**
   * Check if there is an active conversation
   */
  hasActiveConversation(): boolean {
    return !!this.currentConversationId;
  }
  
  /**
   * Get the current conversation ID
   */
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }
  
  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await this.conversationContext.getConversation(conversationId);
  }
  
  /**
   * Save a turn to the conversation
   * @param query The user's query
   * @param response The assistant's response
   * @param options Turn options like user ID
   */
  async saveTurn(query: string, response: string, options?: { userId?: string; userName?: string; metadata?: Record<string, unknown> }): Promise<void> {
    if (!this.currentConversationId) {
      await this.initializeConversation();
      if (!this.currentConversationId) {
        throw new Error('Failed to initialize conversation');
      }
    }
    
    // Add the turn to the conversation
    await this.conversationContext.addTurn(
      this.currentConversationId,
      query,
      response,
      options,
    );
  }
  
  /**
   * Get formatted conversation history
   * @param conversationId Optional conversation ID (defaults to current)
   * @returns Formatted conversation history string
   */
  async getConversationHistory(conversationId?: string): Promise<string> {
    const id = conversationId || this.currentConversationId;
    if (!id) {
      return '';
    }
    
    return await this.conversationContext.getConversationHistory(id, {
      includeSummaries: true,
      format: 'text',
    });
  }

  /**
   * Enable or disable the use of external sources
   */
  setUseExternalSources(enabled: boolean): void {
    this.useExternalSources = enabled;
    logger.info(`External sources ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get the current status of external sources
   */
  getUseExternalSources(): boolean {
    return this.useExternalSources;
  }

  /**
   * Check if Anthropic API key is available
   */
  hasAnthropicApiKey(): boolean {
    return !!aiConfig.anthropic.apiKey;
  }

  /**
   * Check if OpenAI API key is available
   */
  hasOpenAIApiKey(): boolean {
    return !!aiConfig.openAI.apiKey;
  }

  /**
   * Initialize conversation based on interface type
   */
  private async initializeConversation(): Promise<void> {
    try {
      // Get the room ID - now required for both interfaces
      const roomId = this.currentRoomId || conversationConfig.defaultCliRoomId;
      
      // Initialize conversation in the ConversationContext
      this.currentConversationId = await this.conversationContext.getOrCreateConversationForRoom(
        roomId, 
        this.interfaceType,
      );
      
      // Log which room we're using
      if (this.interfaceType === 'matrix') {
        logger.info(`Started Matrix conversation for room ${roomId}: ${this.currentConversationId}`);
      } else {
        logger.info(`Started CLI conversation for room ${roomId}: ${this.currentConversationId}`);
      }
    } catch (error) {
      logger.error('Failed to initialize conversation:', error);
    }
  }

  /**
   * Set the current room ID (for any interface)
   * @param roomId The room ID
   */
  async setCurrentRoom(roomId: string): Promise<void> {
    this.currentRoomId = roomId;
    
    // Get or create conversation in ConversationContext
    this.currentConversationId = await this.conversationContext.getOrCreateConversationForRoom(
      roomId, 
      this.interfaceType,
    );
    
    // Log with interface type for clarity
    if (this.interfaceType === 'matrix') {
      logger.debug(`Switched to Matrix room ${roomId}: ${this.currentConversationId}`);
    } else {
      logger.debug(`Switched to CLI room ${roomId}: ${this.currentConversationId}`);
    }
  }

  /**
   * Load the user profile
   */
  private async loadProfile(): Promise<void> {
    try {
      const profileResult = await this.profileContext.getProfile();

      if (isDefined(profileResult)) {
        // Set profile only if we got a valid result
        this.profile = profileResult;
        logger.info('Profile loaded successfully');
      } else {
        logger.info('No profile found');
      }
    } catch (error) {
      logger.error('Error loading profile:', error);
      // Explicitly set profile to undefined in case of error
      this.profile = undefined;
    }
  }

  /**
   * Process a user query through the full MCP pipeline
   * @param query The user's query to process
   * @returns A structured response with answer and contextual information
   */
  /**
   * Process a user query through the full MCP pipeline with conversation history
   * @param query The user's query to process
   * @param options Optional parameters like user info for conversation tracking
   * @returns A structured response with answer and contextual information
   */
  async processQuery(
    query: string,
    options?: {
      userId?: string;
      userName?: string;
      roomId?: string;
    },
  ): Promise<ProtocolResponse> {
    // Validate input
    if (!isNonEmptyString(query)) {
      logger.warn('Empty query received, using default question');
      query = 'What information do you have in this brain?';
    }

    logger.info(`Processing query: "${query}"`);

    // If roomId is provided, ensure we're using the right conversation
    if (options?.roomId) {
      await this.setCurrentRoom(options.roomId);
    }

    // Ensure profile is loaded
    if (!isDefined(this.profile)) {
      await this.loadProfile();
    }

    // Ensure we have an active conversation
    if (!this.getConversationManager().hasActiveConversation()) {
      await this.initializeConversation();
    }

    // 1. Analyze profile relevance
    let isProfileQuery = this.profileAnalyzer.isProfileQuery(query);
    let profileRelevance = 0;

    // Get the profile relevance score for contextual prompting
    if (isDefined(this.profile) && isDefined(this.profile.embedding)) {
      profileRelevance = await this.profileAnalyzer.getProfileRelevance(query, this.profile);
      logger.debug(`Profile semantic relevance: ${profileRelevance.toFixed(2)}`);

      // If relevance is high enough, consider it a profile query
      if (profileRelevance > relevanceConfig.profileQueryThreshold && !isProfileQuery) {
        logger.info('Query is semantically relevant to profile');
        isProfileQuery = true;
      }
    }

    // 2. Retrieve relevant context from the database
    const relevantNotes = await this.noteService.fetchRelevantContext(query);
    const notesFound = Array.isArray(relevantNotes) ? relevantNotes.length : 0;
    logger.info(`Found ${notesFound} relevant notes`);

    // Safely log the top note if available
    if (notesFound > 0 && isDefined(relevantNotes[0])) {
      const topNoteTitle = relevantNotes[0].title || 'Untitled Note';
      logger.debug(`Top note: "${topNoteTitle}"`);
    }

    // 3. Fetch relevant external knowledge if enabled
    let externalResults: ExternalSourceResult[] = [];
    let externalCitations: ExternalCitation[] = [];

    if (this.useExternalSources) {
      // Determine if we should query external sources
      const shouldQueryExternal = this.externalSourceService.shouldQueryExternalSources(query, relevantNotes);

      if (shouldQueryExternal) {
        logger.info('Querying external sources for additional context');
        const fetchedResults = await this.externalSourceService.fetchExternalContext(query);

        // Ensure results is an array
        externalResults = Array.isArray(fetchedResults) ? fetchedResults : [];

        if (externalResults.length > 0) {
          logger.info(`Found ${externalResults.length} relevant external sources`);

          // Convert to citations format with safe access to properties
          externalCitations = externalResults.map(result => ({
            title: isNonEmptyString(result.title) ? result.title : 'Untitled Source',
            source: isNonEmptyString(result.source) ? result.source : 'Unknown Source',
            url: isNonEmptyString(result.url) ? result.url : '#',
            excerpt: this.promptFormatter.getExcerpt(
              isNonEmptyString(result.content) ? result.content : 'No content available',
              150,
            ),
          }));
        }
      }
    }

    // 4. Get conversation history if available
    let conversationHistory = '';
    try {
      if (this.currentConversationId) {
        conversationHistory = await this.conversationContext.formatHistoryForPrompt(this.currentConversationId);
        if (conversationHistory.length > 0) {
          logger.debug('Including conversation history in prompt');
        }
      } else {
        logger.debug('No active conversation, continuing without history');
      }
    } catch (error) {
      logger.warn('Failed to get conversation history:', error);
      // Continue without history if there's an error
    }

    // 5. Format the context and query for the model
    // For highly relevant profile queries, always include profile context
    const includeProfile = isProfileQuery || profileRelevance > relevanceConfig.profileInclusionThreshold;
    const { formattedPrompt, citations } = this.promptFormatter.formatPromptWithContext(
      query,
      relevantNotes,
      externalResults,
      includeProfile,
      profileRelevance,
      this.profile,
      conversationHistory,
    );

    // 6. Get related notes to suggest to the user
    const relatedNotesResult = await this.noteService.getRelatedNotes(relevantNotes);
    // Ensure relatedNotes is always an array
    const relatedNotes = Array.isArray(relatedNotesResult) ? relatedNotesResult : [];

    // 7. Generate system prompt based on query analysis
    const systemPrompt = this.systemPromptGenerator.getSystemPrompt(
      isProfileQuery,
      profileRelevance,
      externalResults.length > 0,
    );

    // 8. Query the LLM with the formatted prompt
    const modelResponse = await this.model.complete(systemPrompt, formattedPrompt);
    const responseText = isNonEmptyString(modelResponse.response)
      ? modelResponse.response
      : 'I apologize, but I could not generate a response. Please try asking again.';

    // 9. Save the conversation turn
    try {
      // The model response is pure text, so we save it directly to memory
      // No HTML formatting has been applied at this point
      
      // Ensure we have an active conversation
      if (!this.currentConversationId) {
        await this.initializeConversation();
        if (!this.currentConversationId) {
          throw new Error('Failed to initialize conversation');
        }
      }
      
      // Set up the user turn options
      const userTurnOptions = {
        userId: options?.userId || 'matrix-user',
        userName: options?.userName || 'User',
        metadata: {
          turnType: 'user',
          hasProfile: !!this.profile,
          isProfileQuery,
          profileRelevance,
        },
      };
      
      // Set up the assistant turn options
      const assistantTurnOptions = {
        userId: 'assistant', // CRITICAL: This ensures it's identified as an assistant turn
        userName: 'Assistant',
        metadata: {
          turnType: 'assistant',
          hasProfile: !!this.profile,
          isProfileQuery,
          profileRelevance,
          notesUsed: relevantNotes.length,
          externalSourcesUsed: externalResults.length,
        },
      };
      
      // Add user query turn
      await this.conversationContext.addTurn(
        this.currentConversationId,
        query,
        '', // No response for user turn
        userTurnOptions,
      );
      logger.debug(`Saved user turn with userId: ${options?.userId || 'matrix-user'}`);
      
      // Add assistant response turn
      await this.conversationContext.addTurn(
        this.currentConversationId,
        query, // We include the original query for context
        responseText,
        assistantTurnOptions,
      );
      logger.debug('Saved assistant turn with userId: assistant');
      
      // Check if we should summarize
      await this.conversationContext.forceSummarize(this.currentConversationId);
      
    } catch (error) {
      logger.warn('Failed to save conversation turn:', error);
      // Continue even if saving fails
    }

    // 10. Return the formatted protocol response
    // For medium-high relevance, include profile even if not a direct profile query
    const includeProfileInResponse = isProfileQuery || profileRelevance > relevanceConfig.profileResponseThreshold;
    const citationsArray = Array.isArray(citations) ? citations : [];

    return {
      answer: responseText,
      citations: citationsArray,
      relatedNotes,
      profile: (includeProfileInResponse && isDefined(this.profile)) ? this.profile : undefined,
      externalSources: externalCitations.length > 0 ? externalCitations : undefined,
    };
  }
}
