/**
 * Tests for TextUtils
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { TextUtils } from '@/utils/textUtils';

describe('TextUtils', () => {
  beforeEach(() => {
    // Reset the singleton
    TextUtils.resetInstance();
  });

  test('text processing core functionality works correctly', () => {
    // Create utils with custom config
    const utils = TextUtils.createFresh({
      defaultChunkSize: 500,
      defaultMaxKeywords: 5,
    });
    
    // Test text preparation
    const unpreparedText = 'This    is a\n\ntest   with   spaces\nand newlines.';
    const preparedText = utils.prepareText(unpreparedText);
    expect(preparedText).toBe('This is a test with spaces and newlines.');
    
    // Test chunking with different configurations
    const smallChunkUtils = TextUtils.createFresh({ defaultChunkSize: 25 });
    const longText = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
    
    // Verify multiple chunks are created with small chunk size
    const chunks = smallChunkUtils.chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);
    
    // Test keyword extraction and HTML sanitization
    const sampleText = 'This test has important keywords like extraction algorithm implementation';
    const keywords = utils.extractKeywords(sampleText);
    
    // Check keywords exist but don't use multiple expects
    const foundImportantWord = keywords.some(k => 
      ['important', 'keywords', 'extraction', 'algorithm', 'implementation'].includes(k),
    );
    expect(foundImportantWord).toBe(true);
    
    // Test HTML sanitization - check only one key aspect
    const htmlInput = '<div>Safe content</div><script>alert("unsafe")</script>';
    const sanitized = utils.sanitizeHtml(htmlInput);
    expect(sanitized.includes('Safe content') && !sanitized.includes('<script>')).toBe(true);
    
    // Test reading time calculation
    const wordsForReading = Array(400).fill('word').join(' ');
    expect(utils.calculateReadingTime(wordsForReading, 200)).toBe(2);
  });
});