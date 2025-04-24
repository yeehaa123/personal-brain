/**
 * Tests for the contexts index exports
 * 
 * These tests verify that domain contexts are properly exported
 * from the contexts module.
 */
import { describe, expect, test } from 'bun:test';

// Import domain contexts directly to verify they can be imported
import { 
  ConversationContext,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
  WebsiteContext,
} from '@/contexts';

describe('Context Exports', () => {
  test('should export domain contexts', () => {
    // If the imports succeed, the test passes
    expect(ConversationContext).toBeDefined();
    expect(NoteContext).toBeDefined();
    expect(ProfileContext).toBeDefined();
    expect(ExternalSourceContext).toBeDefined();
    expect(WebsiteContext).toBeDefined();
    
    // Verify they are functions (classes)
    expect(typeof ConversationContext).toBe('function');
    expect(typeof NoteContext).toBe('function');
    expect(typeof ProfileContext).toBe('function');
    expect(typeof ExternalSourceContext).toBe('function');
    expect(typeof WebsiteContext).toBe('function');
  });
});