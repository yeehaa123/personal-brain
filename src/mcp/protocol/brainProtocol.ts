import { ClaudeModel } from '../model/claude';
import type { ModelResponse } from '../model/claude';
import { NoteContext } from '../context/noteContext';
import type { SearchOptions } from '../context/noteContext';
import type { Note } from '../../models/note';
import { getExcerpt } from '../../utils/noteUtils';

export interface ProtocolResponse {
  answer: string;
  citations: Citation[];
  relatedNotes: Note[];
}

export interface Citation {
  noteId: string;
  noteTitle: string;
  excerpt: string;
}

export class BrainProtocol {
  private model: ClaudeModel;
  private context: NoteContext;
  
  constructor(apiKey?: string) {
    this.model = new ClaudeModel(apiKey);
    this.context = new NoteContext(apiKey);
  }
  
  /**
   * Process a user query through the full MCP pipeline
   */
  async processQuery(query: string): Promise<ProtocolResponse> {
    console.log(`Processing query: "${query}"`);
    
    // 1. Retrieve relevant context from the database
    const relevantNotes = await this.fetchRelevantContext(query);
    console.log(`Found ${relevantNotes.length} relevant notes`);
    
    if (relevantNotes.length > 0) {
      console.log(`Top note: "${relevantNotes[0].title}"`);
    }
    
    // 2. Format the context and query for the model
    const { formattedPrompt, citations } = this.formatPromptWithContext(query, relevantNotes);
    
    // 3. Get related notes to suggest to the user
    const relatedNotes = await this.getRelatedNotes(relevantNotes);
    
    // 4. Query the model with the formatted prompt
    const systemPrompt = this.getSystemPrompt();
    const modelResponse = await this.model.complete(systemPrompt, formattedPrompt);
    
    // 5. Return the formatted protocol response
    return {
      answer: modelResponse.response,
      citations,
      relatedNotes
    };
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
  private formatPromptWithContext(query: string, notes: Note[]): { formattedPrompt: string, citations: Citation[] } {
    const citations: Citation[] = [];
    let contextText = '';
    
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
    
    // Format the final prompt with context and query
    const formattedPrompt = `I have the following information in my personal knowledge base:
${contextText}

Based on this information, please answer my question:
${query}`;
    
    return { formattedPrompt, citations };
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
  private getSystemPrompt(): string {
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