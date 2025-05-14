/**
 * Mock ProfileContextV2 implementation
 * 
 * Provides a completely standalone mock without any inheritance
 */

import { mock } from 'bun:test';

import type { FormatterInterface } from '@/contexts/formatterInterface';
import type { NoteContext } from '@/contexts/notes';
import type { ProfileContextConfig, ProfileContextDependencies } from '@/contexts/profiles/profileContextV2';
import type { StorageInterface } from '@/contexts/storageInterface';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { MockNote } from '@test/__mocks__/models/note';

/**
 * Simple standalone mock implementation of ProfileContextV2
 * 
 * This doesn't extend any real implementation or base class.
 */
export class MockProfileContextV2 {
  private static mockInstance: MockProfileContextV2 | null = null;

  // State for the mock
  private mockProfile: Profile | null = null;
  private mockNote: Note | null = null;
  private mockResources: Array<Record<string, unknown>> = [];
  private mockTools: Array<Record<string, unknown>> = [];
  private embeddingError: boolean = false;
  private saveError: boolean = false;
  private readyState: boolean = true;

  // Mock dependencies
  private mockNoteContext: NoteContext | null = null;

  // Mock methods with tracking
  getProfile = mock(async (): Promise<Profile | null> => {
    return this.mockProfile;
  });

  saveProfile = mock(async (profile: Profile): Promise<boolean> => {
    if (this.saveError) {
      return false;
    }

    this.mockProfile = profile;
    // Use MockNote.createWithDefaults instead
    const note = MockNote.createWithDefaults('profile-note-id', 'Profile', ['profile']);
    note.content = JSON.stringify(profile);
    this.mockNote = note;
    return true;
  });

  updateProfile = mock(async (data: Partial<Profile>): Promise<boolean> => {
    if (this.saveError) {
      return false;
    }

    if (!this.mockProfile) {
      return false;
    }

    this.mockProfile = {
      ...this.mockProfile,
      ...data,
    };

    const note = MockNote.createWithDefaults('profile-note-id', 'Profile', ['profile']);
    note.content = JSON.stringify(this.mockProfile);
    this.mockNote = note;
    return true;
  });

  getProfileAsNote = mock(async (): Promise<Note | null> => {
    if (!this.mockProfile) {
      return null;
    }

    if (!this.mockNote) {
      const note = MockNote.createWithDefaults('profile-note-id', 'Profile', ['profile']);
      note.content = JSON.stringify(this.mockProfile);
      this.mockNote = note;
    }

    return this.mockNote;
  });


  migrateLinkedInProfile = mock(async (linkedInProfile: LinkedInProfile): Promise<boolean> => {
    if (this.saveError) {
      return false;
    }

    // Convert LinkedIn profile to our format (simplified)
    // Use the types available from the current implementation
    const profile: Profile = {
      displayName: linkedInProfile.name || 'LinkedIn User',
      email: linkedInProfile.email || 'linkedin@example.com',
      headline: linkedInProfile.headline,
      summary: linkedInProfile.summary,
      // Remove createdAt and updatedAt properties that don't exist on the profile type
    };

    return this.saveProfile(profile);
  });

  // Standard context methods
  initialize = mock(async (): Promise<boolean> => {
    this.readyState = true;
    return true;
  });

  isReady = mock((): boolean => {
    return this.readyState;
  });

  getContextName = mock((): string => {
    return 'ProfileBrain';
  });

  getContextVersion = mock((): string => {
    return '2.0.0';
  });

