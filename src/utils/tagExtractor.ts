import { z } from 'zod';

import { aiConfig, textConfig } from '@/config';
import { ResourceRegistry } from '@/resources';
import { Logger } from '@/utils/logger';

/**
 * Dependencies interface for TagExtractor
 */
export interface TagExtractorDependencies {
  logger: Logger;
  resourceRegistry: ResourceRegistry;
}

/**
 * TagExtractor class - handles tag extraction from content
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class TagExtractor {
  /**
   * Singleton instance of TagExtractor
   */
  private static instance: TagExtractor | null = null;

  /**
   * Logger instance
   */
  private logger: Logger;

  /**
   * ResourceRegistry instance used for Claude model access
   */
  private resourceRegistry: ResourceRegistry;

  /**
   * Get the singleton instance
   * 
   * @returns Singleton instance of TagExtractor
   */
  public static getInstance(): TagExtractor {
    if (!TagExtractor.instance) {
      const logger = Logger.getInstance();
      TagExtractor.instance = new TagExtractor({
        logger,
        resourceRegistry: ResourceRegistry.getInstance(),
      });

      logger.debug('TagExtractor singleton instance created');
    }
    return TagExtractor.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (TagExtractor.instance) {
        // No specific cleanup needed for this service
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during TagExtractor instance reset:', error);
    } finally {
      TagExtractor.instance = null;
      Logger.getInstance().debug('TagExtractor singleton instance reset');
    }
  }

  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param _config Optional configuration (unused but kept for pattern consistency)
   * @param dependencies Optional dependencies object
   * @returns A new TagExtractor instance
   */
  public static createFresh(
    _config?: Record<string, unknown>,
    dependencies?: TagExtractorDependencies,
  ): TagExtractor {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh TagExtractor instance');

    if (dependencies) {
      // Use provided dependencies
      return new TagExtractor(dependencies);
    } else {
      // Use default dependencies
      return new TagExtractor({
        logger,
        resourceRegistry: ResourceRegistry.getInstance(),
      });
    }
  }

  /**
   * Private constructor to enforce using factory methods
   * @param dependencies Required dependencies
   */
  private constructor(dependencies: TagExtractorDependencies) {
    // Initialize from dependencies
    this.logger = dependencies.logger;
    this.resourceRegistry = dependencies.resourceRegistry;

    this.logger.debug('TagExtractor instance created');
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
      const registry = this.resourceRegistry;
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
