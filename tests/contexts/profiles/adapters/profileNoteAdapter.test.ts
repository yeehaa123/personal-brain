import { beforeEach, describe, expect, test } from 'bun:test';

import type { MCPNoteContext } from '@/contexts/notes';
import { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { TagExtractor } from '@/utils/tagExtractor';

// Create mock implementations
class MockNoteContext implements Partial<MCPNoteContext> {
  private notes = new Map<string, Note>();

  async getNoteById(id: string) {
    return this.notes.get(id) || null;
  }

  async createNote(note: Partial<Note>) {
    const id = note.id || 'generated-id';
    const fullNote: Note = {
      id,
      title: note.title || '',
      content: note.content || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: note.source || 'profile',
      tags: note.tags || [],
      embedding: [0.1, 0.2, 0.3, 0.4],
      confidence: null,
      conversationMetadata: null,
      verified: null,
    };
    this.notes.set(id, fullNote);
    return id;
  }

  async updateNote(id: string, updates: Partial<Note>) {
    const note = this.notes.get(id);
    if (note) {
      Object.assign(note, updates, { updatedAt: new Date() });
      return true;
    }
    return false;
  }
}

class MockTagExtractor implements Partial<TagExtractor> {
  async extractTags(text: string) {
    // Simple mock that extracts some keywords
    const words = text.toLowerCase().split(/\s+/);
    const tags = words.filter(word => 
      ['software', 'engineer', 'typescript', 'react'].includes(word),
    );
    return [...new Set(tags)];
  }
}

describe('ProfileNoteAdapter', () => {
  let adapter: ProfileNoteAdapter;
  let mockNoteContext: MockNoteContext;
  
  const sampleProfile: Profile = {
    displayName: 'Test User',
    email: 'test@example.com',
    headline: 'Software Engineer',
    summary: 'Experienced software engineer with expertise in TypeScript and React.',
    skills: ['TypeScript', 'React', 'Node.js'],
  };
  
  beforeEach(() => {
    mockNoteContext = new MockNoteContext();
    const mockTagExtractor = new MockTagExtractor();
    
    adapter = ProfileNoteAdapter.createFresh({
      noteContext: mockNoteContext as unknown as MCPNoteContext,
      tagExtractor: mockTagExtractor as unknown as TagExtractor,
    });
  });
  
  test('should convert profile to note format', async () => {
    const noteData = await adapter.convertProfileToNote(sampleProfile);
    
    expect(noteData.title).toBe('Profile: Test User');
    expect(noteData.source).toBe('profile');
    expect(noteData.content).toContain('# Test User');
    expect(noteData.content).toContain('*Software Engineer*');
    expect(noteData.content).toContain('```json');
    
    // Check that tags were extracted
    expect(noteData.tags).toBeDefined();
    expect(noteData.tags!.length).toBeGreaterThan(0);
  });
  
  test('should save a new profile as a note', async () => {
    const result = await adapter.saveProfile(sampleProfile);
    
    expect(result).toBe(true);
    
    // Verify the note was created
    const note = await mockNoteContext.getNoteById(ProfileNoteAdapter.PROFILE_NOTE_ID);
    expect(note).toBeDefined();
    expect(note?.title).toBe('Profile: Test User');
  });
  
  test('should update an existing profile', async () => {
    // First save a profile
    await adapter.saveProfile(sampleProfile);
    
    // Update the profile
    const updatedProfile: Profile = {
      ...sampleProfile,
      displayName: 'Updated User',
      headline: 'Senior Software Engineer',
    };
    
    const result = await adapter.saveProfile(updatedProfile);
    
    expect(result).toBe(true);
    
    // Verify the note was updated
    const note = await mockNoteContext.getNoteById(ProfileNoteAdapter.PROFILE_NOTE_ID);
    expect(note?.title).toBe('Profile: Updated User');
    expect(note?.content).toContain('Senior Software Engineer');
  });
  
  test('should extract profile from note', async () => {
    const noteWithProfile: Note = {
      id: ProfileNoteAdapter.PROFILE_NOTE_ID,
      title: 'Profile: Test User',
      content: `# Test User\n\nSome content\n\n<!-- Profile data -->\n\`\`\`json\n${JSON.stringify(sampleProfile, null, 2)}\n\`\`\``,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'profile',
      embedding: [0.1, 0.2, 0.3, 0.4],
      confidence: null,
      tags: [],
      conversationMetadata: null,
      verified: null,
    };
    
    const profile = adapter.convertNoteToProfile(noteWithProfile);
    
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Test User');
    expect(profile?.email).toBe('test@example.com');
    expect(profile?.skills).toContain('TypeScript');
  });
  
  test('should handle invalid note content', async () => {
    const noteWithInvalidData: Note = {
      id: ProfileNoteAdapter.PROFILE_NOTE_ID,
      title: 'Profile: Test User',
      content: '# Test User\n\nSome content\n\n<!-- Profile data -->\n```json\nInvalid JSON\n```',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'profile',
      embedding: [0.1, 0.2, 0.3, 0.4],
      confidence: null,
      tags: [],
      conversationMetadata: null,
      verified: null,
    };
    
    const profile = adapter.convertNoteToProfile(noteWithInvalidData);
    
    expect(profile).toBeNull();
  });
});