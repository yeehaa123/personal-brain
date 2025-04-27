/**
 * Mock Claude Language Model Adapter
 */
import type { z } from 'zod';

import type { ModelResponse } from '@/resources/ai/interfaces';

export interface ClaudeModelOptions {
  model?: string;
}

/**
 * Options for completion requests
 */
export interface CompleteOptions<T = unknown> {
  schema?: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Mock ClaudeModel for testing
 */
export class ClaudeModel {
  private static instance: ClaudeModel | null = null;
  
  /**
   * Standard mock response for testing
   */
  public mockResponse: ModelResponse<{ answer: string }> = {
    object: { answer: 'This is a mock Claude response' },
    usage: { inputTokens: 10, outputTokens: 20 },
  };
  
  /**
   * Get the singleton instance of ClaudeModel
   */
  public static getInstance(_options?: ClaudeModelOptions): ClaudeModel {
    if (!ClaudeModel.instance) {
      ClaudeModel.instance = new ClaudeModel();
    }
    return ClaudeModel.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    ClaudeModel.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(_options?: ClaudeModelOptions): ClaudeModel {
    return new ClaudeModel();
  }

  /**
   * Mock complete method that returns test-specific responses
   * Supports schema-based structured responses
   */
  async complete<T = unknown>(options: CompleteOptions<T>): Promise<ModelResponse<T>> {
    // Generate conditional responses based on userPrompt content
    const prompt = options.userPrompt.toLowerCase();
    const schema = options.schema;
    
    // If a schema is provided, return structured data based on the prompt
    if (schema) {
      // For testing structured data with schemas
      if (prompt.includes('landing page')) {
        // Create a structured response for landing page data
        return {
          object: {
            title: 'Professional Services',
            description: 'Expert services for your needs',
            name: 'Test Professional',
            tagline: 'Quality expertise you can trust',
            hero: {
              headline: 'Transform Your Business',
              subheading: 'Professional services tailored to your needs',
              ctaText: 'Get Started',
              ctaLink: '#contact',
            },
            services: {
              title: 'Services',
              items: [
                { title: 'Consulting', description: 'Expert advice for your projects' },
                { title: 'Development', description: 'Professional implementation services' },
              ],
            },
            sectionOrder: ['hero', 'services', 'about', 'cta', 'footer'],
          } as unknown as T,
          usage: { inputTokens: 200, outputTokens: 150 },
        };
      } else if (prompt.includes('user data')) {
        // Create a structured response for user data
        return {
          object: {
            name: 'John Doe',
            email: 'john@example.com',
            preferences: { theme: 'dark', notifications: true },
          } as unknown as T,
          usage: { inputTokens: 100, outputTokens: 50 },
        };
      }
    }
    
    // For tag extraction (no schema needed)
    if (prompt.includes('extract up to') && prompt.includes('tags that best represent')) {
      // This is a tag extraction request
      let tags: string[] = ['general', 'concept', 'idea', 'topic', 'subject'];
      
      if (prompt.includes('education should focus')) {
        tags = ['education', 'learning', 'knowledge-sharing', 'curriculum', 'pedagogy'];
      } else if (prompt.includes('technology is rapidly evolving')) {
        tags = ['technology', 'digital', 'software', 'ai', 'innovation'];
      } else if (prompt.includes('ecosystem architecture is a practice')) {
        tags = ['ecosystem-architecture', 'innovation', 'collaboration', 'decentralized', 'community'];
      }
      
      return {
        object: { tags } as unknown as T,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    }
    
    // For ecosystem architecture queries
    if (prompt.includes('ecosystem')) {
      return {
        object: { answer: 'Ecosystem architecture involves designing interconnected components that work together.' } as unknown as T,
        usage: { inputTokens: 100, outputTokens: 20 },
      };
    }
    
    // For profile-related queries
    if (prompt.includes('profile')) {
      return {
        object: { answer: 'Your profile shows expertise in software development and architecture.' } as unknown as T,
        usage: { inputTokens: 150, outputTokens: 25 },
      };
    }
    
    // For summarization
    if (prompt.includes('please summarize the following conversation')) {
      return {
        object: { answer: 'This is a summary of the conversation.' } as unknown as T,
        usage: { inputTokens: 50, outputTokens: 10 },
      };
    }
    
    // Default response
    return {
      object: { answer: 'This is a mock Claude response' } as unknown as T,
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }
}