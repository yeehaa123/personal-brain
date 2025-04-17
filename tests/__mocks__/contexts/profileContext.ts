/**
 * ProfileContext mock implementation
 * 
 * Provides a standardized mock for the ProfileContext class.
 */

import { mock } from 'bun:test';

import type { NoteContext } from '@/contexts';
import type { ProfileStorageAdapter } from '@/contexts/profiles/adapters/profileStorageAdapter';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';

import { MockBaseContext } from './baseContext';

/**
 * Mock implementation for the ProfileContext
 */
export class MockProfileContext extends MockBaseContext {
  private static instance: MockProfileContext | null = null;
  
  // Mock services and dependencies
  protected storageAdapter: {
    read: (id: string) => Promise<Profile | null>;
    create: (profile: Partial<Profile>) => Promise<string>;
    update: (id: string, profile: Partial<Profile>) => Promise<boolean>;
    delete: (id: string) => Promise<boolean>;
    getProfile: () => Promise<Profile | null>;
  };
  
  // Mock note context reference
  protected noteContext: {
    searchNotes: (params: Record<string, unknown>) => Promise<Note[]>;
  } | null = null;
  
  /**
   * Get singleton instance of MockProfileContext
   */
  public static override getInstance(): MockProfileContext {
    if (!MockProfileContext.instance) {
      MockProfileContext.instance = new MockProfileContext();
    }
    return MockProfileContext.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockProfileContext.instance = null;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static override createFresh(config: Record<string, unknown> = {}): MockProfileContext {
    return new MockProfileContext(config);
  }
  
  /**
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    super({
      name: config['name'] || 'ProfileBrain',
      version: config['version'] || '1.0.0',
    });
    
    // Initialize mock storage adapter
    this.storageAdapter = {
      read: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve('profile-123')),
      update: mock(() => Promise.resolve(true)),
      delete: mock(() => Promise.resolve(true)),
      getProfile: mock(() => Promise.resolve(null)),
    };
    
    // Initialize mock resources
    this.resources = [
      {
        protocol: 'profile',
        path: 'get',
        handler: mock(() => Promise.resolve(null)),
        name: 'Get Profile',
        description: 'Get the user profile',
      },
    ];
    
    // Initialize mock tools
    this.tools = [
      {
        protocol: 'profile',
        path: 'update_profile',
        handler: mock(() => Promise.resolve(true)),
        name: 'Update Profile',
        description: 'Update the user profile',
      },
    ];
  }
  
  /**
   * Get the storage adapter
   */
  getStorage(): ProfileStorageAdapter {
    return this.storageAdapter as unknown as ProfileStorageAdapter;
  }
  
  /**
   * Set a new storage adapter
   */
  setStorage(storage: ProfileStorageAdapter): void {
    this.storageAdapter = storage as unknown as typeof this.storageAdapter;
  }
  
  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    return this.storageAdapter.getProfile();
  }
  
  /**
   * Create a new profile
   */
  async createProfile(profile: Partial<Profile>): Promise<string> {
    return this.storageAdapter.create(profile);
  }
  
  /**
   * Update the profile
   */
  async updateProfile(id: string, updates: Partial<Profile>): Promise<boolean> {
    return this.storageAdapter.update(id, updates);
  }
  
  /**
   * Delete the profile
   */
  async deleteProfile(id: string): Promise<boolean> {
    return this.storageAdapter.delete(id);
  }
  
  /**
   * Set the note context reference
   */
  setNoteContext(context: NoteContext): void {
    this.noteContext = context as unknown as typeof this.noteContext;
  }
  
  /**
   * Get the note context reference
   */
  getNoteContext(): NoteContext | null {
    return this.noteContext as unknown as NoteContext | null;
  }
  
  /**
   * Extract profile keywords
   */
  async extractProfileKeywords(_profile: Profile): Promise<string[]> {
    // Mock implementation that returns some standard keywords
    return ['interests', 'skills', 'personal', 'professional', 'background'];
  }
}