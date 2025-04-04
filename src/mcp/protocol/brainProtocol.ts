/**
 * BrainProtocol orchestrates the interaction between models and context
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';


import { aiConfig, relevanceConfig } from '@/config';
import {
  createUnifiedMcpServer,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
} from '@/mcp'; // Import all MCP implementations
import type { ExternalSourceResult } from '@/mcp/contexts/externalSources/sources';
import { ClaudeModel, EmbeddingService } from '@/mcp/model';
import { ConversationMemory } from '@/mcp/protocol/memory';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { Profile } from '@models/profile';
import logger from '@utils/logger';
import { isDefined, isNonEmptyString } from '@utils/safeAccessUtils';

import { ExternalSourceService } from './components/externalSourceService';
import { NoteService } from './components/noteService';
import { ProfileAnalyzer } from './components/profileAnalyzer';
import { PromptFormatter } from './components/promptFormatter';
import { SystemPromptGenerator } from './components/systemPromptGenerator';
import type { ExternalCitation, ProtocolResponse } from './types';

/**
 * Interface for BrainProtocol constructor options
 */
export interface BrainProtocolOptions {
  apiKey?: string;
  newsApiKey?: string;
  useExternalSources?: boolean;
  interfaceType?: 'cli' | 'matrix';
  roomId?: string;
}

export class BrainProtocol {
  // Core services
  private model: ClaudeModel;
  private context: NoteContext;
  private profileContext: ProfileContext;
  private externalContext: ExternalSourceContext;
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

  // Conversation Memory
  private conversationMemory: ConversationMemory;

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
    this.profileContext = ProfileContext.getInstance(apiKey);
    this.externalContext = ExternalSourceContext.getInstance(apiKey, newsApiKeyValue);

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

    // Initialize conversation memory with the specified interface type
    this.conversationMemory = new ConversationMemory({
      interfaceType: this.interfaceType,
      storage: new InMemoryStorage(),
      apiKey, // Pass the API key for summarization
    });

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
   * Get the conversation memory instance to manage conversation history
   */
  getConversationMemory(): ConversationMemory {
    return this.conversationMemory;
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
      if (this.interfaceType === 'matrix' && this.currentRoomId) {
        // For Matrix, get or create a conversation for the current room
        await this.conversationMemory.getOrCreateConversationForRoom(this.currentRoomId);
        logger.info(`Started Matrix conversation for room ${this.currentRoomId}`);
      } else {
        // For CLI, start a new conversation if there's no current one
        if (!this.conversationMemory.currentConversation) {
          await this.conversationMemory.startConversation();
          logger.info('Started default CLI conversation for memory');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize conversation:', error);
    }
  }

  /**
   * Set the current Matrix room ID (for Matrix interface only)
   * @param roomId The Matrix room ID
   */
  async setCurrentRoom(roomId: string): Promise<void> {
    if (this.interfaceType !== 'matrix') {
      throw new Error('Cannot set room ID for non-Matrix interface');
    }

    this.currentRoomId = roomId;
    await this.conversationMemory.getOrCreateConversationForRoom(roomId);
    logger.debug(`Switched to Matrix room ${roomId}`);
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

    // If Matrix roomId is provided, ensure we're using the right conversation
    if (options?.roomId && this.interfaceType === 'matrix') {
      await this.setCurrentRoom(options.roomId);
    }

    // Ensure profile is loaded
    if (!isDefined(this.profile)) {
      await this.loadProfile();
    }

    // Ensure we have an active conversation
    if (!this.conversationMemory.currentConversation) {
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
      conversationHistory = await this.conversationMemory.formatHistoryForPrompt();
      if (conversationHistory.length > 0) {
        logger.debug('Including conversation history in prompt');
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
      await this.conversationMemory.addTurn(
        query,
        responseText,
        {
          userId: options?.userId,
          userName: options?.userName,
          metadata: {
            hasProfile: !!this.profile,
            isProfileQuery,
            profileRelevance,
            notesUsed: relevantNotes.length,
            externalSourcesUsed: externalResults.length,
          },
        },
      );
      logger.debug('Saved conversation turn to memory');
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
