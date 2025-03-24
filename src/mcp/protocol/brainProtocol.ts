import { ClaudeModel } from '../model/claude';
import type { ModelResponse } from '../model/claude';
import { NoteContext } from '../context/noteContext';
import { ProfileContext } from '../context/profileContext';
import type { SearchOptions } from '../context/noteContext';
import type { Note } from '../../models/note';
import type { Profile } from '../../models/profile';
import { getExcerpt } from '../../utils/noteUtils';
import { EmbeddingService } from '../model/embeddings';

export interface ProtocolResponse {
  answer: string;
  citations: Citation[];
  relatedNotes: Note[];
  profile?: Profile;
}

export interface Citation {
  noteId: string;
  noteTitle: string;
  excerpt: string;
}

export class BrainProtocol {
  private model: ClaudeModel;
  private context: NoteContext;
  private profileContext: ProfileContext;
  private embeddingService: EmbeddingService;
  private profile: Profile | undefined;

  constructor(apiKey?: string) {
    this.model = new ClaudeModel(apiKey);
    this.context = new NoteContext(apiKey);
    this.profileContext = new ProfileContext(apiKey);
    this.embeddingService = new EmbeddingService(apiKey);
    // Load profile asynchronously
    this.loadProfile();
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
   * Load the user profile
   */
  private async loadProfile(): Promise<void> {
    try {
      this.profile = await this.profileContext.getProfile();
      console.log(this.profile ? 'Profile loaded successfully' : 'No profile found');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  /**
   * Process a user query through the full MCP pipeline
   */
  async processQuery(query: string): Promise<ProtocolResponse> {
    console.log(`Processing query: "${query}"`);

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
      console.log(`Profile semantic relevance: ${profileRelevance.toFixed(2)}`);
      
      // If relevance is high enough, consider it a profile query
      if (profileRelevance > 0.6 && !isProfileQuery) {
        console.log('Query is semantically relevant to profile');
        isProfileQuery = true;
      }
    }
    
    // 1. Retrieve relevant context from the database
    const relevantNotes = await this.fetchRelevantContext(query);
    console.log(`Found ${relevantNotes.length} relevant notes`);

    if (relevantNotes.length > 0) {
      console.log(`Top note: "${relevantNotes[0].title}"`);
    }

    // 2. Format the context and query for the model
    // For highly relevant profile queries, always include profile context
    const includeProfile = isProfileQuery || profileRelevance > 0.4;
    const { formattedPrompt, citations } = this.formatPromptWithContext(
      query, 
      relevantNotes, 
      includeProfile,
      profileRelevance
    );

    // 3. Get related notes to suggest to the user
    const relatedNotes = await this.getRelatedNotes(relevantNotes);

    // 4. Query the model with the formatted prompt - use profile relevance for better contextual prompting
    const systemPrompt = this.getSystemPrompt(isProfileQuery, profileRelevance);
    const modelResponse = await this.model.complete(systemPrompt, formattedPrompt);

    // 5. Return the formatted protocol response
    // For medium-high relevance, include profile even if not a direct profile query
    const includeProfileInResponse = isProfileQuery || profileRelevance > 0.5;
    
    return {
      answer: modelResponse.response,
      citations,
      relatedNotes,
      profile: includeProfileInResponse ? this.profile : undefined
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
      'cv', 'curriculum vitae', 'career', 'expertise', 'professional identity'
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
        this.profile.embedding
      );
      
      // Scale the similarity to be more decisive
      // (values closer to 0 or 1 rather than middle range)
      return Math.pow(similarity * 0.5 + 0.5, 2);
    } catch (error) {
      console.error('Error calculating profile relevance:', error);
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

    console.log(`Query: "${cleanQuery}", Tags: [${tags.join(', ')}]`);

    // Use semantic search by default for better results
    let results = await this.context.searchNotes({
      query: cleanQuery,
      tags: tags.length > 0 ? tags : undefined,
      limit: 5,
      semanticSearch: true
    });

    // If no results and we have tags, try with just tags
    if (results.length === 0 && tags.length > 0) {
      console.log('No results with query and tags, trying tags only');
      results = await this.context.searchNotes({
        tags,
        limit: 5,
        semanticSearch: false // Tags only doesn't benefit from semantic search
      });
    }

    // If still no results, fall back to keyword search
    if (results.length === 0) {
      console.log('No results with semantic search, trying keyword search');
      results = await this.context.searchNotes({
        query: cleanQuery,
        tags: tags.length > 0 ? tags : undefined,
        limit: 5,
        semanticSearch: false
      });
    }

    // If no matches, return all notes as a fallback (limited to 3)
    if (results.length === 0) {
      console.log('No specific matches, fetching recent notes as fallback');
      results = await this.context.getRecentNotes(3);
    }

    return results;
  }

  /**
   * Format the prompt with retrieved context
   */
  private formatPromptWithContext(
    query: string, 
    notes: Note[], 
    includeProfile: boolean = false,
    profileRelevance: number = 1.0
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
        excerpt: this.getExcerpt(note.content, 150)
      };
      citations.push(citation);

      // Add the context block with tags if available
      const tagInfo = note.tags && note.tags.length > 0
        ? `Tags: ${note.tags.join(', ')}\n`
        : '';

      contextText += `\n\nCONTEXT [${index + 1}]:\nTitle: ${note.title}\n${tagInfo}${note.content}\n`;
    });

