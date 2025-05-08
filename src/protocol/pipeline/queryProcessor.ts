/**
 * Query Processor for BrainProtocol
 * Manages the query processing pipeline
 */
import type { z } from 'zod';

import { relevanceConfig } from '@/config';
import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { Note } from '@/models/note';
import { PromptFormatter } from '@/protocol/components/promptFormatter';
import { SystemPromptGenerator } from '@/protocol/components/systemPromptGenerator';
import { ResourceRegistry } from '@/resources';
import type { ModelResponse } from '@/resources/ai/interfaces';
import { Logger } from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';

import type {
  ContextResult,
  ExternalCitation,
  IContextManager,
  IConversationManager,
  IQueryProcessor,
  ProfileAnalysisResult,
  QueryOptions,
  QueryResult,
  TurnOptions,
} from '../types';

/**
 * Configuration options for QueryProcessor
 */
export interface QueryProcessorConfig {
  /** Context manager for accessing contexts */
  contextManager: IContextManager;
  /** Conversation manager for history */
  conversationManager: IConversationManager;
  /** API key for model access */
  apiKey?: string;
}

/**
 * Processes queries through a structured pipeline
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class QueryProcessor implements IQueryProcessor {
  /** The singleton instance */
  private static instance: QueryProcessor | null = null;

  /** Logger instance for this class */
  private logger = Logger.getInstance();

  private contextManager: IContextManager;
  private conversationManager: IConversationManager;
  private promptFormatter: PromptFormatter;
  private systemPromptGenerator: SystemPromptGenerator;
  private resourceRegistry: ResourceRegistry;

  /**
   * Get the singleton instance of QueryProcessor
   * 
   * @param config Configuration options
   * @returns The singleton instance
   */
  public static getInstance(config: QueryProcessorConfig): QueryProcessor {
    if (!QueryProcessor.instance) {
      QueryProcessor.instance = new QueryProcessor(
        config.contextManager,
        config.conversationManager,
        config.apiKey,
      );

      const logger = Logger.getInstance();
      logger.debug('QueryProcessor singleton instance created');
    }

    return QueryProcessor.instance;
  }

  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state
   */
  public static resetInstance(): void {
    QueryProcessor.instance = null;

    const logger = Logger.getInstance();
    logger.debug('QueryProcessor singleton instance reset');
  }

  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param config Configuration options
   * @returns A new QueryProcessor instance
   */
  public static createFresh(config: QueryProcessorConfig): QueryProcessor {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh QueryProcessor instance');

    return new QueryProcessor(
      config.contextManager,
      config.conversationManager,
      config.apiKey,
    );
  }

  /**
   * Create a new instance with explicit dependencies
   * 
   * @param config Configuration as a generic record
   * @param dependencies External dependencies
   * @returns A new QueryProcessor instance with the provided dependencies
   */
  public static createWithDependencies(
    config: Record<string, unknown> = {},
    dependencies: Record<string, unknown> = {},
  ): QueryProcessor {
    const logger = Logger.getInstance();
    logger.debug('Creating QueryProcessor with explicit dependencies');

    // Extract required dependencies
    const contextManager = dependencies['contextManager'] as IContextManager;
    const conversationManager = dependencies['conversationManager'] as IConversationManager;

    // Verify required dependencies are present
    if (!contextManager) {
      throw new Error('QueryProcessor requires a contextManager dependency');
    }

    if (!conversationManager) {
      throw new Error('QueryProcessor requires a conversationManager dependency');
    }

    // Extract config values
    const apiKey = config['apiKey'] as string | undefined;

    // Create with explicit dependencies
    return new QueryProcessor(
      contextManager,
      conversationManager,
      apiKey,
    );
  }

  /**
   * Private constructor to enforce factory method usage
   * 
   * @param contextManager Context manager
   * @param conversationManager Conversation manager
   * @param apiKey API key for model
   */
  private constructor(
    contextManager: IContextManager,
    conversationManager: IConversationManager,
    _apiKey?: string,
  ) {
    this.contextManager = contextManager;
    this.conversationManager = conversationManager;

    // Initialize helpers using their getInstance methods
    this.promptFormatter = PromptFormatter.getInstance();
    this.systemPromptGenerator = SystemPromptGenerator.getInstance();
    this.resourceRegistry = ResourceRegistry.getInstance();

    this.logger.debug('Query processor initialized');
  }

  /**
   * Process a query through the full pipeline
   * @param query User query
   * @param options Query options with optional schema for structured responses
   * @returns Query result with optional structured object
   */
  async processQuery<T = unknown>(query: string, options?: QueryOptions<T>): Promise<QueryResult<T>> {
    // Validate input
    if (!isNonEmptyString(query)) {
      this.logger.warn('Empty query received, using default question');
      query = 'What information do you have in this brain?';
    }

    this.logger.debug(`Processing query: "${query}"`);

    // If roomId is provided, ensure we're using the right conversation
    if (options?.roomId) {
      await this.conversationManager.setCurrentRoom(options.roomId);
    }

    // Ensure we have an active conversation
    if (!this.conversationManager.hasActiveConversation()) {
      await this.conversationManager.initializeConversation();
    }

    // 1. Analyze profile relevance
    const profileAnalysis = await this.analyzeProfile(query);

    // 2. Retrieve relevant context
    const context = await this.retrieveRelevantNotes(query);

    // 3. Get conversation history
    const history = await this.getConversationHistory();

    // 4. Fetch external sources if enabled
    const externalResults = await this.fetchExternalSources(query, context.relevantNotes);

    // Convert external results to citations format if available
    const externalCitations = this.formatExternalCitations(externalResults);

    // 5. Generate prompt
    const { systemPrompt, userPrompt } = await this.formatPrompt(
      query,
      context,
      history,
      profileAnalysis,
      externalResults,
    );

    // 6. Call the model with optional schema for structured responses
    const modelResponse = await this.callModel<T>(
      systemPrompt,
      userPrompt,
      options?.schema, // Pass the schema if provided
    );

    // Extract the answer from the response
    const answer = modelResponse.object && typeof modelResponse.object === 'object' && 'answer' in modelResponse.object
      ? String(modelResponse.object.answer)
      : 'I apologize, but I wasn\'t able to generate a proper response.';

    // 7. Save the conversation turn
    await this.saveTurn(query, answer, options);

    // 8. Get related notes for the response
    const noteContext = this.contextManager.getNoteContext();
    // If we have relevant notes, get related notes for the first one
    const relatedNotes = context.relevantNotes.length > 0
      ? await noteContext.getRelatedNotes(context.relevantNotes[0].id)
      : [];

    // 9. Determine if profile should be included in response
    const includeProfileInResponse =
      profileAnalysis.isProfileQuery ||
      profileAnalysis.relevance > relevanceConfig.profileResponseThreshold;

    // 10. Get profile if needed
    const profileContext = this.contextManager.getProfileContext();
    const profile = includeProfileInResponse ? await profileContext.getProfile() : undefined;

    // 11. Return the result with the optional structured object
    return {
      answer,
      citations: context.citations,
      relatedNotes,
      profile,
      externalSources: externalCitations.length > 0 ? externalCitations : undefined,
      object: modelResponse.object, // Include the structured object in the result
    };
  }

  /**
   * Analyze profile relevance for a query
   * @param query User query
   * @returns Profile analysis result
   */
  private async analyzeProfile(query: string): Promise<ProfileAnalysisResult> {
    // Use ProfileAnalyzer directly through the ResourceRegistry for now
    // This is a temporary solution until we move profile analysis to ProfileContext
    // We don't actually need to get the profile here, just detect if it's a profile query

    // Basic profile query detection pattern
    const isProfileQuery = /profile|about\s+me|who\s+am\s+i|my\s+background/i.test(query);
    const relevance = isProfileQuery ? 0.9 : 0.1;

    return { isProfileQuery, relevance };
  }

  /**
   * Retrieve relevant notes for a query
   * @param query User query
   * @returns Context result with relevant notes and citations
   */
  private async retrieveRelevantNotes(query: string): Promise<ContextResult> {
    const noteContext = this.contextManager.getNoteContext();
    const relevantNotes = await noteContext.searchNotes({ query, limit: 5 });
    const notesFound = Array.isArray(relevantNotes) ? relevantNotes.length : 0;

    this.logger.info(`Found ${notesFound} relevant notes`);

    // Safely log the top note if available
    if (notesFound > 0 && isDefined(relevantNotes[0])) {
      const topNoteTitle = relevantNotes[0].title || 'Untitled Note';
      this.logger.debug(`Top note: "${topNoteTitle}"`);
    }

    // Extract citations from notes
    const citations = relevantNotes.map(note => ({
      noteId: note.id,
      noteTitle: note.title || 'Untitled Note',
      excerpt: this.promptFormatter.getExcerpt(note.content, 150),
    }));

    return { relevantNotes, citations };
  }

  /**
   * Get conversation history
   * @returns Formatted conversation history
   */
  private async getConversationHistory(): Promise<string> {
    return await this.conversationManager.getConversationHistory();
  }

  /**
   * Fetch external sources for a query
   * @param query User query
   * @param relevantNotes Relevant notes for the query
   * @returns External results or null
   */
  private async fetchExternalSources(query: string, _relevantNotes: Note[]): Promise<ExternalSourceResult[] | null> {
    const externalSourceContext = this.contextManager.getExternalSourceContext();
    const enabled = this.contextManager.getExternalSourcesEnabled();

    if (!enabled) {
      return null;
    }

    return await externalSourceContext.search(query);
  }

  /**
   * Format external results as citations
   * @param externalResults External results
   * @returns External citations
   */
  private formatExternalCitations(externalResults: ExternalSourceResult[] | null): ExternalCitation[] {
    if (!externalResults || !Array.isArray(externalResults) || externalResults.length === 0) {
      return [];
    }

    return externalResults.map(result => ({
      title: isNonEmptyString(result.title) ? result.title : 'Untitled Source',
      source: isNonEmptyString(result.source) ? result.source : 'Unknown Source',
      url: isNonEmptyString(result.url) ? result.url : '#',
      excerpt: this.promptFormatter.getExcerpt(
        isNonEmptyString(result.content) ? result.content : 'No content available',
        150,
      ),
    }));
  }

  /**
   * Format the prompt for the model
   * @param query User query
   * @param context Context result
   * @param history Conversation history
   * @param profileAnalysis Profile analysis result
   * @param externalResults External results
   * @returns Formatted system and user prompts
   */
  private async formatPrompt(
    query: string,
    context: ContextResult,
    history: string,
    profileAnalysis: ProfileAnalysisResult,
    externalResults: ExternalSourceResult[] | null,
  ): Promise<{ systemPrompt: string, userPrompt: string }> {
    // For highly relevant profile queries, always include profile information
    const includeProfile =
      profileAnalysis.isProfileQuery ||
      profileAnalysis.relevance > relevanceConfig.profileInclusionThreshold;

    // Get profile if needed
    const profileContext = this.contextManager.getProfileContext();
    const profile = includeProfile ? await profileContext.getProfile() : undefined;

    // Format the user prompt
    const { formattedPrompt } = this.promptFormatter.formatPromptWithContext(
      query,
      context.relevantNotes,
      externalResults || [],
      includeProfile,
      profileAnalysis.relevance,
      profile,
      history,
    );

    // Generate system prompt based on query analysis
    const systemPrompt = this.systemPromptGenerator.getSystemPrompt(
      profileAnalysis.isProfileQuery,
      profileAnalysis.relevance,
      externalResults !== null && Array.isArray(externalResults) && externalResults.length > 0,
    );

    return { systemPrompt, userPrompt: formattedPrompt };
  }

  /**
   * Call the AI model
   * @param systemPrompt System prompt
   * @param userPrompt User prompt
   * @param schema Optional schema for structured responses
   * @returns Model response
   */
  private async callModel<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    schema?: z.ZodType<T>,
  ): Promise<ModelResponse<T>> {
    const claude = this.resourceRegistry.getClaudeModel();
    return await claude.complete({
      systemPrompt,
      userPrompt,
      schema,
    });
  }

  /**
   * Save a conversation turn
   * @param query User query
   * @param response Model response
   * @param options Query options
   */
  private async saveTurn(query: string, response: string, options?: QueryOptions): Promise<void> {
    try {
      // First, add the user's query with the provided userId
      const userTurnOptions: TurnOptions = {
        userId: options?.userId || 'matrix-user',
        userName: options?.userName || 'User',
        metadata: {
          turnType: 'user',
        },
      };

      await this.conversationManager.saveTurn(query, '', userTurnOptions);
      this.logger.debug(`Saved user turn with userId: ${userTurnOptions.userId}`);

      // Then, add the assistant's response with 'assistant' as userId
      const assistantTurnOptions: TurnOptions = {
        userId: 'assistant',
        userName: 'Assistant',
        metadata: {
          turnType: 'assistant',
        },
      };

      await this.conversationManager.saveTurn(query, response, assistantTurnOptions);
      this.logger.debug('Saved assistant turn with userId: assistant');
    } catch (error) {
      this.logger.warn('Failed to save conversation turn:', error);
      // Continue even if saving fails
    }
  }
}
