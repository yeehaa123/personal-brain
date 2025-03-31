/**
 * BrainProtocol orchestrates the interaction between models and context
 */
import { ClaudeModel } from '@mcp/model/claude';
import { NoteContext } from '@mcp/context/noteContext';
import { ProfileContext } from '@mcp/context/profileContext';
import { ExternalSourceContext } from '@mcp/context/externalSourceContext';
import type { ExternalSourceResult } from '@mcp/context/sources/externalSourceInterface';
import type { Profile } from '@models/profile';
import { EmbeddingService } from '@mcp/model/embeddings';
import logger from '@utils/logger';
import { relevanceConfig, aiConfig } from '@/config';

// Import component classes
import { PromptFormatter } from './components/promptFormatter';
import { SystemPromptGenerator } from './components/systemPromptGenerator';
import { ProfileAnalyzer } from './components/profileAnalyzer';
import { ExternalSourceService } from './components/externalSourceService';
import { NoteService } from './components/noteService';

// Import types
import type { ProtocolResponse, ExternalCitation } from './types';

export class BrainProtocol {
  // Core services
  private model: ClaudeModel;
  private context: NoteContext;
  private profileContext: ProfileContext;
  private externalContext: ExternalSourceContext;
  private embeddingService: EmbeddingService;
  
  // Component classes
  private promptFormatter: PromptFormatter;
  private systemPromptGenerator: SystemPromptGenerator;
  private profileAnalyzer: ProfileAnalyzer;
  private externalSourceService: ExternalSourceService;
  private noteService: NoteService;
  
  // State
  private profile: Profile | undefined;
  private useExternalSources: boolean = false;

  constructor(apiKey?: string, newsApiKey?: string, useExternalSources: boolean = false) {
    // Initialize core services
    this.model = new ClaudeModel(apiKey);
    this.context = new NoteContext(apiKey);
    this.profileContext = new ProfileContext(apiKey);
    this.externalContext = new ExternalSourceContext(apiKey, newsApiKey);
    this.embeddingService = new EmbeddingService(apiKey ? { apiKey } : undefined);
    
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
    
    // Set initial state
    this.useExternalSources = useExternalSources;

    // Load profile asynchronously
    this.loadProfile();

    logger.info(`Brain protocol initialized with external sources ${useExternalSources ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get the note context to allow external access to note operations
   */
  getNoteContext(): NoteContext {
    return this.context;
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
   * Load the user profile
   */
  private async loadProfile(): Promise<void> {
    try {
      this.profile = await this.profileContext.getProfile();
      logger.info(this.profile ? 'Profile loaded successfully' : 'No profile found');
    } catch (error) {
      logger.error('Error loading profile:', error);
    }
  }

  /**
   * Process a user query through the full MCP pipeline
   */
  async processQuery(query: string): Promise<ProtocolResponse> {
    logger.info(`Processing query: "${query}"`);

    // Ensure profile is loaded
    if (!this.profile) {
      await this.loadProfile();
    }

    // 1. Analyze profile relevance
    let isProfileQuery = this.profileAnalyzer.isProfileQuery(query);
    let profileRelevance = 0;

    // Get the profile relevance score for contextual prompting
    if (this.profile?.embedding) {
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
    logger.info(`Found ${relevantNotes.length} relevant notes`);

    if (relevantNotes.length > 0) {
      logger.debug(`Top note: "${relevantNotes[0].title}"`);
    }

    // 3. Fetch relevant external knowledge if enabled
    let externalResults: ExternalSourceResult[] = [];
    let externalCitations: ExternalCitation[] = [];

    if (this.useExternalSources) {
      // Determine if we should query external sources
      const shouldQueryExternal = this.externalSourceService.shouldQueryExternalSources(query, relevantNotes);

      if (shouldQueryExternal) {
        logger.info('Querying external sources for additional context');
        externalResults = await this.externalSourceService.fetchExternalContext(query);

        if (externalResults.length > 0) {
          logger.info(`Found ${externalResults.length} relevant external sources`);
          // Convert to citations format
          externalCitations = externalResults.map(result => ({
            title: result.title,
            source: result.source,
            url: result.url,
            excerpt: this.promptFormatter.getExcerpt(result.content, 150),
          }));
        }
      }
    }

    // 4. Format the context and query for the model
    // For highly relevant profile queries, always include profile context
    const includeProfile = isProfileQuery || profileRelevance > relevanceConfig.profileInclusionThreshold;
    const { formattedPrompt, citations } = this.promptFormatter.formatPromptWithContext(
      query,
      relevantNotes,
      externalResults,
      includeProfile,
      profileRelevance,
      this.profile,
    );

    // 5. Get related notes to suggest to the user
    const relatedNotes = await this.noteService.getRelatedNotes(relevantNotes);

    // 6. Generate system prompt based on query analysis
    const systemPrompt = this.systemPromptGenerator.getSystemPrompt(
      isProfileQuery, 
      profileRelevance, 
      externalResults.length > 0,
    );
    
    // 7. Query the LLM with the formatted prompt
    const modelResponse = await this.model.complete(systemPrompt, formattedPrompt);

    // 8. Return the formatted protocol response
    // For medium-high relevance, include profile even if not a direct profile query
    const includeProfileInResponse = isProfileQuery || profileRelevance > relevanceConfig.profileResponseThreshold;

    return {
      answer: modelResponse.response,
      citations,
      relatedNotes,
      profile: includeProfileInResponse ? this.profile : undefined,
      externalSources: externalCitations.length > 0 ? externalCitations : undefined,
    };
  }

  // All component methods have been extracted to separate service classes

}
