/**
 * Text processing utilities
 */
import sanitizeHtmlLib from 'sanitize-html';
import { textConfig } from '@/config';

/**
 * Clean and normalize text for embedding
 * @param text Text to prepare
 * @returns Cleaned text
 */
export function prepareText(text: string): string {
  return text
    .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
    .replace(/\n+/g, ' ')      // Replace newlines with spaces
    .trim();                   // Trim whitespace from beginning and end
}

/**
 * Chunk a long text into smaller pieces
 * @param text The text to chunk
 * @param chunkSize The approximate size of each chunk
 * @param overlap The number of characters to overlap between chunks
 * @returns An array of text chunks
 */
export function chunkText(
  text: string, 
  chunkSize = textConfig.defaultChunkSize, 
  overlap = textConfig.defaultChunkOverlap,
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the chunk size and we already have some content
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      // Start a new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(Math.max(0, words.length - overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Extract keywords from text
 * @param text Text to analyze
 * @param maxKeywords Maximum number of keywords to return
 * @returns Array of extracted keywords
 */
export function extractKeywords(text: string, maxKeywords = textConfig.defaultMaxKeywords): string[] {
  // Remove markdown syntax, common words, keep only words > 4 chars
  const cleanedText = text
    .replace(/[#*_`>\\+\\=\\[\\]\\(\\)\\{\\}\\|]/g, ' ')
    .toLowerCase();
  
  // Split into words and filter
  const words = cleanedText.split(/\s+/);
  const commonWords = new Set([
    'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
  ]);
  
  return [...new Set(
    words.filter(word => 
      word.length > 4 && !commonWords.has(word),
    ),
  )].slice(0, maxKeywords);
}

/**
 * Sanitize HTML to prevent XSS attacks
 * @param html HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  try {
    // Configure allowed tags and attributes
    const allowedTags = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li',
      'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre',
      'span', 'img',
    ];
    
    const allowedAttributes = {
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      div: ['class'],
      span: ['class'],
      table: ['border', 'cellpadding', 'cellspacing'],
      // Allow class on all elements
      '*': ['class'],
    };
    
    // Sanitize the HTML with our configuration
    return sanitizeHtmlLib(html, {
      allowedTags,
      allowedAttributes,
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  } catch {
    // Fallback to basic sanitization if the library isn't available
    
    // Remove script tags and their content
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    sanitized = sanitized.replace(/\s+on\w+=['"][^'"]*['"]/gi, '');
    
    // Remove iframe, object, embed
    const dangerousTags = [
      'iframe', 'object', 'embed', 'base', 'form', 
      'input', 'button', 'textarea', 'select', 'option',
    ];
    
    for (const tag of dangerousTags) {
      const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
      sanitized = sanitized.replace(new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi'), '');
    }
    
    // Remove data: and javascript: URLs
    sanitized = sanitized.replace(/\bsrc\s*=\s*["'](?:data|javascript):[^"']*["']/gi, '');
    sanitized = sanitized.replace(/\bhref\s*=\s*["'](?:data|javascript):[^"']*["']/gi, '');
    
    return sanitized;
  }
}

/**
 * Calculate the approximate reading time for a text
 * @param text The text to analyze
 * @param wordsPerMinute Average reading speed (default: 200 words per minute)
 * @returns Estimated reading time in minutes
 */
export function calculateReadingTime(text: string, wordsPerMinute = textConfig.defaultWordsPerMinute): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}