/**
 * BrainProtocol orchestrates the interaction between models and context
 */
import { ClaudeModel } from '../model/claude';
import { NoteContext } from '../context/noteContext';
import { ProfileContext } from '../context/profileContext';
import { ExternalSourceContext } from '../context/externalSourceContext';
import type { ExternalSourceResult } from '../context/sources/externalSourceInterface';
import type { Note } from '../../models/note';
import type { Profile, ProfileEducation, ProfileExperience, ProfileProject } from '../../models/profile';
import { getExcerpt } from '../../utils/noteUtils';
import { EmbeddingService } from '../model/embeddings';
import logger from '../../utils/logger';

export interface ProtocolResponse {
  answer: string;
  citations: Citation[];
  relatedNotes: Note[];
  profile?: Profile;
  externalSources?: ExternalCitation[];
}

export interface Citation {
  noteId: string;
  noteTitle: string;
  excerpt: string;
}

export interface ExternalCitation {
  title: string;
  source: string;
  url: string;
  excerpt: string;
}

export class BrainProtocol {
  private model: ClaudeModel;
  private context: NoteContext;
  private profileContext: ProfileContext;
  private externalContext: ExternalSourceContext;
  private embeddingService: EmbeddingService;
  private profile: Profile | undefined;
  private useExternalSources: boolean = false;

  constructor(apiKey?: string, newsApiKey?: string, useExternalSources: boolean = false) {
    this.model = new ClaudeModel(apiKey);
    this.context = new NoteContext(apiKey);
    this.profileContext = new ProfileContext(apiKey);
    this.externalContext = new ExternalSourceContext(apiKey, newsApiKey);
    this.embeddingService = new EmbeddingService(apiKey ? { apiKey } : undefined);
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

    // Check if this is a profile-related query through keywords or semantics
    let isProfileQuery = this.isProfileQuery(query);
    let profileRelevance = 0;

    // Get the profile relevance score for contextual prompting
    if (this.profile?.embedding) {
      profileRelevance = await this.getProfileRelevance(query);
      logger.debug(`Profile semantic relevance: ${profileRelevance.toFixed(2)}`);

      // If relevance is high enough, consider it a profile query
      if (profileRelevance > 0.6 && !isProfileQuery) {
        logger.info('Query is semantically relevant to profile');
        isProfileQuery = true;
      }
    }

    // 1. Retrieve relevant context from the database
    const relevantNotes = await this.fetchRelevantContext(query);
    logger.info(`Found ${relevantNotes.length} relevant notes`);

    if (relevantNotes.length > 0) {
      logger.debug(`Top note: "${relevantNotes[0].title}"`);
    }

    // 2. Fetch relevant external knowledge if enabled
    let externalResults: ExternalSourceResult[] = [];
    let externalCitations: ExternalCitation[] = [];

    if (this.useExternalSources) {
      // Determine if we should query external sources
      const shouldQueryExternal = this.shouldQueryExternalSources(query, relevantNotes);

      if (shouldQueryExternal) {
        logger.info('Querying external sources for additional context');
        externalResults = await this.fetchExternalContext(query);

        if (externalResults.length > 0) {
          logger.info(`Found ${externalResults.length} relevant external sources`);
          // Convert to citations format
          externalCitations = externalResults.map(result => ({
            title: result.title,
            source: result.source,
            url: result.url,
            excerpt: this.getExcerpt(result.content, 150),
          }));
        }
      }
    }

    // 3. Format the context and query for the model
    // For highly relevant profile queries, always include profile context
    const includeProfile = isProfileQuery || profileRelevance > 0.4;
    const { formattedPrompt, citations } = this.formatPromptWithContext(
      query,
      relevantNotes,
      externalResults,
      includeProfile,
      profileRelevance,
    );

    // 4. Get related notes to suggest to the user
    const relatedNotes = await this.getRelatedNotes(relevantNotes);

    // 5. Query the model with the formatted prompt - use profile relevance for better contextual prompting
    const systemPrompt = this.getSystemPrompt(isProfileQuery, profileRelevance, externalResults.length > 0);
    const modelResponse = await this.model.complete(systemPrompt, formattedPrompt);

    // 6. Return the formatted protocol response
    // For medium-high relevance, include profile even if not a direct profile query
    const includeProfileInResponse = isProfileQuery || profileRelevance > 0.5;

    return {
      answer: modelResponse.response,
      citations,
      relatedNotes,
      profile: includeProfileInResponse ? this.profile : undefined,
      externalSources: externalCitations.length > 0 ? externalCitations : undefined,
    };
  }

