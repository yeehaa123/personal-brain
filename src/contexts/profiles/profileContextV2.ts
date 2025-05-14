import { BaseContext } from '@/contexts/baseContext';
import type { FormatterInterface } from '@/contexts/formatterInterface';
import { NoteContext } from '@/contexts/notes/noteContext';
import { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import type { StorageInterface } from '@/contexts/storageInterface';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { LinkedInProfileMigrationAdapter } from '@/services/profiles/linkedInProfileMigrationAdapter';
import { Logger } from '@/utils/logger';

/**
 * Configuration options for ProfileContext
 */
export interface ProfileContextConfig {
  name?: string;
  version?: string;
}

/**
 * Dependencies for ProfileContextV2
 */
export interface ProfileContextDependencies {
  noteContext?: NoteContext;
  profileNoteAdapter?: ProfileNoteAdapter;
  profileMigrationAdapter?: LinkedInProfileMigrationAdapter;
  logger?: Logger;
}

/**
 * Simplified ProfileContext implementation using note-based storage
 * 
 * This version represents a significant simplification from the previous implementation,
 * focusing on a single profile per user and using note-based storage.
 */
export class ProfileContextV2 extends BaseContext {
  private static instance: ProfileContextV2 | null = null;
  private noteContext: NoteContext;
  private profileNoteAdapter: ProfileNoteAdapter;
  private profileMigrationAdapter: LinkedInProfileMigrationAdapter;
  protected override logger: Logger;
  
  private constructor(
    options?: Partial<ProfileContextConfig>,
    dependencies?: ProfileContextDependencies,
  ) {
    super(options || {});
    
    // Use provided dependencies or get default instances
    this.noteContext = dependencies?.noteContext || NoteContext.getInstance();
    this.profileNoteAdapter = dependencies?.profileNoteAdapter || ProfileNoteAdapter.getInstance();
    this.profileMigrationAdapter = dependencies?.profileMigrationAdapter || LinkedInProfileMigrationAdapter.getInstance();
    this.logger = dependencies?.logger || Logger.getInstance();
    
    this.readyState = true;
  }
  
  /**
   * Get the singleton instance
   */
  public static override getInstance(
    options?: Partial<ProfileContextConfig>,
    dependencies?: ProfileContextDependencies,
  ): ProfileContextV2 {
    if (!ProfileContextV2.instance) {
      ProfileContextV2.instance = new ProfileContextV2(options, dependencies);
    }
    return ProfileContextV2.instance;
  }
  
  /**
   * Reset the singleton instance (for testing)
   */
  public static override resetInstance(): void {
    ProfileContextV2.instance = null;
  }
  
  /**
   * Create a fresh instance (for testing)
   */
  public static override createFresh(
    options?: Partial<ProfileContextConfig>,
    dependencies?: ProfileContextDependencies,
  ): ProfileContextV2 {
    return new ProfileContextV2(options, dependencies);
  }

  /**
   * Get the context name
   */
  override getContextName(): string {
    return (this.config['name'] as string) || 'ProfileBrain';
  }

  /**
   * Get the context version
   */
  override getContextVersion(): string {
    return (this.config['version'] as string) || '2.0.0';
  }
  
  /**
   * Get the storage implementation
   * Required abstract method from BaseContext
   */
  override getStorage(): StorageInterface<unknown, unknown> {
    // We're using a storage adapter that delegates to the note context
    return {
      create: async (item: Partial<unknown>) => {
        if (typeof item === 'object' && item !== null) {
          const success = await this.saveProfile(item as Profile);
          return success ? ProfileNoteAdapter.PROFILE_NOTE_ID : '';
        }
        return '';
      },
      
      read: async (id: unknown) => {
        if (id === ProfileNoteAdapter.PROFILE_NOTE_ID) {
          return await this.getProfile();
        }
        return null;
      },
      
      update: async (id: unknown, updates: Partial<unknown>) => {
        if (id === ProfileNoteAdapter.PROFILE_NOTE_ID && typeof updates === 'object' && updates !== null) {
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
   * Required abstract method from BaseContext
   */
  override getFormatter(): FormatterInterface<unknown, unknown> {
    // Simple pass-through formatter
    return {
      format: (data: unknown) => data,
    };
  }
  
  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    try {
      return await this.profileNoteAdapter.getProfile();
    } catch (error) {
      this.logger.error('Failed to retrieve profile', { error, context: 'ProfileContextV2' });
      return null;
    }
  }
  
  /**
   * Save the user profile
   */
  async saveProfile(profile: Profile): Promise<boolean> {
    try {
      return await this.profileNoteAdapter.saveProfile(profile);
    } catch (error) {
      this.logger.error('Failed to save profile', { error, context: 'ProfileContextV2' });
      return false;
    }
  }
  
  /**
   * Update the user profile (partial update)
   */
  async updateProfile(data: Partial<Profile>): Promise<boolean> {
    try {
      const currentProfile = await this.getProfile();
      if (!currentProfile) return false;
      
      return this.saveProfile({
        ...currentProfile,
        ...data,
      });
    } catch (error) {
      this.logger.error('Failed to update profile', { error, context: 'ProfileContextV2' });
      return false;
    }
  }
  
  /**
   * Get profile as a note (for interoperability)
   */
  async getProfileAsNote(): Promise<Note | null> {
    try {
      const note = await this.noteContext.getNoteById(ProfileNoteAdapter.PROFILE_NOTE_ID);
      return note || null;
    } catch (error) {
      this.logger.error('Failed to get profile as note', { error, context: 'ProfileContextV2' });
      return null;
    }
  }
  
  /**
   * Migrate a LinkedIn profile to our new format
   */
  async migrateLinkedInProfile(linkedInProfile: LinkedInProfile): Promise<boolean> {
    try {
      this.logger.debug('Starting LinkedIn profile migration', { context: 'ProfileContextV2' });
      
      this.logger.debug('Converting LinkedIn profile to standard format', { context: 'ProfileContextV2' });
      const profile = this.profileMigrationAdapter.convertToProfile(linkedInProfile);
      
      this.logger.debug('Converted profile, attempting to save', { context: 'ProfileContextV2' });
      const result = await this.saveProfile(profile);
      
      this.logger.debug(`Profile saved result: ${result}`, { context: 'ProfileContextV2' });
      return result;
    } catch (error) {
      this.logger.error('Failed to migrate LinkedIn profile', { error, context: 'ProfileContextV2' });
      return false;
    }
  }
  
  /**
   * For backward compatibility with old code
   */
  async getActiveProfile(): Promise<Profile | null> {
    return this.getProfile();
  }

  /**
   * Initialize MCP components
   */
  protected override initializeMcpComponents(): void {
    // Register profile resource
    this.resources.push({
      protocol: 'profile',
      path: 'get',
      handler: async () => {
        const profile = await this.getProfile();
        return { profile };
      },
      name: 'Get Profile',
      description: 'Retrieve the user profile',
    });

    // Register profile update tool
    this.tools.push({
      protocol: 'profile',
      path: 'update',
      handler: async (params: Record<string, unknown>) => {
        const profileData = params['profile'] as Partial<Profile>;
        if (!profileData) {
          throw new Error('Profile data is required');
        }

        const existingProfile = await this.getProfile();
        let result;

        if (existingProfile) {
          await this.updateProfile(profileData);
          result = { success: true, action: 'updated' };
        } else {
          // Add required display name field if it doesn't exist
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
      description: 'Update or create the user profile',
    });

    // Register LinkedInProfile migration tool
    this.tools.push({
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
    });
  }
}