import { extractKeywords } from './textUtils';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';


/**
 * Extract tags from content using Claude AI
 * @param content The text content to analyze
 * @param existingTags Optional array of existing tags to consider
 * @param maxTags Maximum number of tags to extract (default: 7)
 * @returns Array of extracted tags
 */
export async function extractTags(
  content: string,
  existingTags: string[] = [],
  maxTags: number = 7
): Promise<string[]> {
  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No Anthropic API key available, falling back to keyword extraction');
      return extractKeywords(content, maxTags);
    }

    // Truncate content if it's too long
    const truncatedContent = content.length > 10000
      ? content.substring(0, 10000) + '... [content truncated]'
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

    const { object } = await generateObject({
      model: anthropic('claude-3-7-sonnet-20250219'),
      prompt,
      temperature: 0.0,
      system: "You extract tags from content. Only respond with the tags, nothing else.",
      schema: z.object({
        tags: z.array(z.string()).max(maxTags)
      })
    });
    return object.tags;
  } catch (error) {
    console.error('Error extracting tags with Claude:', error);
    // Fallback to simple keyword extraction
    return extractKeywords(content, maxTags);
  }
}
