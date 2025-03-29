import { z } from 'zod';
import { extractKeywords } from './textUtils';
import Anthropic from '@anthropic-ai/sdk';

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

    console.log('API Key available:', !!apiKey);

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

    // Use Anthropic's SDK directly
    try {
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });
      
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        temperature: 0.0,
        system: "You extract tags from content. Only respond with the tags, nothing else.",
        messages: [
          { role: "user", content: prompt }
        ]
      });
      
      // Parse comma-separated tags from the response
      // Extract the text content from the message
      let rawTags = '';
      if (message.content && Array.isArray(message.content) && message.content.length > 0) {
        const content = message.content[0];
        if (typeof content === 'string') {
          rawTags = content.trim();
        } else if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
          rawTags = content.text.trim();
        }
      }
      const tags = rawTags
        .split(/,\s*/)
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);
      
      // Return the tags (limit to maxTags if needed)
      return tags.slice(0, maxTags);
    } catch (aiError) {
      console.error('Error with Anthropic SDK:', aiError);
      return extractKeywords(content, maxTags);
    }
  } catch (error) {
    console.error('Error extracting tags with Claude:', error);
    // Fallback to simple keyword extraction
    return extractKeywords(content, maxTags);
  }
}

// We're now using extractKeywords from textUtils instead