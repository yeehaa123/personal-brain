/**
 * Handles formatting prompts with context for the MCP
 */

import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { Note } from '@models/note';
import type { Profile, ProfileEducation, ProfileExperience, ProfileProject } from '@models/profile';
import { Logger } from '@utils/logger';
import { getExcerpt as noteExcerpt } from '@utils/noteUtils';

import type { Citation } from '../types';

/**
 * Formats prompts and context for LLM interactions
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class PromptFormatter {
  /** The singleton instance */
  private static instance: PromptFormatter | null = null;

  /** Logger instance for this class */
  private logger = Logger.getInstance();

  /**
   * Get the singleton instance of PromptFormatter
   * 
   * @returns The singleton instance
   */
  public static getInstance(): PromptFormatter {
    if (!PromptFormatter.instance) {
      PromptFormatter.instance = new PromptFormatter();
      
      const logger = Logger.getInstance();
      logger.debug('PromptFormatter singleton instance created');
    }
    
    return PromptFormatter.instance;
  }

  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state
   */
  public static resetInstance(): void {
    PromptFormatter.instance = null;
    
    const logger = Logger.getInstance();
    logger.debug('PromptFormatter singleton instance reset');
  }

  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @returns A new PromptFormatter instance
   */
  public static createFresh(): PromptFormatter {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh PromptFormatter instance');
    
    return new PromptFormatter();
  }
  
  /**
   * Create a new instance with explicit dependencies
   * 
   * @param config Configuration options (currently unused)
   * @param dependencies External dependencies (currently unused)
   * @returns A new PromptFormatter instance
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    _dependencies: Record<string, unknown> = {},
  ): PromptFormatter {
    const logger = Logger.getInstance();
    logger.debug('Creating PromptFormatter with explicit dependencies');
    
    // Currently this class doesn't have any configurable options or dependencies,
    // but this method is implemented for consistency with the Component Interface 
    // Standardization pattern and future extensibility
    return new PromptFormatter();
  }

  /**
   * Private constructor to enforce factory method usage
   */
  private constructor() {
    this.logger.debug('PromptFormatter initialized');
  }
  /**
   * Format the prompt with retrieved context
   * @param query User query
   * @param notes Relevant notes
   * @param externalSources External source results
   * @param includeProfile Whether to include profile information
   * @param profileRelevance Profile relevance score
   * @param profile User profile (optional)
   * @param conversationHistory Optional conversation history text
   * @returns Formatted prompt and citations
   */
  formatPromptWithContext(
    query: string,
    notes: Note[],
    externalSources: ExternalSourceResult[] = [],
    includeProfile: boolean = false,
    profileRelevance: number = 1.0,
    profile?: Profile,
    conversationHistory?: string,
  ): { formattedPrompt: string, citations: Citation[] } {
    const citations: Citation[] = [];
    let contextText = '';
    
    // Add conversation history if provided
    if (conversationHistory && conversationHistory.trim().length > 0) {
      contextText += '\n\nRecent Conversation History:\n';
      contextText += conversationHistory;
    }

    // Add profile information if requested, with relevance level determining detail
    if (includeProfile && profile) {
      contextText += this.formatProfileContext(profile, profileRelevance);
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
  formatProfileContext(profile: Profile, queryRelevance: number = 1.0): string {
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
   * Get a short excerpt from the content
   */
  getExcerpt(content: string, maxLength = 150): string {
    return noteExcerpt(content, maxLength);
  }

  /**
   * Calculate how well a note covers a query (simple heuristic)
   * @param query The user query
   * @param note The note to check against
   * @returns A coverage score between 0 and 1
   */
  calculateCoverage(query: string, note: Note): number {
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
}