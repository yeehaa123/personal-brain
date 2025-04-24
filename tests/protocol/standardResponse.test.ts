/**
 * Tests for standard schema-based response in BrainProtocol
 */
import { describe, expect, test } from 'bun:test';

import { generateStandardSystemPrompt, StandardResponseSchema } from '@/protocol/schemas/standardResponseSchema';

describe('Standard schema-based responses', () => {
  describe('Schema definition', () => {
    test('StandardResponseSchema should validate valid data', () => {
      const validResponse = {
        answer: 'This is a test answer.',
        metadata: {
          hasSources: false,
        },
      };
      
      const result = StandardResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
    
    test('StandardResponseSchema should validate data with sources', () => {
      const responseWithSources = {
        answer: 'This is a test answer with sources.',
        metadata: {
          hasSources: true,
          sourceTypes: ['notes', 'external'],
          citations: [
            { noteId: 'note1', noteTitle: 'Test Note' },
          ],
          externalSources: [
            { title: 'Test Source', source: 'Wikipedia', url: 'https://example.com' },
          ],
        },
      };
      
      const result = StandardResponseSchema.safeParse(responseWithSources);
      expect(result.success).toBe(true);
    });
    
    test('StandardResponseSchema should reject invalid data', () => {
      const invalidResponse = {
        // Missing required 'answer' field
        metadata: {
          hasSources: false,
        },
      };
      
      const result = StandardResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
  
  describe('generateStandardSystemPrompt', () => {
    test('should generate basic system prompt', () => {
      const prompt = generateStandardSystemPrompt();
      
      // Basic checks
      expect(prompt).toContain('You are a helpful assistant');
      expect(prompt).toContain('\'answer\' field');
      expect(prompt).toContain('\'metadata\' object');
      expect(prompt).toContain('\'hasSources\'');
    });
    
    test('should include profile instructions when isProfileQuery is true', () => {
      const prompt = generateStandardSystemPrompt(true);
      
      expect(prompt).toContain('profile information');
      expect(prompt).toContain('\'usedProfile\'');
    });
    
    test('should include external source instructions when enabled', () => {
      const prompt = generateStandardSystemPrompt(false, true);
      
      expect(prompt).toContain('external sources');
      expect(prompt).toContain('\'externalSources\'');
    });
  });
});