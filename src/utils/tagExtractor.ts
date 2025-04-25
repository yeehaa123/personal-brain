import { z } from 'zod';

import { aiConfig, textConfig } from '@/config';
import { ResourceRegistry } from '@/resources';
import { Logger } from '@/utils/logger';

/**
 * Dependencies interface for TagExtractor
 */
type TagExtractorDependencies = {
  logger?: Logger;
  resourceRegistry?: ResourceRegistry;
} & Record<string, unknown>;

/**
 * TagExtractor class - handles tag extraction from content
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates an instance with explicit dependencies
 */
export class TagExtractor {
  /**
   * Singleton instance of TagExtractor
   */
  private static instance: TagExtractor | null = null;
  
  /**
   * Logger instance
   */
  private logger = Logger.getInstance();
  
  /**
   * ResourceRegistry instance used for Claude model access
   * Lazy-loaded when needed in extractTags
   */
  private resourceRegistry?: ResourceRegistry;
  
  /**
   * Get the singleton instance
   * 
   * @returns Singleton instance of TagExtractor
   */
  public static getInstance(): TagExtractor {
    if (!TagExtractor.instance) {
      TagExtractor.instance = new TagExtractor();
    }
    return TagExtractor.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    TagExtractor.instance = null;
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @returns A new TagExtractor instance
   */
  public static createFresh(): TagExtractor {
    return new TagExtractor();
  }
  
  /**
   * Create an instance with explicit dependencies
   * 
   * @param _config Optional configuration options (unused but kept for pattern consistency)
   * @param dependencies Optional dependencies like logger and resourceRegistry
   * @returns A new TagExtractor instance with the specified dependencies
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    dependencies: TagExtractorDependencies = {},
  ): TagExtractor {
    const instance = new TagExtractor();
    
    // Apply dependencies if provided
    if (dependencies.logger) {
      instance.logger = dependencies.logger;
    }
    
    // Store resourceRegistry dependency for later use
    if (dependencies.resourceRegistry) {
      instance.resourceRegistry = dependencies.resourceRegistry;
    }
    
    return instance;
  }
  
  /**
   * Private constructor to enforce using factory methods
   */
  private constructor() {
    // Initialize with default dependencies
    this.logger = Logger.getInstance();
  }

  /**
   * Extract tags from content using Claude AI
   * @param content The text content to analyze
   * @param existingTags Optional array of existing tags to consider
   * @param maxTags Maximum number of tags to extract (default: 7)
   * @returns Array of extracted tags
   */
  public async extractTags(
    content: string,
    existingTags: string[] = [],
    maxTags: number = textConfig.defaultMaxTags,
    apiKey?: string,
  ): Promise<string[]> {
    try {
      // Use provided API key or fallback to config
      const anthropicApiKey = apiKey || aiConfig.anthropic.apiKey;
      
      // Check for API key
      if (!anthropicApiKey) {
        this.logger.error('No Anthropic API key available for tag extraction');
        return [];
      }

      // Truncate content if it's too long
      const truncatedContent = content.length > textConfig.tagContentMaxLength
        ? content.substring(0, textConfig.tagContentMaxLength) + '... [content truncated]'
        : content;

      // Build the prompt
      const prompt = `You are a precise tag extraction system. Your task is to extract the most relevant tags from the provided content.

The tags should capture the main concepts, topics, and themes in the content. The tags should be:
- Relevant to the domain and content
- Single words or short phrases (1-3 words)
- Lowercase, with hyphens for multi-word tags (e.g., "ecosystem-architecture")
- Domain-specific rather than generic
- Nouns or noun phrases preferred

Content to extract tags from:
${truncatedContent}

${existingTags.length > 0 ? 'Existing tags to consider: ' + existingTags.join(', ') : ''}

Extract up to ${maxTags} tags that best represent this content.

FORMAT: Respond with ONLY a comma-separated list of tags, with no additional text or explanation.`;

      // Get the Claude model instance from the ResourceRegistry
      // Use the injected ResourceRegistry if available, otherwise get the singleton instance
      const registry = this.resourceRegistry || ResourceRegistry.getInstance({
        anthropicApiKey: anthropicApiKey,
      });
      const claude = registry.getClaudeModel();

      // Define the schema for the response
      const tagSchema = z.object({
        tags: z.array(z.string()).max(maxTags),
      });

      // Call Claude with schema, type is inferred from the schema using z.infer
      const response = await claude.complete<z.infer<typeof tagSchema>>({
        schema: tagSchema,
        systemPrompt: 'You extract tags from content. Only respond with the tags, nothing else.',
        userPrompt: prompt,
        temperature: aiConfig.anthropic.temperature,
      });

      // Return the tags array directly
      return response.object.tags;
    } catch (error) {
      this.logger.error(`Error extracting tags with Claude: ${error}`);
      return [];
    }
  }

}