  /**
   * Determine if the query is profile-related
   */
  private isProfileQuery(query: string): boolean {
    const profileKeywords = [
      'profile', 'about me', 'who am i', 'my background', 'my experience',
      'my education', 'my skills', 'my work', 'my job', 'my history',
      'my information', 'tell me about myself', 'my professional', 'resume',
      'cv', 'curriculum vitae', 'career', 'expertise', 'professional identity',
    ];

    const lowercaseQuery = query.toLowerCase();

    // First, check if the query contains explicit profile-related keywords
    if (profileKeywords.some(keyword => lowercaseQuery.includes(keyword))) {
      return true;
    }

    // If no explicit keywords, try to use semantic relevance if available
    if (this.profile?.embedding) {
      // We'll check the semantic relevance score asynchronously in processQuery
      return false; // Initial value, will be updated with semantic relevance
    }

    return false;
  }

  /**
   * Get profile similarity score to the query using semantic search
   */
  private async getProfileRelevance(query: string): Promise<number> {
    try {
      if (!this.profile || !this.profile.embedding) {
        return this.isProfileQuery(query) ? 0.9 : 0.2;
      }

      // Get embedding for the query
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // Calculate similarity score between query and profile
      const similarity = this.embeddingService.cosineSimilarity(
        queryEmbedding.embedding,
        this.profile.embedding as number[],
      );

      // Scale the similarity to be more decisive
      // (values closer to 0 or 1 rather than middle range)
      return Math.pow(similarity * 0.5 + 0.5, 2);
    } catch (error) {
      logger.error('Error calculating profile relevance:', error);
      // Fall back to keyword matching
      return this.isProfileQuery(query) ? 0.9 : 0.2;
    }
  }

  /**
   * Fetch relevant context based on user query
   */
  private async fetchRelevantContext(query: string): Promise<Note[]> {
    // First, try to extract any explicit tags from the query
    const tagRegex = /#(\w+)/g;
    const tagMatches = [...query.matchAll(tagRegex)];
    const tags = tagMatches.map(match => match[1]);

    // Remove the tags from the query for better text matching
    let cleanQuery = query.replace(tagRegex, '').trim();

    // Check for specific topic mentions like "MCP", "Model-Context-Protocol"
    const topicRegex = /\b(MCP|Model[-\s]Context[-\s]Protocol|AI architecture)\b/i;
    const hasMcpTopic = topicRegex.test(query);

    if (hasMcpTopic && !tags.includes('MCP')) {
      tags.push('MCP');
    }

    logger.debug(`Query: "${cleanQuery}", Tags: [${tags.join(', ')}]`);

    // Use semantic search by default for better results
    let results = await this.context.searchNotes({
      query: cleanQuery,
      tags: tags.length > 0 ? tags : undefined,
      limit: 5,
      semanticSearch: true,
    });

    // If no results and we have tags, try with just tags
    if (results.length === 0 && tags.length > 0) {
      logger.debug('No results with query and tags, trying tags only');
      results = await this.context.searchNotes({
        tags,
        limit: 5,
        semanticSearch: false, // Tags only doesn't benefit from semantic search
      });
    }

    // If still no results, fall back to keyword search
    if (results.length === 0) {
      logger.debug('No results with semantic search, trying keyword search');
      results = await this.context.searchNotes({
        query: cleanQuery,
        tags: tags.length > 0 ? tags : undefined,
        limit: 5,
        semanticSearch: false,
      });
    }

    // If no matches, return all notes as a fallback (limited to 3)
    if (results.length === 0) {
      logger.debug('No specific matches, fetching recent notes as fallback');
      results = await this.context.getRecentNotes(3);
    }

    return results;
  }

