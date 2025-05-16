import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import { ProfileFormatter } from '@/contexts/profiles/formatters/profileFormatter';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { LinkedInProfileMigrationAdapter } from '@/services/profiles/linkedInProfileMigrationAdapter';
import { Logger } from '@/utils/logger';
import { TagExtractor } from '@/utils/tagExtractor';

import type {
  ContextCapabilities,
  ContextStatus,
  MCPContext,
  MCPFormatterInterface,
  MCPStorageInterface,
  ResourceDefinition,
} from '../MCPContext';
import { createContextFunctionality } from '../MCPContext';
import { NoteContext } from '../notes/noteContext';

/**
 * Configuration for MCPProfileContext
 */
export interface MCPProfileContextConfig {
  name?: string;
  version?: string;
}

/**
 * Dependencies for MCPProfileContext
 */
export interface MCPProfileContextDependencies {
  noteContext?: NoteContext;
  profileNoteAdapter?: ProfileNoteAdapter;
  profileMigrationAdapter?: LinkedInProfileMigrationAdapter;
  profileFormatter?: ProfileFormatter;
  tagExtractor?: TagExtractor;
  logger?: Logger;
}

/**
 * MCPProfileContext - Simplified profile context implementation
 * 
 * This implementation follows the new MCPContext pattern, eliminating BaseContext
 * and implementing functionality directly.
 */
export class MCPProfileContext implements MCPContext {
  // Singleton pattern
  private static instance: MCPProfileContext | null = null;
  
  // Core components
  private readonly contextFuncs: ReturnType<typeof createContextFunctionality>;
  private readonly noteContext: NoteContext;
  private readonly profileNoteAdapter: ProfileNoteAdapter;
  private readonly profileMigrationAdapter: LinkedInProfileMigrationAdapter;
  private readonly profileFormatter: ProfileFormatter;
  private readonly tagExtractor: TagExtractor;
  private readonly logger: Logger;
  
  // MCP resources and tools
  private resources: ResourceDefinition[] = [];
  private tools: ResourceDefinition[] = [];
  
