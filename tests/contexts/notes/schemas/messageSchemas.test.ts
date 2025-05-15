/**
 * Tests for Notes Context Message Schemas
 * 
 * This file contains tests for the Zod schemas used to validate
 * message parameters and payloads for the Notes context.
 */

import { describe, expect, it } from 'bun:test';

import { 
  NoteByIdParamsSchema, 
  NoteCreatedPayloadSchema,
  NoteDeletedPayloadSchema,
  NoteSchemaMap,
  NotesSearchParamsSchema,
  NotesSemanticSearchParamsSchema,
  NoteUpdatedPayloadSchema,
} from '@/contexts/notes/schemas/messageSchemas';
import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';

describe('Notes Message Schemas', () => {
  // Test NoteByIdParamsSchema
  describe('NoteByIdParamsSchema', () => {
    it('should validate valid parameters', () => {
      const result = NoteByIdParamsSchema.safeParse({
        id: 'test-note-id',
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should reject missing id', () => {
      const result = NoteByIdParamsSchema.safeParse({});
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // We only care that there's an error for the id field
        expect(result.error.format().id?._errors).toBeDefined();
      }
    });
    
    it('should reject empty id', () => {
      const result = NoteByIdParamsSchema.safeParse({
        id: '',
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // We only care that there's an error for the id field
        expect(result.error.format().id?._errors).toBeDefined();
      }
    });
  });
  
  // Test NotesSearchParamsSchema
  describe('NotesSearchParamsSchema', () => {
    it('should validate valid parameters', () => {
      const result = NotesSearchParamsSchema.safeParse({
        query: 'test query',
        limit: 10,
        includeContent: true,
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should provide default values for optional parameters', () => {
      const result = NotesSearchParamsSchema.safeParse({
        query: 'test query',
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeContent).toBe(true);
      }
    });
    
    it('should reject missing query', () => {
      const result = NotesSearchParamsSchema.safeParse({
        limit: 10,
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // We only care that there's an error for the query field
        expect(result.error.format().query?._errors).toBeDefined();
      }
    });
    
    it('should reject empty query', () => {
      const result = NotesSearchParamsSchema.safeParse({
        query: '',
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // We only care that there's an error for the query field
        expect(result.error.format().query?._errors).toBeDefined();
      }
    });
    
    it('should reject negative limit', () => {
      const result = NotesSearchParamsSchema.safeParse({
        query: 'test query',
        limit: -5,
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().limit?._errors).toBeDefined();
      }
    });
  });
  
  // Test NotesSemanticSearchParamsSchema
  describe('NotesSemanticSearchParamsSchema', () => {
    it('should validate valid parameters', () => {
      const result = NotesSemanticSearchParamsSchema.safeParse({
        text: 'test semantic search',
        limit: 5,
        tags: ['tag1', 'tag2'],
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should provide default values for optional parameters', () => {
      const result = NotesSemanticSearchParamsSchema.safeParse({
        text: 'test semantic search',
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });
    
    it('should reject missing text', () => {
      const result = NotesSemanticSearchParamsSchema.safeParse({
        limit: 10,
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // We only care that there's an error for the text field
        expect(result.error.format().text?._errors).toBeDefined();
      }
    });
  });
  
  // Test NoteCreatedPayloadSchema
  describe('NoteCreatedPayloadSchema', () => {
    it('should validate valid payload', () => {
      const result = NoteCreatedPayloadSchema.safeParse({
        noteId: 'test-note-id',
        title: 'Test Note',
        tags: ['tag1', 'tag2'],
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should validate valid payload without tags', () => {
      const result = NoteCreatedPayloadSchema.safeParse({
        noteId: 'test-note-id',
        title: 'Test Note',
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should reject missing noteId', () => {
      const result = NoteCreatedPayloadSchema.safeParse({
        title: 'Test Note',
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // We only care that there's an error for the noteId field
        expect(result.error.format().noteId?._errors).toBeDefined();
      }
    });
    
    it('should reject missing title', () => {
      const result = NoteCreatedPayloadSchema.safeParse({
        noteId: 'test-note-id',
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().title?._errors).toBeDefined();
      }
    });
  });
  
  // Test NoteSchemaMap completeness
  describe('NoteSchemaMap', () => {
    it('should have schema for each relevant DataRequestType', () => {
      expect(NoteSchemaMap[DataRequestType.NOTE_BY_ID]).toBe(NoteByIdParamsSchema);
      expect(NoteSchemaMap[DataRequestType.NOTES_SEARCH]).toBe(NotesSearchParamsSchema);
      expect(NoteSchemaMap[DataRequestType.NOTES_SEMANTIC_SEARCH]).toBe(NotesSemanticSearchParamsSchema);
    });
    
    it('should have schema for each relevant NotificationType', () => {
      expect(NoteSchemaMap[NotificationType.NOTE_CREATED]).toBe(NoteCreatedPayloadSchema);
      expect(NoteSchemaMap[NotificationType.NOTE_UPDATED]).toBe(NoteUpdatedPayloadSchema);
      expect(NoteSchemaMap[NotificationType.NOTE_DELETED]).toBe(NoteDeletedPayloadSchema);
    });
  });
});