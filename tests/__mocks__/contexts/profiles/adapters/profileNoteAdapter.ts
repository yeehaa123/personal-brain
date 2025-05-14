import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';

/**
 * Mock ProfileNoteAdapter for testing
 */
export class MockProfileNoteAdapter {
  private static instance: MockProfileNoteAdapter | null = null;
  private mockProfile: Profile | null = null;
  private mockNote: Note | null = null;
  
  // Use the same constant as the real adapter
  public static readonly PROFILE_NOTE_ID = 'user-profile';
  
  static getInstance(): MockProfileNoteAdapter {
    if (!MockProfileNoteAdapter.instance) {
      MockProfileNoteAdapter.instance = new MockProfileNoteAdapter();
    }
    return MockProfileNoteAdapter.instance;
  }
  
  static resetInstance(): void {
    MockProfileNoteAdapter.instance = null;
  }
  
  static createFresh(): MockProfileNoteAdapter {
    return new MockProfileNoteAdapter();
  }
  
  async setMockProfile(profile: Profile | null): Promise<void> {
    this.mockProfile = profile;
    
    // If profile is set, also create a corresponding note
    if (profile) {
      this.mockNote = await this.convertProfileToNote(profile) as Note;
      this.mockNote.id = MockProfileNoteAdapter.PROFILE_NOTE_ID;
    } else {
      this.mockNote = null;
    }
  }
  
  async setMockNote(note: Note | null): Promise<void> {
    this.mockNote = note;
    
    // If note is set, also create a corresponding profile
    if (note) {
      this.mockProfile = this.convertNoteToProfile(note);
    } else {
      this.mockProfile = null;
    }
  }
  
  async getProfile(): Promise<Profile | null> {
    return this.mockProfile;
  }
  
  async saveProfile(profile: Profile): Promise<boolean> {
    this.mockProfile = { ...profile };
    this.mockNote = await this.convertProfileToNote(profile) as Note;
    this.mockNote.id = MockProfileNoteAdapter.PROFILE_NOTE_ID;
    return true;
  }
  
  convertNoteToProfile(note: Note): Profile | null {
    try {
      // Try to extract profile from JSON block
      const metadataMatch = note.content.match(/```json\n([\s\S]*?)\n```/);
      
      if (metadataMatch && metadataMatch[1]) {
        // Parse the profile data from the JSON block
        const profileData = JSON.parse(metadataMatch[1]);
        return profileData;
      }
      
      // Fallback: try to parse the entire content as JSON
      return JSON.parse(note.content);
    } catch (error) {
      console.error('Failed to parse profile data from note in mock', error);
      return null;
    }
  }
  
  async convertProfileToNote(profile: Profile): Promise<Partial<Note>> {
    // Create a simplified markdown representation
    const markdownContent = `# ${profile.displayName}\n\n${profile.summary || ''}`;
    
    // Store the full profile data as JSON
    const profileJson = JSON.stringify(profile, null, 2);
    const content = `${markdownContent}\n\n<!-- Profile data -->\n\`\`\`json\n${profileJson}\n\`\`\``;
    
    return {
      title: `Profile: ${profile.displayName}`,
      content,
      tags: profile.tags || [],
      source: 'profile',
    };
  }
}