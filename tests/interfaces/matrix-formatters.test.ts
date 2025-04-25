import { describe, expect, test } from 'bun:test';

import { MatrixBlockBuilder, MatrixCitationFormatter, MatrixMarkdownFormatter, MatrixResponseFormatter } from '@/interfaces/matrix/formatters';

describe('Matrix Formatters', () => {
  describe('MarkdownFormatter', () => {
    test('should format basic markdown', () => {
      const formatter = MatrixMarkdownFormatter.getInstance();
      const result = formatter.format('# Hello World');
      
      // Should contain the header with no styling
      expect(result).toContain('<h1>Hello World</h1>');
    });
    
    test('should format code blocks', () => {
      const formatter = MatrixMarkdownFormatter.getInstance();
      const result = formatter.formatCodeBlock('console.log("Hello")', 'javascript');
      
      // Should contain the code and language formatting
      expect(result).toContain('console.log');
    });
  });
  
  describe('CitationFormatter', () => {
    test('should format a citation', () => {
      const formatter = MatrixCitationFormatter.getInstance();
      const result = formatter.formatCitation({
        source: 'Test Source',
        title: 'Test Title',
        content: 'Test content',
        type: 'note',
        id: 'test-id',
      });
      
      // Should contain the citation elements
      expect(result).toContain('Test Title');
      expect(result).toContain('Test content');
      expect(result).toContain('Source: Test Source');
      expect(result).toContain('test-id');
    });
    
    test('should create a note-based citation', () => {
      const formatter = MatrixCitationFormatter.getInstance();
      const note = {
        id: 'note-id',
        title: 'Note Title',
        content: 'Note content',
        createdAt: new Date().toISOString(),
      };
      
      const citation = formatter.createNoteBasedCitation(note);
      
      expect(citation.title).toBe('Note Title');
      expect(citation.id).toBe('note-id');
      expect(citation.type).toBe('note');
    });
  });
  
  describe('BlockBuilder', () => {
    test('should build blocks with HTML fallback', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: false });
      
      builder.addHeader('Test Header');
      builder.addSection('Test Section');
      builder.addDivider();
      
      const result = builder.build() as string;
      
      expect(result).toContain('<h3>Test Header</h3>');
      expect(result).toContain('Test Section');
      expect(result).toContain('<hr>');
    });
    
    test('should generate plain text fallback', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: true });
      
      builder.addHeader('Test Header');
      builder.addSection('Test Section');
      
      const result = builder.build() as Record<string, unknown>;
      
      expect(result['body']).toContain('Test Header');
      expect(result['blocks']).toBeDefined();
    });
  });
  
  describe('ResponseFormatter', () => {
    test('should format search results', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const notes = [
        { 
          id: 'note-1', 
          title: 'Note 1', 
          content: 'Content 1', 
          tags: ['tag1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { 
          id: 'note-2', 
          title: 'Note 2', 
          content: 'Content 2', 
          tags: ['tag2'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      const result = formatter.formatSearchResults('test', notes);
      
      expect(result).toContain('Search Results for "test"');
      expect(result).toContain('Note 1');
      expect(result).toContain('Note 2');
    });
    
    test('should format note display', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const note = {
        id: 'note-id',
        title: 'Note Title',
        content: 'Note content with some **markdown**',
        tags: ['tag1', 'tag2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const result = formatter.formatNote(note);
      
      expect(result).toContain('Note Title');
      expect(result).toContain('Note content');
      expect(result).toContain('tag1');
      expect(result).toContain('tag2');
    });
    
    test('should format an answer with citations', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const answer = 'This is the answer with some *markdown*.';
      const citations = [
        { noteId: 'note-1', noteTitle: 'Source 1', excerpt: 'Excerpt 1' },
        { noteId: 'note-2', noteTitle: 'Source 2', excerpt: 'Excerpt 2' },
      ];
      
      const result = formatter.formatAnswer(answer, citations);
      
      // Check for the formatted content, not raw markdown
      expect(result).toContain('This is the answer with some');
      expect(result).toContain('<em>markdown</em>');
      expect(result).toContain('Source 1');
      expect(result).toContain('Source 2');
    });
    
    test('should put Sources section after Related Notes in answer', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const answer = 'This is the answer with some markdown.';
      const citations = [
        { noteId: 'note-1', noteTitle: 'Source 1', excerpt: 'Excerpt 1' },
      ];
      const relatedNotes = [
        { 
          id: 'note-3', 
          title: 'Related Note', 
          content: 'Related content', 
          tags: ['tag3'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      const result = formatter.formatAnswer(answer, citations, relatedNotes);
      
      // Validate that Related Notes appears before Sources in the content
      const relatedNotesPos = result.indexOf('Related Notes');
      const sourcesPos = result.indexOf('Sources');
      
      // Both sections should exist
      expect(relatedNotesPos).toBeGreaterThan(-1);
      expect(sourcesPos).toBeGreaterThan(-1);
      
      // Related Notes should come before Sources
      expect(relatedNotesPos).toBeLessThan(sourcesPos);
    });
    
    test('should filter out footer attributions from note previews', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      
      // Create a note with attribution footer (like those created from conversations)
      const noteWithAttribution = {
        id: 'note-attr',
        title: 'Note with Attribution',
        content: `This is regular content.

---

> **Note**: This content was derived from a conversation on 2025-04-08.
> **Source**: Conversation with AI assistant
> **Original Query**: "test query"`,
        tags: ['tag1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const notes = [noteWithAttribution];
      
      // Test in notes list
      const result = formatter.formatNotesList(notes);
      
      // The preview should only contain the regular content, not the attribution
      expect(result).toContain('This is regular content');
      
      // The position of the attribution should not be in the preview
      // (This is a crude test but should catch obvious regressions)
      expect(result).not.toContain('derived from a conversation');
    });
  });
});