  /**
   * Get the singleton instance
   */
  public static getInstance(
    config?: MCPProfileContextConfig,
    dependencies?: MCPProfileContextDependencies,
  ): MCPProfileContext {
    if (!MCPProfileContext.instance) {
      MCPProfileContext.instance = new MCPProfileContext(config || {}, dependencies);
    }
    return MCPProfileContext.instance;
  }
  
  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    MCPProfileContext.instance = null;
  }
  
  /**
   * Create a fresh instance (for testing)
   */
  public static createFresh(
    config?: MCPProfileContextConfig,
    dependencies?: MCPProfileContextDependencies,
  ): MCPProfileContext {
    return new MCPProfileContext(config || {}, dependencies);
  }
  
  private constructor(
    config: MCPProfileContextConfig,
    dependencies?: MCPProfileContextDependencies,
  ) {
    // Initialize dependencies
    this.logger = dependencies?.logger || Logger.getInstance();
    this.noteContext = dependencies?.noteContext || NoteContext.getInstance();
    this.tagExtractor = dependencies?.tagExtractor || TagExtractor.getInstance();
    
    // Initialize adapters and formatter
    this.profileNoteAdapter = dependencies?.profileNoteAdapter || ProfileNoteAdapter.getInstance({
      noteContext: this.noteContext,
      tagExtractor: this.tagExtractor,
    });
    this.profileMigrationAdapter = dependencies?.profileMigrationAdapter || LinkedInProfileMigrationAdapter.getInstance();
    this.profileFormatter = dependencies?.profileFormatter || ProfileFormatter.getInstance();
    
    // Create core context functionality
    this.contextFuncs = createContextFunctionality({
      name: config.name || 'ProfileBrain',
      version: config.version || '2.0.0',
      logger: this.logger,
    });
  }
  
  // MCPContext interface implementation
  
  async initialize(): Promise<boolean> {
    try {
      // Setup MCP resources and tools
      this.setupResources();
      this.setupTools();
      
      // Initialize base functionality
      const result = await this.contextFuncs.initialize();
      
      return result;
    } catch (error) {
      this.logger.error('Failed to initialize MCPProfileContext', { error });
      return false;
    }
  }
  
  getContextName(): string {
    return this.contextFuncs.getContextName();
  }
  
  getContextVersion(): string {
    return this.contextFuncs.getContextVersion();
  }
  
  isReady(): boolean {
    return this.contextFuncs.isReady();
  }
  
  getStatus(): ContextStatus {
    return {
      ...this.contextFuncs.getStatus(),
      resourceCount: this.resources.length,
      toolCount: this.tools.length,
    };
  }
  
  getStorage(): MCPStorageInterface {
    // Return a storage adapter that delegates to profile operations
    return {
      create: async (item: Record<string, unknown>) => {
        const success = await this.saveProfile(item as Profile);
        return success ? ProfileNoteAdapter.PROFILE_NOTE_ID : '';
      },
      
      read: async (id: string) => {
        if (id === ProfileNoteAdapter.PROFILE_NOTE_ID) {
          const profile = await this.getProfile();
          return profile as Record<string, unknown> | null;
        }
        return null;
      },
      
      update: async (id: string, updates: Record<string, unknown>) => {
        if (id === ProfileNoteAdapter.PROFILE_NOTE_ID) {
          return await this.updateProfile(updates as Partial<Profile>);
        }
        return false;
      },
      
      delete: async () => false, // Not implemented for profiles
      
      search: async () => {
        const profile = await this.getProfile();
        return profile ? [profile as Record<string, unknown>] : [];
      },
      
      list: async () => {
        const profile = await this.getProfile();
        return profile ? [profile as Record<string, unknown>] : [];
      },
      
      count: async () => {
        const profile = await this.getProfile();
        return profile ? 1 : 0;
      },
    };
  }
  
  getFormatter(): MCPFormatterInterface {
    return {
      format: (data: unknown, options?: Record<string, unknown>) => {
        return this.profileFormatter.format(data as Profile, options);
      },
    };
  }
  
  registerOnServer(server: McpServer): boolean {
    // Add our resources and tools to the context functionality
    this.contextFuncs.resources.length = 0;
    this.contextFuncs.resources.push(...this.resources);
    this.contextFuncs.tools.length = 0;
    this.contextFuncs.tools.push(...this.tools);
    
    // Register using the context functionality
    return this.contextFuncs.registerOnServer(server);
  }
  
  getMcpServer(): McpServer {
    return this.contextFuncs.getMcpServer();
  }
  
  getCapabilities(): ContextCapabilities {
    return {
      resources: [...this.resources],
      tools: [...this.tools],
      features: [],
    };
  }
  
  async cleanup(): Promise<void> {
    await this.contextFuncs.cleanup();
  }
  
  // Setup methods
  
  private setupResources(): void {
    this.resources = [
      {
        protocol: 'profile',
        path: '/profile',
        name: 'profile',
        description: 'Access user profile data',
        handler: async () => {
          const profile = await this.getProfile();
          return { profile };
        },
      },
    ];
  }
  
  private setupTools(): void {
    this.tools = [
      {
        protocol: 'profile',
        path: '/profile/update',
        name: 'update-profile',
        description: 'Update or create the user profile',
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
      },
      {
        protocol: 'profile',
        path: '/profile/migrate-linkedin',
        name: 'migrate-linkedin-profile',
        description: 'Migrate a LinkedIn profile to the new format',
        handler: async (params: Record<string, unknown>) => {
          const linkedInProfileData = params['linkedInProfile'] as LinkedInProfile;
          if (!linkedInProfileData) {
            throw new Error('LinkedIn profile data is required');
          }
          
          const success = await this.migrateLinkedInProfile(linkedInProfileData);
          return { success };
        },
      },
    ];
  }
  
  // Profile-specific methods
  
  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    try {
      return await this.profileNoteAdapter.getProfile();
    } catch (error) {
      this.logger.error('Failed to retrieve profile', { error, context: 'MCPProfileContext' });
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
      this.logger.error('Failed to save profile', { error, context: 'MCPProfileContext' });
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
      this.logger.error('Failed to update profile', { error, context: 'MCPProfileContext' });
      return false;
    }
  }
  
  /**
   * Migrate a LinkedIn profile to our new format
   */
  async migrateLinkedInProfile(linkedInProfile: LinkedInProfile): Promise<boolean> {
    try {
      this.logger.debug('Starting LinkedIn profile migration', { context: 'MCPProfileContext' });
      
      this.logger.debug('Converting LinkedIn profile to standard format', { context: 'MCPProfileContext' });
      const profile = this.profileMigrationAdapter.convertToProfile(linkedInProfile);
      
      this.logger.debug('Converted profile, attempting to save', { context: 'MCPProfileContext' });
      const result = await this.saveProfile(profile);
      
      this.logger.debug(`Profile saved result: ${result}`, { context: 'MCPProfileContext' });
      return result;
    } catch (error) {
      this.logger.error('Failed to migrate LinkedIn profile', { error, context: 'MCPProfileContext' });
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
      this.logger.error('Failed to get profile as note', { error, context: 'MCPProfileContext' });
      return null;
    }
  }
  
  /**
   * For backward compatibility with old code
   */
  async getActiveProfile(): Promise<Profile | null> {
    return this.getProfile();
  }
}