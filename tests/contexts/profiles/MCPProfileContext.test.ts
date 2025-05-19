import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { MCPNoteContext } from '@/contexts/notes';
import type { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import type { ProfileFormatter } from '@/contexts/profiles/formatters/profileFormatter';
import type { MCPProfileContextDependencies } from '@/contexts/profiles/MCPProfileContext';
import { MCPProfileContext } from '@/contexts/profiles/MCPProfileContext';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { LinkedInProfileMigrationAdapter } from '@/services/profiles/linkedInProfileMigrationAdapter';
import { Logger } from '@/utils/logger';
import { MockMCPNoteContext } from '@test/__mocks__/contexts/notes/MCPNoteContext';
import { MockProfileNoteAdapter } from '@test/__mocks__/contexts/profiles/adapters/profileNoteAdapter';
import { MockProfileFormatter } from '@test/__mocks__/contexts/profiles/formatters/profileFormatter';
import { MockLinkedInProfileMigrationAdapter } from '@test/__mocks__/services/profiles/linkedInProfileMigrationAdapter';
// MockTagExtractor no longer needed after architecture simplification

describe('MCPProfileContext', () => {
  // Sample data for testing
  const mockProfile: Profile = {
    id: 'test-profile-id',
    displayName: 'Test User',
    email: 'test@example.com',
    headline: 'Software Engineer',
    summary: 'Experienced developer',
    skills: ['JavaScript', 'TypeScript'],
    tags: ['tech', 'engineering'],
  };

  const mockLinkedInProfile: LinkedInProfile = {
    id: 'linkedin-profile-id',
    vanityName: 'testuser',
    localizedHeadline: 'Software Engineer',
    localizedFirstName: 'Test',
    localizedLastName: 'User',
    profilePicture: {
      displayImage: 'https://example.com/image.jpg',
    },
    summary: 'Experienced developer',
    industryName: 'Technology',
  } as unknown as LinkedInProfile;

  const mockNote: Note = {
    id: MockProfileNoteAdapter.PROFILE_NOTE_ID,
    title: 'Profile: Test User',
    content: 'Profile content',
    tags: ['profile'],
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'profile',
    embedding: null,
    conversationMetadata: null,
    confidence: null,
    verified: null,
  };

  // Test dependencies
  let mockNoteContext: MockMCPNoteContext;
  let mockProfileNoteAdapter: MockProfileNoteAdapter;
  let mockProfileMigrationAdapter: MockLinkedInProfileMigrationAdapter;
  let mockProfileFormatter: ProfileFormatter;
  let logger: Logger;

  // Helper to create testable context
  const createTestableProfileContext = (
    config = {},
    overrides?: Partial<MCPProfileContextDependencies>,
  ) => {
    const dependencies: MCPProfileContextDependencies = {
      noteContext: mockNoteContext as unknown as MCPNoteContext,
      profileNoteAdapter: mockProfileNoteAdapter as unknown as ProfileNoteAdapter,
      profileMigrationAdapter: mockProfileMigrationAdapter as unknown as LinkedInProfileMigrationAdapter,
      logger,
      profileFormatter: overrides?.profileFormatter || mockProfileFormatter,
      ...overrides,
    };

    const context = MCPProfileContext.createFresh(config, dependencies);

    return {
      context,
      mocks: {
        noteContext: mockNoteContext,
        profileNoteAdapter: mockProfileNoteAdapter,
        profileMigrationAdapter: mockProfileMigrationAdapter,
        profileFormatter: mockProfileFormatter,
        logger,
      },
    };
  };

  beforeEach(() => {
    // Reset singletons before each test
    MCPProfileContext.resetInstance();
    MockMCPNoteContext.resetInstance();
    MockProfileNoteAdapter.resetInstance();
    MockLinkedInProfileMigrationAdapter.resetInstance();
    MockProfileFormatter.resetInstance();
    // Create fresh instances
    mockNoteContext = MockMCPNoteContext.createFresh();
    mockProfileNoteAdapter = MockProfileNoteAdapter.createFresh();
    mockProfileMigrationAdapter = MockLinkedInProfileMigrationAdapter.createFresh();
    mockProfileFormatter = MockProfileFormatter.createFresh();
    logger = Logger.getInstance();

    // Mock the logger methods properly for Bun
    spyOn(logger, 'error').mockImplementation(() => {});
    spyOn(logger, 'debug').mockImplementation(() => {});
    spyOn(logger, 'warn').mockImplementation(() => {});
  });

  describe('System Integration', () => {
    test('follows Component Interface Standardization pattern', () => {
      expect(MCPProfileContext.getInstance).toBeDefined();
      expect(MCPProfileContext.resetInstance).toBeDefined();
      expect(MCPProfileContext.createFresh).toBeDefined();
    });

    test('implements MCPContext interface', () => {
      const { context } = createTestableProfileContext();

      // Core MCPContext methods
      expect(context.getContextName).toBeDefined();
      expect(context.getContextVersion).toBeDefined();
      expect(context.initialize).toBeDefined();
      expect(context.isReady).toBeDefined();
      expect(context.getStatus).toBeDefined();
      expect(context.getStorage).toBeDefined();
      expect(context.getFormatter).toBeDefined();
      expect(context.registerOnServer).toBeDefined();
      expect(context.getMcpServer).toBeDefined();
      expect(context.getCapabilities).toBeDefined();
      expect(context.cleanup).toBeDefined();
    });
  });

  describe('Context Initialization', () => {
    test('initializes with default configuration', async () => {
      const { context } = createTestableProfileContext();

      const result = await context.initialize();
      expect(result).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('initializes with custom configuration', async () => {
      const customConfig = {
        name: 'CustomProfileBrain',
        version: '3.0.0',
      };

      const { context } = createTestableProfileContext(customConfig);

      await context.initialize();
      expect(context.getContextName()).toBe('CustomProfileBrain');
      expect(context.getContextVersion()).toBe('3.0.0');
    });

    test('handles initialization errors gracefully', async () => {
      const { context, mocks } = createTestableProfileContext();

      // Force an error during initialization by spying on setupResources
      const spy = spyOn(context as unknown as { setupResources: () => void }, 'setupResources').mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const result = await context.initialize();
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalled();
      expect(mocks.logger.error).toHaveBeenCalledWith(
        'Failed to initialize MCPProfileContext',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe('Profile Operations', () => {
    test('retrieves existing profile', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const profile = await context.getProfile();
      expect(profile).toEqual(mockProfile);
    });

    test('handles profile retrieval errors', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Spy on getProfile to throw an error
      const spy = spyOn(mocks.profileNoteAdapter, 'getProfile').mockRejectedValue(
        new Error('Failed to get profile'),
      );

      const profile = await context.getProfile();
      expect(profile).toBeNull();
      expect(spy).toHaveBeenCalled();
      expect(mocks.logger.error).toHaveBeenCalledWith(
        'Failed to retrieve profile',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    test('saves new profile', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      const result = await context.saveProfile(mockProfile);
      expect(result).toBe(true);

      // Verify the profile was saved
      const savedProfile = await mocks.profileNoteAdapter.getProfile();
      expect(savedProfile).toEqual(mockProfile);
    });

    test('updates existing profile', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const updates = { headline: 'Senior Software Engineer' };
      const result = await context.updateProfile(updates);

      expect(result).toBe(true);

      const updatedProfile = await mocks.profileNoteAdapter.getProfile();
      expect(updatedProfile).toEqual({
        ...mockProfile,
        ...updates,
      });
    });

    test('returns false when updating non-existent profile', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const updates = { headline: 'Senior Software Engineer' };
      const result = await context.updateProfile(updates);

      expect(result).toBe(false);
    });
  });

  describe('LinkedIn Profile Migration', () => {
    test('migrates LinkedIn profile successfully', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Set the conversion function
      mocks.profileMigrationAdapter.setMockConvertFn(() => mockProfile);

      const result = await context.migrateLinkedInProfile(mockLinkedInProfile);

      expect(result).toBe(true);

      // Verify the profile was saved
      const savedProfile = await mocks.profileNoteAdapter.getProfile();
      expect(savedProfile).toEqual(mockProfile);
    });

    test('handles migration errors gracefully', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Set the conversion function to throw an error
      mocks.profileMigrationAdapter.setMockConvertFn(() => {
        throw new Error('Migration failed');
      });

      const result = await context.migrateLinkedInProfile(mockLinkedInProfile);

      expect(result).toBe(false);
      expect(mocks.logger.error).toHaveBeenCalledWith(
        'Failed to migrate LinkedIn profile',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe('Note Interoperability', () => {
    test('retrieves profile as note', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Set up the mock note in the storage with the correct ID
      const profileNote = { ...mockNote, id: MockProfileNoteAdapter.PROFILE_NOTE_ID };
      
      // Use the mock's public addMockNote method
      mocks.noteContext.addMockNote(profileNote);
      
      // Override getNoteById to ensure it returns the right note
      mocks.noteContext.getNoteById = async (id: string) => {
        return id === MockProfileNoteAdapter.PROFILE_NOTE_ID ? profileNote : undefined;
      };

      const note = await context.getProfileAsNote();
      expect(note?.id).toBe(MockProfileNoteAdapter.PROFILE_NOTE_ID);
      expect(note?.title).toBe('Profile: Test User');
    });

    test('returns null when profile note does not exist', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const note = await context.getProfileAsNote();
      expect(note).toBeNull();
    });
  });

  describe('Storage Interface', () => {
    test('implements MCPStorageInterface', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const storage = context.getStorage();

      expect(storage.create).toBeDefined();
      expect(storage.read).toBeDefined();
      expect(storage.update).toBeDefined();
      expect(storage.delete).toBeDefined();
      expect(storage.search).toBeDefined();
      expect(storage.list).toBeDefined();
      expect(storage.count).toBeDefined();
    });

    test('storage create delegates to saveProfile', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const storage = context.getStorage();
      const result = await storage.create(mockProfile);

      expect(result).toBe(MockProfileNoteAdapter.PROFILE_NOTE_ID);
    });

    test('storage read delegates to getProfile', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const storage = context.getStorage();
      const result = await storage.read(MockProfileNoteAdapter.PROFILE_NOTE_ID);

      expect(result).toEqual(mockProfile);
    });
  });

  describe('Formatter Interface', () => {
    test('implements MCPFormatterInterface', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const formatter = context.getFormatter();
      expect(formatter.format).toBeDefined();
    });

    test('formatter uses ProfileFormatter by default', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const formatter = context.getFormatter();
      const result = formatter.format(mockProfile);

      // ProfileFormatter returns formatted markdown string
      expect(typeof result).toBe('string');
      expect(result).toContain('Test User');
      expect(result).toContain('Software Engineer');
    });
  });

  describe('MCP Resources and Tools', () => {
    test('provides profile resource', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const capabilities = context.getCapabilities();
      expect(capabilities.resources).toHaveLength(1);

      const profileResource = capabilities.resources[0];
      expect(profileResource.protocol).toBe('profile');
      expect(profileResource.path).toBe('/profile');

      // Test the handler
      const result = await profileResource.handler({});
      expect(result).toEqual({ profile: mockProfile });
    });

    test('provides profile update tool', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const capabilities = context.getCapabilities();
      expect(capabilities.tools).toHaveLength(2);

      const updateTool = capabilities.tools[0];
      expect(updateTool.protocol).toBe('profile');
      expect(updateTool.path).toBe('/profile/update');

      // Test the handler - updating existing profile
      const updateResult = await updateTool.handler({ profile: { headline: 'New Headline' } });
      expect(updateResult).toEqual({ success: true, action: 'updated' });
    });

    test('provides LinkedIn migration tool', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      mocks.profileMigrationAdapter.setMockConvertFn(() => mockProfile);

      const capabilities = context.getCapabilities();
      const migrationTool = capabilities.tools[1];

      expect(migrationTool.protocol).toBe('profile');
      expect(migrationTool.path).toBe('/profile/migrate-linkedin');

      // Test the handler
      const result = await migrationTool.handler({ linkedInProfile: mockLinkedInProfile });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const instance1 = MCPProfileContext.getInstance();
      const instance2 = MCPProfileContext.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('resetInstance clears singleton', () => {
      const instance1 = MCPProfileContext.getInstance();
      MCPProfileContext.resetInstance();
      const instance2 = MCPProfileContext.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    test('createFresh creates new instance', () => {
      const instance1 = MCPProfileContext.getInstance();
      const instance2 = createTestableProfileContext({}).context;

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Status and Capabilities', () => {
    test('reports context status', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const status = context.getStatus();

      expect(status.name).toBe('ProfileBrain');
      expect(status.version).toBe('2.0.0');
      expect(status.ready).toBe(true);
      expect(status['resourceCount']).toBe(1);
      expect(status['toolCount']).toBe(2);
    });

    test('reports context capabilities', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const capabilities = context.getCapabilities();

      expect(capabilities.resources).toHaveLength(1);
      expect(capabilities.tools).toHaveLength(2);
      expect(capabilities.features).toEqual([]);
    });
  });
});