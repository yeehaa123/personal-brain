import { test, expect, describe } from 'bun:test';
import { validateNote, noteSearchSchema } from '../src/models/note';

describe('Note model', () => {
  test('should validate a valid note', () => {
    const validNote = {
      id: 'test-id',
      title: 'Test Note',
      content: 'This is test content',
      tags: ['test', 'validation'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = validateNote(validNote);
    
    expect(result).toBeDefined();
    expect(result.id).toBe(validNote.id);
    expect(result.title).toBe(validNote.title);
    expect(result.content).toBe(validNote.content);
    expect(result.tags).toEqual(validNote.tags);
  });
  
  test('should throw an error for invalid note', () => {
    const invalidNote = {
      // Missing required fields
      content: 'This is test content',
      tags: ['test']
    };
    
    expect(() => validateNote(invalidNote)).toThrow();
  });
  
  test('should validate search parameters', () => {
    const validParams = {
      query: 'test search',
      limit: 20,
      offset: 0
    };
    
    const result = noteSearchSchema.parse(validParams);
    
    expect(result).toEqual(validParams);
  });
  
  test('should apply default values for search parameters', () => {
    const partialParams = {
      query: 'test'
    };
    
    const result = noteSearchSchema.parse(partialParams);
    
    expect(result.query).toBe('test');
    expect(result.limit).toBe(20); // Default value
    expect(result.offset).toBe(0); // Default value
  });
  
  test('should throw an error for invalid search parameters', () => {
    const invalidParams = {
      limit: 200, // Over the max of 100
      offset: -5  // Under the min of 0
    };
    
    expect(() => noteSearchSchema.parse(invalidParams)).toThrow();
  });
});