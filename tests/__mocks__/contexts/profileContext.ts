/**
 * ProfileContext mock implementation
 * 
 * Provides a standardized mock for the ProfileContext class.
 */

import { mock } from 'bun:test';

import type { NoteContext } from '@/contexts';
import type { ProfileStorageAdapter } from '@/contexts/profiles/profileStorageAdapter';
import type { NoteWithSimilarity } from '@/contexts/profiles/profileTypes';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { ProfileEmbeddingService, ProfileSearchService, ProfileTagService } from '@/services/profiles';
import {
  MockProfileEmbeddingService,
} from '@test/__mocks__/services/profiles/profileEmbeddingService';
import {
  MockProfileSearchService,
} from '@test/__mocks__/services/profiles/profileSearchService';
import {
  MockProfileTagService,
} from '@test/__mocks__/services/profiles/profileTagService';

import { MockBaseContext } from './baseContext';
import { MockProfileStorageAdapter } from './profileStorageAdapter';

/**
 * Mock implementation for the ProfileContext
 */
export class MockProfileContext extends MockBaseContext {
  private static instance: MockProfileContext | null = null;

  // Mock services and dependencies
  public storageAdapter: ProfileStorageAdapter;
  public embeddingService: ProfileEmbeddingService;
  public tagService: ProfileTagService;
  public searchService: ProfileSearchService;

  // Mock note context reference
  protected noteContext: {
    searchNotes: (params: Record<string, unknown>) => Promise<Note[]>;
    searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<NoteWithSimilarity[]>;
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
   * Factory method that creates a new instance with dependencies
   * @param config Configuration options or dependencies
   * @returns A new MockProfileContext instance
   */
  public static createWithDependencies(config: Record<string, unknown> = {}): MockProfileContext {
    // Handle the case where storage or services are provided as dependencies
    const storage = config['storage'] as ProfileStorageAdapter;
    const embeddingService = config['embeddingService'] as ProfileEmbeddingService;
    const tagService = config['tagService'] as ProfileTagService;
    const searchService = config['searchService'] as ProfileSearchService;

    // Create a new instance with the base config
    const instance = new MockProfileContext(config);

    // Set provided dependencies if available
    if (storage) {
      instance.storageAdapter = storage;
    }

    if (embeddingService) {
      instance.embeddingService = embeddingService;
    }

    if (tagService) {
      instance.tagService = tagService;
    }

    if (searchService) {
      instance.searchService = searchService;
    }

    return instance;
  }

  /**
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    super({
      name: config['name'] || 'ProfileBrain',
      version: config['version'] || '1.0.0',
    });

    // Initialize mock services
    this.storageAdapter = MockProfileStorageAdapter.createFresh();
    this.embeddingService = MockProfileEmbeddingService.createFresh();
    this.tagService = MockProfileTagService.createFresh();
    this.searchService = MockProfileSearchService.createFresh();

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
  override getStorage(): ProfileStorageAdapter {
    return this.storageAdapter as unknown as ProfileStorageAdapter;
  }

  /**
   * Set a new storage adapter
   */
  setStorage(storage: ProfileStorageAdapter): void {
    this.storageAdapter = storage as unknown as ProfileStorageAdapter;
  }

  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    const profile = await this.storageAdapter.getProfile();
    return profile || null;
  }

  /**
   * Create a new profile
   */
  async saveProfile(profile: Partial<Profile> & { fullName: string }): Promise<string> {
    // Generate profile text for embedding and tagging
    const profileText = this.embeddingService.getProfileTextForEmbedding(profile);

    // Generate embedding and tags
    const embedding = await this.embeddingService.generateEmbedding(profileText);
    const tags = await this.tagService.generateProfileTags(profileText);

    // Create profile with embedding and tags
    const profileWithData = {
      ...profile,
      embedding,
      tags,
    } as Partial<Profile>;

    return this.storageAdapter.create(profileWithData);
  }

  /**
   * Update the profile
   */
  async updateProfile(profileData: Partial<Profile>): Promise<void> {
    const profile = await this.getProfile();

    // For testing purposes, if no profile exists we'll create one first
    if (!profile) {
      await this.saveProfile({
        ...profileData,
        fullName: profileData.fullName || 'Test User',
      });
      return; // Profile saved, nothing else to do
    }

    // Check if we need to regenerate embedding
    if (this.embeddingService.shouldRegenerateEmbedding(profileData)) {
      const updatedProfile = { ...profile, ...profileData };
      const profileText = this.embeddingService.getProfileTextForEmbedding(updatedProfile);
      const embedding = await this.embeddingService.generateEmbedding(profileText);

      if (embedding) {
        profileData.embedding = embedding;
      }
    }

    // Update the profile
    await this.storageAdapter.update(profile.id, profileData);
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
  extractProfileKeywords(profile: Partial<Profile>): string[] {
    return this.tagService.extractProfileKeywords(profile);
  }

  /**
   * Find notes related to the profile using tags or embeddings
   */
  async findRelatedNotes(limit = 5): Promise<NoteWithSimilarity[]> {
    const relatedNotes = await this.searchService.findRelatedNotes(limit);
    // Ensure embedding is never undefined
    return relatedNotes.map(note => ({
      ...note,
      embedding: note.embedding ?? null,
    }));
  }

  /**
   * Find notes that have similar tags to the profile
   */
  async findNotesWithSimilarTags(
    profileTags: string[],
    limit = 5,
  ): Promise<NoteWithSimilarity[]> {
    const notes = await this.searchService.findNotesWithSimilarTags(profileTags, limit);
    // Ensure embedding is never undefined
    return notes.map(note => ({
      ...note,
      embedding: note.embedding ?? null,
    }));
  }

  /**
   * Generate or update embeddings for the profile
   */
  async generateEmbeddingForProfile(): Promise<{ updated: boolean }> {
    return this.embeddingService.generateEmbeddingForProfile();
  }

  /**
   * Update or generate tags for an existing profile
   */
  async updateProfileTags(forceRegenerate = false): Promise<string[] | null> {
    return this.tagService.updateProfileTags(forceRegenerate);
  }

  /**
   * Instance method that delegates to static createWithDependencies
   * Required for FullContextInterface compatibility
   * @param dependencies Dependencies for the context
   * @returns A new instance with provided dependencies
   */
  override createWithDependencies(dependencies: Record<string, unknown>): MockProfileContext {
    return MockProfileContext.createWithDependencies(dependencies);
  }
}
