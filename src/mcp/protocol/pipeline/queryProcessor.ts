/**
 * Query Processor for BrainProtocol
 * Manages the query processing pipeline
 */
import { relevanceConfig } from '@/config';
import type { ExternalSourceResult } from '@/mcp/contexts/externalSources/sources';
import { ClaudeModel } from '@/mcp/model';
import { NoteService } from '@/mcp/protocol/components/noteService';
import { PromptFormatter } from '@/mcp/protocol/components/promptFormatter';
import { SystemPromptGenerator } from '@/mcp/protocol/components/systemPromptGenerator';
import type { Note } from '@/models/note';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';

import type { 
  ContextResult,
  ExternalCitation,
  IContextManager, 
  IConversationManager, 
  IExternalSourceManager, 
  IProfileManager,
  IQueryProcessor,
  ModelResponse,
  ProfileAnalysisResult,
  QueryOptions,
  QueryResult,
  TurnOptions,
} from '../types';

/**
 * Processes queries through a structured pipeline
 */
export class QueryProcessor implements IQueryProcessor {
  private conversationManager: IConversationManager;
  private profileManager: IProfileManager;
  private externalSourceManager: IExternalSourceManager;
  
  private noteService: NoteService;
  private promptFormatter: PromptFormatter;
  private systemPromptGenerator: SystemPromptGenerator;
  private model: ClaudeModel;

  /**
   * Create a new query processor
   * @param contextManager Context manager
   * @param conversationManager Conversation manager
   * @param profileManager Profile manager
   * @param externalSourceManager External source manager
   * @param apiKey API key for model
   */
  constructor(
    contextManager: IContextManager,
    conversationManager: IConversationManager,
    profileManager: IProfileManager,
    externalSourceManager: IExternalSourceManager,
    apiKey?: string,
  ) {
    this.conversationManager = conversationManager;
    this.profileManager = profileManager;
    this.externalSourceManager = externalSourceManager;
    
    // Initialize helpers
    this.noteService = new NoteService(contextManager.getNoteContext());
    this.promptFormatter = new PromptFormatter();
    this.systemPromptGenerator = new SystemPromptGenerator();
    this.model = new ClaudeModel(apiKey);
    
    logger.debug('Query processor initialized');
  }

  /**
   * Process a query through the full pipeline
   * @param query User query
   * @param options Query options
   * @returns Query result
   */
  async processQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    // Validate input
    if (!isNonEmptyString(query)) {
      logger.warn('Empty query received, using default question');
      query = 'What information do you have in this brain?';
    }

    logger.info(`Processing query: "${query}"`);

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
    const context = await this.retrieveContext(query);
    
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
    
    // 6. Call the model
    const modelResponse = await this.callModel(systemPrompt, userPrompt);
    
    // 7. Save the conversation turn
    await this.saveTurn(query, modelResponse.response, options);
    
    // 8. Get related notes for the response
    const relatedNotes = await this.noteService.getRelatedNotes(context.relevantNotes);
    
    // 9. Determine if profile should be included in response
    const includeProfileInResponse = 
      profileAnalysis.isProfileQuery || 
      profileAnalysis.relevance > relevanceConfig.profileResponseThreshold;
    
    // 10. Get profile if needed
    const profile = includeProfileInResponse ? await this.profileManager.getProfile() : undefined;
    
    // 11. Return the result
    return {
      answer: modelResponse.response,
      citations: context.citations,
      relatedNotes,
      profile,
      externalSources: externalCitations.length > 0 ? externalCitations : undefined,
    };
  }

  /**
   * Analyze profile relevance for a query
   * @param query User query
   * @returns Profile analysis result
   */
  private async analyzeProfile(query: string): Promise<ProfileAnalysisResult> {
    return await this.profileManager.analyzeProfileRelevance(query);
  }

  /**
   * Retrieve relevant context for a query
   * @param query User query
   * @returns Context result with relevant notes and citations
   */
  private async retrieveContext(query: string): Promise<ContextResult> {
    const relevantNotes = await this.noteService.fetchRelevantContext(query);
    const notesFound = Array.isArray(relevantNotes) ? relevantNotes.length : 0;
    
    logger.info(`Found ${notesFound} relevant notes`);
    
    // Safely log the top note if available
    if (notesFound > 0 && isDefined(relevantNotes[0])) {
      const topNoteTitle = relevantNotes[0].title || 'Untitled Note';
      logger.debug(`Top note: "${topNoteTitle}"`);
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
  private async fetchExternalSources(query: string, relevantNotes: Note[]): Promise<ExternalSourceResult[] | null> {
    return await this.externalSourceManager.getExternalResults(query, relevantNotes);
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
    const profile = includeProfile ? await this.profileManager.getProfile() : undefined;
    
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
   * @returns Model response
   */
  private async callModel(systemPrompt: string, userPrompt: string): Promise<ModelResponse> {
    return await this.model.complete(systemPrompt, userPrompt);
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
      logger.debug(`Saved user turn with userId: ${userTurnOptions.userId}`);
      
      // Then, add the assistant's response with 'assistant' as userId
      const assistantTurnOptions: TurnOptions = {
        userId: 'assistant',
        userName: 'Assistant',
        metadata: {
          turnType: 'assistant',
        },
      };
      
      await this.conversationManager.saveTurn(query, response, assistantTurnOptions);
      logger.debug('Saved assistant turn with userId: assistant');
    } catch (error) {
      logger.warn('Failed to save conversation turn:', error);
      // Continue even if saving fails
    }
  }
}