  /**
   * Determine if we should query external sources
   */
  private shouldQueryExternalSources(query: string, relevantNotes: Note[]): boolean {
    // Skip external sources for profile queries
    if (this.isProfileQuery(query)) {
      return false;
    }

    // Always use external sources if no relevant notes found
    if (relevantNotes.length === 0) {
      return true;
    }

    // Look for explicit requests for external information
    const externalKeywords = [
      'search', 'external', 'online', 'web', 'internet', 'look up',
      'wikipedia', 'reference', 'latest', 'recent', 'current',
      'what is', 'who is', 'where is', 'when did', 'how to',
    ];

    const lowercaseQuery = query.toLowerCase();
    if (externalKeywords.some(keyword => lowercaseQuery.includes(keyword))) {
      return true;
    }

    // Calculate coverage of the query by internal notes
    // This is a heuristic and could be improved with semantic relevance
    let highestCoverage = 0;
    for (const note of relevantNotes) {
      const coverage = this.calculateCoverage(query, note);
      highestCoverage = Math.max(highestCoverage, coverage);
    }

    // If internal notes have low coverage, use external sources
    return highestCoverage < 0.6;
  }

  /**
   * Calculate how well a note covers a query (simple heuristic)
   */
  private calculateCoverage(query: string, note: Note): number {
    const queryWords = new Set(
      query.toLowerCase()
        .replace(/[.,?!;:()[\]{}'"]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3),
    );

    const noteContent = note.content.toLowerCase();
    let matchedWords = 0;

    queryWords.forEach(word => {
      if (noteContent.includes(word)) {
        matchedWords++;
      }
    });

    return queryWords.size > 0 ? matchedWords / queryWords.size : 0;
  }

  /**
   * Fetch relevant context from external sources
   */
  private async fetchExternalContext(query: string): Promise<ExternalSourceResult[]> {
    try {
      // Use semantic search for better results when comparing with internal notes
      const results = await this.externalContext.semanticSearch(query, 3);
      return results;
    } catch (error) {
      logger.error('Error fetching external context:', error);
      return [];
    }
  }

  /**
   * Format the prompt with retrieved context
   */
  private formatPromptWithContext(
    query: string,
    notes: Note[],
    externalSources: ExternalSourceResult[] = [],
    includeProfile: boolean = false,
    profileRelevance: number = 1.0,
  ): { formattedPrompt: string, citations: Citation[] } {
    const citations: Citation[] = [];
    let contextText = '';

    // Add profile information if requested, with relevance level determining detail
    if (includeProfile && this.profile) {
      contextText += this.formatProfileContext(profileRelevance);
    }

    // Format each note as a context block with citation
    notes.forEach((note, index) => {
      // Create a citation reference
      const citation: Citation = {
        noteId: note.id,
        noteTitle: note.title,
        excerpt: this.getExcerpt(note.content, 150),
      };
      citations.push(citation);

      // Add the context block with tags if available
      const tagInfo = note.tags && note.tags.length > 0
        ? `Tags: ${note.tags.join(', ')}\n`
        : '';

      contextText += `\n\nINTERNAL CONTEXT [${index + 1}]:\nTitle: ${note.title}\n${tagInfo}${note.content}\n`;
    });

    // Add external information if available
    if (externalSources.length > 0) {
      contextText += '\n\n--- EXTERNAL INFORMATION ---\n';
      externalSources.forEach((source, index) => {
        contextText += `\nEXTERNAL SOURCE [${index + 1}]:\nTitle: ${source.title}\nSource: ${source.source}\n${source.content}\n`;
      });
    }

    // Build an enhanced prompt that guides response formatting based on context type
    let promptPrefix = '';

    if (includeProfile && notes.length > 0 && externalSources.length > 0) {
      // We have profile, notes, and external sources
      promptPrefix = 'I have the following information from my personal knowledge base, my profile, and external sources:';
    } else if (includeProfile && notes.length > 0) {
      // We have profile and notes
      promptPrefix = 'I have the following information in my personal knowledge base, including my profile and relevant notes:';
    } else if (includeProfile && externalSources.length > 0) {
      // We have profile and external sources
      promptPrefix = 'I have the following information from my profile and external sources:';
    } else if (notes.length > 0 && externalSources.length > 0) {
      // We have notes and external sources
      promptPrefix = 'I have the following information from my personal knowledge base and external sources:';
    } else if (includeProfile) {
      // We have only profile
      promptPrefix = 'I have the following information about my profile in my personal knowledge base:';
    } else if (notes.length > 0) {
      // We have only notes
      promptPrefix = 'I have the following information in my personal knowledge base:';
    } else if (externalSources.length > 0) {
      // We have only external sources
      promptPrefix = 'I have the following information from external sources:';
    } else {
      // Fallback if no context (shouldn't happen)
      promptPrefix = 'I have limited information in my personal knowledge base:';
    }

    // Format the final prompt with context and query
    const formattedPrompt = `${promptPrefix}
${contextText}

Based on this information, please answer my question:
${query}`;

    return { formattedPrompt, citations };
  }

  /**
   * Format profile information as context
   * Adapts the detail level based on relevance
   */
  private formatProfileContext(queryRelevance: number = 1.0): string {
    if (!this.profile) {
      return '';
    }

    const profile = this.profile;
    let profileContext = '\n\nPROFILE INFORMATION:\n';

    // Basic information (always included)
    profileContext += `Name: ${profile.fullName}\n`;
    if (profile.headline) profileContext += `Headline: ${profile.headline}\n`;
    if (profile.occupation) profileContext += `Occupation: ${profile.occupation}\n`;

    // Location (always included)
    if (profile.city || profile.country) {
      profileContext += `Location: ${[profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ')}\n`;
    }

    // Summary (always included)
    if (profile.summary) {
      profileContext += `\nSummary:\n${profile.summary}\n`;
    }

    // Current Experience (always included)
    if (profile.experiences?.length) {
      const currentExperiences = (profile.experiences as ProfileExperience[]).filter(exp => !exp.ends_at);
      if (currentExperiences.length > 0) {
        profileContext += '\nCurrent Work:\n';
        currentExperiences.forEach(exp => {
          profileContext += `- ${exp.title} at ${exp.company}`;
          if (exp.description) profileContext += `: ${exp.description.split('\n')[0]}\n`;
          else profileContext += '\n';
        });
      }
    }

    // For higher relevance queries, include more detail
    if (queryRelevance > 0.5) {
      // Past Experience
      if (profile.experiences?.length) {
        const pastExperiences = (profile.experiences as ProfileExperience[]).filter(exp => exp.ends_at).slice(0, 5);
        if (pastExperiences.length > 0) {
          profileContext += '\nPast Experience:\n';
          pastExperiences.forEach(exp => {
            profileContext += `- ${exp.title} at ${exp.company}`;
            if (exp.starts_at && exp.ends_at) {
              profileContext += ` (${exp.starts_at} - ${exp.ends_at})`;
            }
            if (exp.description) {
              const shortDesc = exp.description.length > 100
                ? exp.description.substring(0, 100) + '...'
                : exp.description;
              profileContext += `: ${shortDesc}\n`;
            } else {
              profileContext += '\n';
            }
          });
        }
      }

      // Education
      if (profile.education?.length) {
        profileContext += '\nEducation:\n';
        (profile.education as ProfileEducation[]).forEach(edu => {
          profileContext += `- ${edu.degree_name} at ${edu.school}`;
          if (edu.starts_at && edu.ends_at) {
            profileContext += ` (${edu.starts_at} - ${edu.ends_at})`;
          }
          profileContext += '\n';
        });
      }

      // Projects
      if (profile.accomplishmentProjects?.length) {
        profileContext += '\nProjects:\n';
        (profile.accomplishmentProjects as ProfileProject[]).slice(0, 3).forEach(proj => {
          profileContext += `- ${proj.title}`;
          if (proj.description) {
            const shortDesc = proj.description.length > 100
              ? proj.description.substring(0, 100) + '...'
              : proj.description;
            profileContext += `: ${shortDesc}\n`;
          } else {
            profileContext += '\n';
          }
        });
      }
    }

    // Skills (Languages) - always included but more detailed for higher relevance
    if (profile.languages && profile.languages.length > 0) {
      profileContext += '\nSkills & Languages:\n';
      profileContext += profile.languages.join(', ') + '\n';
    }

    // Add machine-readable section to help the model understand the profile structure
    profileContext += '\nProfile Structure:\n';
    profileContext += `- Full Name: ${profile.fullName}\n`;
    profileContext += `- Primary Occupation: ${profile.occupation || 'Not specified'}\n`;
    profileContext += `- Primary Expertise: ${profile.headline ? profile.headline.split('|')[0].trim() : 'Not specified'}\n`;
    profileContext += `- Current Location: ${profile.city || 'Not specified'}\n`;
    profileContext += `- Number of Past Roles: ${profile.experiences ? profile.experiences.length : 0}\n`;
    profileContext += `- Number of Projects: ${profile.accomplishmentProjects ? profile.accomplishmentProjects.length : 0}\n`;
    profileContext += `- Number of Skills: ${profile.languages ? profile.languages.length : 0}\n`;

    return profileContext;
  }

  /**
   * Get related notes for suggestions
   */
  private async getRelatedNotes(relevantNotes: Note[]): Promise<Note[]> {
    if (relevantNotes.length === 0) {
      return this.context.getRecentNotes(3);
    }

    // Use the most relevant note to find related content
    const primaryNoteId = relevantNotes[0].id;
    return this.context.getRelatedNotes(primaryNoteId, 3);
  }

  /**
   * Get a short excerpt from the content
   */
  private getExcerpt(content: string, maxLength = 150): string {
    return getExcerpt(content, maxLength);
  }

  /**
   * Get the system prompt for the model
   */
  private getSystemPrompt(isProfileQuery: boolean = false, profileRelevance: number = 0, hasExternalSources: boolean = false): string {
    // For when we have both profile and external info
    if (isProfileQuery && hasExternalSources) {
      return `You are a helpful assistant integrated with a personal knowledge base, detailed profile information, and external knowledge sources.
Your task is to provide accurate, helpful responses based on the user's profile, personal notes, and external information.

Guidelines:
1. For profile-related questions, prioritize the profile information section in the context
2. Use the provided context to answer questions, balancing personal and external information
3. Address the user directly in the first person (e.g., "You are Jan Hein Hoogstad...")
4. Format your response in markdown for readability
5. Keep responses clear and concise
6. Do not make up information that's not in the provided context
7. Cite external sources when used in your response
8. Be conversational but professional when discussing personal information
9. Indicate when information comes from an external source versus personal notes
10. When the user asks for advice or opportunities, connect their expertise with concepts from their notes and relevant external information`;
    }

    // For when we have external sources but no profile relevance
    if (hasExternalSources && !isProfileQuery && profileRelevance < 0.5) {
      return `You are a helpful assistant integrated with a personal knowledge base and external knowledge sources.
Your task is to provide accurate, helpful responses based on the user's notes and external information.

Guidelines:
1. Use both personal notes and external sources to provide comprehensive answers
2. Prioritize personal notes over external information when they contain relevant information
3. Format your response in markdown for readability
4. Keep responses clear and concise
5. Do not make up information that's not in the provided context
6. Cite external sources when used in your response
7. Indicate when information comes from an external source versus personal notes
8. When appropriate, mention related topics from the notes that the user might want to explore further
9. If internal and external information conflict, acknowledge the difference and prioritize internal knowledge
10. Use external information to provide additional context, examples, or supporting evidence`;
    }

    // For direct profile queries
    if (isProfileQuery) {
      return `You are a helpful assistant integrated with a personal knowledge base and detailed profile information.
Your task is to provide accurate, helpful responses based on the user's profile information and relevant personal notes.

Guidelines:
1. For profile-related questions, prioritize the profile information section in the context
2. Use only the provided context to answer questions
3. Address the user directly in the first person (e.g., "You are Jan Hein Hoogstad...")
4. Format your response in markdown for readability
5. Keep responses clear and concise
6. Do not make up information that's not in the provided context
7. Reference specific parts of the profile when relevant (e.g., work experiences, skills)
8. Be conversational but professional when discussing personal information
9. When the user asks for advice or opportunities related to their background, connect their expertise with concepts from their notes`;
    }

    // For queries with high profile relevance but not direct profile questions
    if (profileRelevance > 0.7) {
      return `You are a helpful assistant integrated with a personal knowledge base and profile information.
Your task is to provide accurate, insightful responses that connect the user's notes with their background and expertise.

Guidelines:
1. Use the provided context to answer questions, with special attention to the user's professional background
2. Connect ideas from the notes with the user's expertise and experience when relevant
3. Reference the user's skills, experiences, or background when they provide useful context
4. Format your response in markdown for readability
5. Keep responses clear and concise
6. Do not make up information that's not in the provided context
7. When discussing topics related to the user's expertise, acknowledge their background
8. Feel free to suggest applications or connections to the user's work or projects`;
    }

    // For queries with medium profile relevance, possibly with external sources
    if (profileRelevance > 0.4) {
      const externalSourcesGuideline = hasExternalSources
        ? '\n8. When using external information, clearly indicate the source\n9. Integrate external knowledge with personal insights when appropriate'
        : '';

      return `You are a helpful assistant integrated with a personal knowledge base and profile information.
Your task is to provide accurate, helpful responses based primarily on the user's notes, with background context from their profile.

Guidelines:
1. Use primarily the notes in the provided context to answer questions
2. When relevant, incorporate background knowledge about the user's expertise
3. Format your response in markdown for readability
4. Keep responses clear and concise
5. Do not make up information that's not in the provided context
6. When appropriate, mention how the topic might relate to the user's background or interests
7. Feel free to highlight connections between the notes and the user's professional domain${externalSourcesGuideline}`;
    }

    // Default system prompt for low or no profile relevance, potentially with external sources
    const externalSourcesPrompt = hasExternalSources
      ? `You are a helpful assistant integrated with a personal knowledge base and external knowledge sources.
Your task is to provide accurate, helpful responses based on the user's notes and external information.

Guidelines:
1. Use the provided context to answer questions, balancing personal notes and external information
2. Prioritize personal notes when they contain relevant information
3. Format your response in markdown for readability
4. Keep responses clear and concise
5. Do not make up information that's not in the provided context
6. Cite external sources when used in your response
7. Indicate when information comes from an external source versus personal notes
8. If information from different sources conflicts, acknowledge this and explain the differences
9. When appropriate, suggest related topics from the notes that might be of interest`
      : `You are a helpful assistant integrated with a personal knowledge base.
Your task is to provide accurate, helpful responses based on the user's notes.

Guidelines:
1. Use only the provided context to answer questions
2. If the context doesn't contain enough information, acknowledge this limitation
3. Format your response in markdown for readability
4. Keep responses clear and concise
5. Do not make up information that's not in the provided context
6. When appropriate, mention related topics from the notes that the user might want to explore further`;

    return externalSourcesPrompt;
  }
}
