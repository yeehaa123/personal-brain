/**
 * Text processing utilities
 */

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
export function chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
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
export function extractKeywords(text: string, maxKeywords = 10): string[] {
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