  getStatus = mock(() => {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      ready: this.readyState,
      resourceCount: this.mockResources.length,
      toolCount: this.mockTools.length,
    };
  });

  // Resources and tools
  getResources = mock(() => [...this.mockResources]);
  getTools = mock(() => [...this.mockTools]);
  
  getCapabilities = mock(() => {
    return {
      resources: this.getResources(),
      tools: this.getTools(),
      features: [],
    };
  });

  // MCP related methods
  getMcpServer = mock(() => {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      resource: () => {},
      tool: () => {},
    };
  });

  registerOnServer = mock(() => true);

  // Other standard methods
  cleanup = mock(async () => {});

  // Backward compatibility methods
  getActiveProfile = mock(async (): Promise<Profile | null> => {
    return this.getProfile();
  });

  /**
   * Constructor for MockProfileContextV2
   */
  constructor(
    _config?: Partial<ProfileContextConfig>,
    _dependencies?: Partial<ProfileContextDependencies>,
  ) {
    // Initialize default state
    this.mockProfile = null;
    this.mockNote = null;
    this.embeddingError = false;
    this.saveError = false;
    
    // Initialize mock resources and tools for MCP registration
    this.mockResources = [
      {
        protocol: 'profile',
        path: 'get',
        handler: async () => {
          const profile = await this.getProfile();
          return { profile };
        },
        name: 'Get Profile',
        description: 'Get the user profile',
      },
    ];

    this.mockTools = [
      {
        protocol: 'profile',
        path: 'update',
        handler: async (params: Record<string, unknown>) => {
          const profileData = params['profile'] as Partial<Profile>;
          if (!profileData) {
            throw new Error('Profile data is required');
          }

          let result;
          if (this.mockProfile) {
            await this.updateProfile(profileData);
            result = { success: true, action: 'updated' };
          } else {
            const profileWithName = {
              ...profileData,
              displayName: profileData.displayName || 'New User',
            };
            const success = await this.saveProfile(profileWithName as Profile);
            result = { success, action: 'created' };
          }
          return result;
        },
        name: 'Update Profile',
        description: 'Update the user profile',
      },
      {
        protocol: 'profile',
        path: 'migrateLinkedIn',
        handler: async (params: Record<string, unknown>) => {
          const linkedInProfileData = params['linkedInProfile'] as LinkedInProfile;
          if (!linkedInProfileData) {
            throw new Error('LinkedIn profile data is required');
          }

          const success = await this.migrateLinkedInProfile(linkedInProfileData);
          return { success };
        },
        name: 'Migrate LinkedIn Profile',
        description: 'Migrate a LinkedIn profile to the new format',
      },
    ];
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(
    config?: Partial<ProfileContextConfig>,
    dependencies?: Partial<ProfileContextDependencies>,
  ): MockProfileContextV2 {
    if (!MockProfileContextV2.mockInstance) {
      MockProfileContextV2.mockInstance = new MockProfileContextV2(config, dependencies);
    }
    return MockProfileContextV2.mockInstance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    if (MockProfileContextV2.mockInstance) {
      const instance = MockProfileContextV2.mockInstance;
      
      // Clear all mocks
      instance.getProfile.mockClear();
      instance.saveProfile.mockClear();
      instance.updateProfile.mockClear();
      instance.getProfileAsNote.mockClear();
      instance.migrateLinkedInProfile.mockClear();
      instance.getActiveProfile.mockClear();
      instance.initialize.mockClear();
      instance.isReady.mockClear();
      instance.getContextName.mockClear();
      instance.getContextVersion.mockClear();
      instance.getStatus.mockClear();
      instance.getResources.mockClear();
      instance.getTools.mockClear();
      instance.getCapabilities.mockClear();
      instance.getMcpServer.mockClear();
      instance.registerOnServer.mockClear();
      instance.cleanup.mockClear();
    }
    
    MockProfileContextV2.mockInstance = null;
  }

  /**
   * Create a fresh instance
   */
  public static createFresh(
    config?: Partial<ProfileContextConfig>,
    dependencies?: Partial<ProfileContextDependencies>,
  ): MockProfileContextV2 {
    return new MockProfileContextV2(config, dependencies);
  }

  /**
   * Get the storage implementation
   */
  getStorage(): StorageInterface<unknown, unknown> {
    return {
      create: async (item: Partial<unknown>) => {
        if (typeof item === 'object' && item !== null) {
          const success = await this.saveProfile(item as Profile);
          return success ? 'profile-note-id' : '';
        }
        return '';
      },

      read: async (id: unknown) => {
        if (id === 'profile-note-id') {
          return await this.getProfile();
        }
        return null;
      },

      update: async (id: unknown, updates: Partial<unknown>) => {
        if (id === 'profile-note-id' && typeof updates === 'object' && updates !== null) {
          return await this.updateProfile(updates as Partial<Profile>);
        }
        return false;
      },

      delete: async () => false, // Not implemented

      search: async () => {
        const profile = await this.getProfile();
        return profile ? [profile] : [];
      },

      list: async () => {
        const profile = await this.getProfile();
        return profile ? [profile] : [];
      },

      count: async () => {
        const profile = await this.getProfile();
        return profile ? 1 : 0;
      },
    };
  }

  /**
   * Get the formatter implementation
   */
  getFormatter(): FormatterInterface<unknown, unknown> {
    return {
      format: (data: unknown) => data,
    };
  }

  /**
   * Get the note context
   */
  getNoteContext(): NoteContext | null {
    return this.mockNoteContext;
  }

  /**
   * Set the note context
   */
  setNoteContext(context: NoteContext): void {
    this.mockNoteContext = context;
  }

  /**
   * Set the mock profile (for testing)
   */
  setMockProfile(profile: Profile | null): void {
    this.mockProfile = profile;

    if (profile) {
      const note = MockNote.createWithDefaults('profile-note-id', 'Profile', ['profile']);
      note.content = JSON.stringify(profile);
      this.mockNote = note;
    } else {
      this.mockNote = null;
    }
  }

  /**
   * Set the mock note (for testing)
   */
  setMockNote(note: Note | null): void {
    this.mockNote = note;

    if (note && note.content) {
      try {
        this.mockProfile = JSON.parse(note.content) as Profile;
      } catch (_e) {
        this.mockProfile = null;
      }
    } else {
      this.mockProfile = null;
    }
  }

  /**
   * Get the note embedding service (for testing)
   */
  getNoteEmbeddingService(): { generateEmbedding: ReturnType<typeof mock> } {
    return {
      generateEmbedding: mock(async () => {
        if (this.embeddingError) {
          return null;
        }
        return Array.from({ length: 128 }, () => Math.random());
      }),
    };
  }

  /**
   * Configure error simulation
   */
  setErrorSimulation(options: { embedding?: boolean; save?: boolean }): void {
    if (options.embedding !== undefined) {
      this.embeddingError = options.embedding;
    }

    if (options.save !== undefined) {
      this.saveError = options.save;
    }
  }

  /**
   * Set the ready state (for testing)
   */
  setReadyState(ready: boolean): void {
    this.readyState = ready;
  }
}

export default MockProfileContextV2;