    // Build an enhanced prompt that guides response formatting based on context type
    let promptPrefix = '';
    
    if (includeProfile && notes.length > 0) {
      // We have both profile and notes
      promptPrefix = "I have the following information in my personal knowledge base, including my profile and relevant notes:";
    } else if (includeProfile) {
      // We have only profile
      promptPrefix = "I have the following information about my profile in my personal knowledge base:";
    } else if (notes.length > 0) {
      // We have only notes
      promptPrefix = "I have the following information in my personal knowledge base:";
    } else {
      // Fallback if no context (shouldn't happen)
      promptPrefix = "I have limited information in my personal knowledge base:";
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
    if (profile.experiences && profile.experiences.length > 0) {
      const currentExperiences = profile.experiences.filter(exp => !exp.endDate);
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
      if (profile.experiences && profile.experiences.length > 0) {
        const pastExperiences = profile.experiences.filter(exp => exp.endDate).slice(0, 5);
        if (pastExperiences.length > 0) {
          profileContext += '\nPast Experience:\n';
          pastExperiences.forEach(exp => {
            profileContext += `- ${exp.title} at ${exp.company}`;
            if (exp.startDate && exp.endDate) {
              profileContext += ` (${exp.startDate} - ${exp.endDate})`;
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
      if (profile.education && profile.education.length > 0) {
        profileContext += '\nEducation:\n';
        profile.education.forEach(edu => {
          profileContext += `- ${edu.degree} at ${edu.school}`;
          if (edu.startDate && edu.endDate) {
            profileContext += ` (${edu.startDate} - ${edu.endDate})`;
          }
          profileContext += '\n';
        });
      }
      
      // Projects
      if (profile.accomplishmentProjects && profile.accomplishmentProjects.length > 0) {
        profileContext += '\nProjects:\n';
        profile.accomplishmentProjects.slice(0, 3).forEach(proj => {
          profileContext += `- ${proj.name}`;
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
  private getSystemPrompt(isProfileQuery: boolean = false, profileRelevance: number = 0): string {
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
    
    // For queries with medium profile relevance
    if (profileRelevance > 0.4) {
      return `You are a helpful assistant integrated with a personal knowledge base and profile information.
Your task is to provide accurate, helpful responses based primarily on the user's notes, with background context from their profile.

Guidelines:
1. Use primarily the notes in the provided context to answer questions
2. When relevant, incorporate background knowledge about the user's expertise
3. Format your response in markdown for readability
4. Keep responses clear and concise
5. Do not make up information that's not in the provided context
6. When appropriate, mention how the topic might relate to the user's background or interests
7. Feel free to highlight connections between the notes and the user's professional domain`;
    }
    
    // Default system prompt for low or no profile relevance
    return `You are a helpful assistant integrated with a personal knowledge base.
Your task is to provide accurate, helpful responses based on the user's notes.

Guidelines:
1. Use only the provided context to answer questions
2. If the context doesn't contain enough information, acknowledge this limitation
3. Format your response in markdown for readability
4. Keep responses clear and concise
5. Do not make up information that's not in the provided context
6. When appropriate, mention related topics from the notes that the user might want to explore further`;
  }
}
