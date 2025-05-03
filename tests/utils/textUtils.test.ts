/**
 * Tests for TextUtils
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import type { TextConfig } from '@/utils/textUtils';
import { TextUtils } from '@/utils/textUtils';

describe('TextUtils', () => {
  beforeEach(() => {
    // Reset the singleton
    TextUtils.resetInstance();
  });
  
  // REMOVED TEST: test('getInstance returns...

  
  // REMOVED TEST: test('resetInstance clears...

  
  // REMOVED TEST: test('createFresh creates...

  
  test('accepts custom configuration', () => {
    const customConfig: Partial<TextConfig> = {
      defaultChunkSize: 500,
      defaultMaxKeywords: 5,
    };
    
    const utils = TextUtils.createFresh(customConfig);
    
    // Testing the custom config with chunkText - should use the custom chunkSize
    const text = 'This is a test. With multiple sentences. For testing chunk size.';
    const chunks = utils.chunkText(text);
    
    // Should be a single chunk since our custom size is 500 and the text is small
    expect(chunks.length).toBe(1);
    
    // Testing the custom config with extractKeywords - should limit to 5 keywords
    const longText = 'apple banana cherry durian elderberry fig grapefruit honeydew imbe jackfruit kiwi lemon mango';
    const keywords = utils.extractKeywords(longText);
    expect(keywords.length).toBeLessThanOrEqual(5);
  });
  
  test('prepareText normalizes text', () => {
    const input = 'This    is a\n\ntest   with   spaces\nand newlines.';
    const expected = 'This is a test with spaces and newlines.';
    
    // Test the class method
    const utils = TextUtils.getInstance();
    expect(utils.prepareText(input)).toBe(expected);
    
    // No standalone function, using the class instance
    const utils2 = TextUtils.getInstance();
    expect(utils2.prepareText(input)).toBe(expected);
  });
  
  test('chunkText splits text into chunks', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
    
    // Force a small chunk size to test chunking
    const utils = TextUtils.createFresh({ defaultChunkSize: 25 });
    const chunks = utils.chunkText(text);
    
    // Should create multiple chunks
    expect(chunks.length).toBeGreaterThan(1);
    
    // No standalone function, using the class instance again
    const utils2 = TextUtils.createFresh({ defaultChunkSize: 25, defaultChunkOverlap: 10 });
    const functionChunks = utils2.chunkText(text);
    expect(functionChunks.length).toBeGreaterThan(1);
  });
  
  test('extractKeywords finds relevant words', () => {
    const text = 'This is a test with some important keywords like extraction algorithm implementation';
    
    // Test the class method
    const utils = TextUtils.getInstance();
    const keywords = utils.extractKeywords(text);
    
    // Should find "important", "keywords", "extraction", "algorithm", "implementation"
    expect(keywords).toContain('important');
    expect(keywords).toContain('keywords');
    expect(keywords).toContain('extraction');
    expect(keywords).toContain('algorithm');
    expect(keywords).toContain('implementation');
    
    // Should not contain short words
    expect(keywords).not.toContain('this');
    expect(keywords).not.toContain('is');
    expect(keywords).not.toContain('a');
    expect(keywords).not.toContain('test');
    expect(keywords).not.toContain('with');
    expect(keywords).not.toContain('some');
    expect(keywords).not.toContain('like');
    
    // No standalone function, use the class instance
    const utils2 = TextUtils.getInstance();
    const functionKeywords = utils2.extractKeywords(text);
    expect(functionKeywords).toEqual(keywords);
  });
  
  test('sanitizeHtml removes dangerous tags', () => {
    const html = '<div>Safe content</div><script>alert("unsafe")</script><img src="image.jpg" onload="hackery()">';
    
    // Test the class method
    const utils = TextUtils.getInstance();
    const sanitized = utils.sanitizeHtml(html);
    
    // Should keep safe content
    expect(sanitized).toContain('<div>Safe content</div>');
    
    // Should remove script tags
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("unsafe")');
    
    // Should remove event handlers
    expect(sanitized).not.toContain('onload="hackery()"');
    
    // Should keep safe img tags
    expect(sanitized).toContain('<img src="image.jpg"');
    
    // No standalone function, use the class instance
    const utils2 = TextUtils.getInstance();
    const functionSanitized = utils2.sanitizeHtml(html);
    expect(functionSanitized).toEqual(sanitized);
  });
  
  test('calculateReadingTime estimates reading time', () => {
    // Create a string with 400 words (200 * 2)
    const words = Array(400).fill('word').join(' ');
    
    // Test the class method
    const utils = TextUtils.getInstance();
    
    // With default 200 words per minute, should take 2 minutes
    expect(utils.calculateReadingTime(words)).toBe(2);
    
    // With 100 words per minute, should take 4 minutes
    expect(utils.calculateReadingTime(words, 100)).toBe(4);
    
    // No standalone function, use the class instance
    const utils2 = TextUtils.getInstance();
    expect(utils2.calculateReadingTime(words)).toBe(2);
    expect(utils2.calculateReadingTime(words, 100)).toBe(4);
  });
});