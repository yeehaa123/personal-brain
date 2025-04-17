/**
 * Tests for standard schema-based response in BrainProtocol
 */
import { describe, expect, test } from 'bun:test';

import { generateStandardSystemPrompt, StandardResponseSchema, standardToProtocolResponse } from '@/protocol/schemas/standardResponseSchema';
import type { StandardResponse } from '@/protocol/schemas/standardResponseSchema';
import { createMockNote } from '@test/__mocks__/models/note';

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
  
  describe('standardToProtocolResponse', () => {
    test('should convert standard response to protocol response', () => {
      const standardResponse: StandardResponse = {
        answer: 'Test answer',
        metadata: {
          hasSources: true,
          sourceTypes: ['notes'],
          citations: [
            { noteId: 'note1', noteTitle: 'Test Note', excerpt: 'Test excerpt' },
          ],
        },
      };
      
      const mockNotes = [createMockNote('related1', 'Related Note')];
      
      const protocolResponse = standardToProtocolResponse(standardResponse, mockNotes);
      
      expect(protocolResponse.answer).toBe('Test answer');
      expect(protocolResponse.citations).toHaveLength(1);
      expect(protocolResponse.citations[0].noteId).toBe('note1');
      expect(protocolResponse.relatedNotes).toHaveLength(1);
      expect(protocolResponse.relatedNotes[0].id).toBe('related1');
    });
    
    test('should handle response with external sources', () => {
      const standardResponse: StandardResponse = {
        answer: 'Test answer with external sources',
        metadata: {
          hasSources: true,
          sourceTypes: ['external'],
          externalSources: [
            { 
              title: 'External Source', 
              source: 'Wikipedia', 
              url: 'https://example.com',
              excerpt: 'External excerpt', 
            },
          ],
        },
      };
      
      const protocolResponse = standardToProtocolResponse(standardResponse);
      
      expect(protocolResponse.answer).toBe('Test answer with external sources');
      expect(protocolResponse.citations).toHaveLength(0);
      expect(protocolResponse.externalSources).toHaveLength(1);
      expect(protocolResponse.externalSources?.[0].title).toBe('External Source');
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
  
  describe('Protocol compatibility', () => {
    test('standardToProtocolResponse should generate same format as original implementation', () => {
      // Create a standard response with all fields
      const standardResponse: StandardResponse = {
        answer: 'This is a comprehensive test answer.',
        metadata: {
          hasSources: true,
          sourceTypes: ['notes', 'external', 'profile'],
          citations: [
            { noteId: 'note1', noteTitle: 'Note One', excerpt: 'Excerpt one' },
            { noteId: 'note2', noteTitle: 'Note Two', excerpt: 'Excerpt two' },
          ],
          externalSources: [
            { title: 'External One', source: 'Wikipedia', url: 'https://example.com/1', excerpt: 'External excerpt one' },
            { title: 'External Two', source: 'News', url: 'https://example.com/2', excerpt: 'External excerpt two' },
          ],
          usedProfile: true,
          sourceExplanation: 'Used various sources to answer the query',
        },
      };
      
      const relatedNotes = [
        createMockNote('related1', 'Related Note One'),
        createMockNote('related2', 'Related Note Two'),
      ];
      
      // Generate protocol response
      const protocolResponse = standardToProtocolResponse(standardResponse, relatedNotes);
      
      // Check that the response has all expected fields
      expect(protocolResponse.answer).toBe('This is a comprehensive test answer.');
      
      // Check citations
      expect(protocolResponse.citations).toHaveLength(2);
      expect(protocolResponse.citations[0].noteId).toBe('note1');
      expect(protocolResponse.citations[0].noteTitle).toBe('Note One');
      expect(protocolResponse.citations[0].excerpt).toBe('Excerpt one');
      
      // Check related notes
      expect(protocolResponse.relatedNotes).toHaveLength(2);
      expect(protocolResponse.relatedNotes[0].id).toBe('related1');
      expect(protocolResponse.relatedNotes[1].id).toBe('related2');
      
      // Check external sources
      expect(protocolResponse.externalSources).toHaveLength(2);
      expect(protocolResponse.externalSources?.[0].title).toBe('External One');
      expect(protocolResponse.externalSources?.[0].source).toBe('Wikipedia');
      expect(protocolResponse.externalSources?.[0].url).toBe('https://example.com/1');
      expect(protocolResponse.externalSources?.[0].excerpt).toBe('External excerpt one');
    });
  });
});