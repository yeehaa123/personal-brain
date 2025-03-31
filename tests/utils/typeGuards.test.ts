import { describe, expect, test } from 'bun:test';
import {
  isNote,
  isNoteArray,
  hasProperty,
  hasStringProperty,
  isNonEmptyString,
  isISODateString
} from '@/utils/typeGuards';

describe('typeGuards', () => {
  describe('isNote', () => {
    test('should identify a valid note object', () => {
      const validNote = {
        id: 'note-1',
        content: 'This is a test note',
        title: 'Test Note',
        tags: ['test', 'typescript'],
        embedding: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(isNote(validNote)).toBe(true);
    });
    
    test('should reject objects missing required properties', () => {
      const invalidNote = {
        id: 'note-1',
        content: 'This is a test note',
        // Missing title
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(isNote(invalidNote)).toBe(false);
    });
    
    test('should reject objects with wrong property types', () => {
      const invalidNote = {
        id: 'note-1',
        content: 'This is a test note',
        title: 'Test Note',
        tags: 'test, typescript', // Should be an array
        createdAt: '2023-01-01', // Should be a Date
        updatedAt: new Date()
      };
      
      expect(isNote(invalidNote)).toBe(false);
    });
    
    test('should reject null and undefined', () => {
      expect(isNote(null)).toBe(false);
      expect(isNote(undefined)).toBe(false);
    });
  });
  
  describe('isNoteArray', () => {
    test('should identify an array of valid notes', () => {
      const notes = [
        {
          id: 'note-1',
          content: 'Test note 1',
          title: 'Note 1',
          tags: ['test'],
          embedding: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'note-2',
          content: 'Test note 2',
          title: 'Note 2',
          tags: null,
          embedding: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      expect(isNoteArray(notes)).toBe(true);
    });
    
    test('should reject mixed arrays', () => {
      const mixedArray = [
        {
          id: 'note-1',
          content: 'Test note 1',
          title: 'Note 1',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        'not a note'
      ];
      
      expect(isNoteArray(mixedArray)).toBe(false);
    });
    
    test('should reject non-arrays', () => {
      expect(isNoteArray({})).toBe(false);
      expect(isNoteArray(null)).toBe(false);
    });
  });
  
  describe('hasProperty', () => {
    test('should identify objects with specified property', () => {
      const obj = { name: 'John', age: 30 };
      expect(hasProperty(obj, 'name')).toBe(true);
    });
    
    test('should reject objects without specified property', () => {
      const obj = { age: 30 };
      expect(hasProperty(obj, 'name')).toBe(false);
    });
    
    test('should reject non-objects', () => {
      expect(hasProperty(null, 'name')).toBe(false);
      expect(hasProperty(undefined, 'name')).toBe(false);
      expect(hasProperty('string', 'name')).toBe(false);
    });
  });
  
  describe('hasStringProperty', () => {
    test('should identify objects with specified string property', () => {
      const obj = { name: 'John', age: 30 };
      expect(hasStringProperty(obj, 'name')).toBe(true);
    });
    
    test('should reject objects with non-string property', () => {
      const obj = { name: 123, age: 30 };
      expect(hasStringProperty(obj, 'name')).toBe(false);
      
      const obj2 = { name: null, age: 30 };
      expect(hasStringProperty(obj2, 'name')).toBe(false);
    });
  });
  
  describe('isNonEmptyString', () => {
    test('should identify non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });
    
    test('should reject empty strings and whitespace', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });
    
    test('should reject non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
    });
  });
  
  describe('isISODateString', () => {
    test('should identify ISO date strings', () => {
      expect(isISODateString('2023-01-01T12:00:00.000Z')).toBe(true);
    });
    
    test('should reject invalid date strings', () => {
      expect(isISODateString('not a date')).toBe(false);
      expect(isISODateString('2023/01/01')).toBe(false); // Missing T
    });
    
    test('should reject non-strings', () => {
      expect(isISODateString(new Date())).toBe(false);
      expect(isISODateString(null)).toBe(false);
    });
  });
});