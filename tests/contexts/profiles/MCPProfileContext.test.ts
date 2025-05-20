/**
 * Tests for MCPProfileContext
 * 
 * These tests focus purely on behavior rather than implementation details.
 * The goal is to verify WHAT the context does, not HOW it does it.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, test } from 'bun:test';


import type { MCPNoteContext } from '@/contexts/notes';
import type { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
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

// Test data
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

// Helper to create testable context
function createTestableProfileContext(
  config = {},
  overrides?: Partial<MCPProfileContextDependencies>,
) {
  const mockNoteContext = MockMCPNoteContext.createFresh();
  const mockProfileNoteAdapter = MockProfileNoteAdapter.createFresh();
  const mockProfileMigrationAdapter = MockLinkedInProfileMigrationAdapter.createFresh();
  const mockProfileFormatter = MockProfileFormatter.createFresh();
  const logger = Logger.getInstance();

  const dependencies: MCPProfileContextDependencies = {
    noteContext: mockNoteContext as unknown as MCPNoteContext,
    profileNoteAdapter: mockProfileNoteAdapter as unknown as ProfileNoteAdapter,
    profileMigrationAdapter: mockProfileMigrationAdapter as unknown as LinkedInProfileMigrationAdapter,
    logger,
    profileFormatter: mockProfileFormatter,
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
}

describe('Profile Management System', () => {
  beforeEach(() => {
    MCPProfileContext.resetInstance();
  });

  describe('System Initialization', () => {
    test('initializes and reports readiness', async () => {
      const { context } = createTestableProfileContext();

      expect(context.isReady()).toBe(false);

      const result = await context.initialize();
      expect(result).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('provides system information', async () => {
      const { context } = createTestableProfileContext({
        name: 'CustomProfileBrain',
        version: '3.0.0',
      });

      await context.initialize();

      expect(context.getContextName()).toBe('CustomProfileBrain');
      expect(context.getContextVersion()).toBe('3.0.0');

      const status = context.getStatus();
      expect(status.name).toBe('CustomProfileBrain');
      expect(status.version).toBe('3.0.0');
      expect(status.ready).toBe(true);
    });
  });

  describe('Profile Management', () => {
    test('retrieves profile when it exists', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const profile = await context.getProfile();
      expect(profile).toEqual(mockProfile);
    });

    test('returns null when no profile exists', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const profile = await context.getProfile();
      expect(profile).toBeNull();
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

      // Create initial profile
      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      // Update profile
      const updates = { headline: 'Senior Software Engineer' };
      const result = await context.updateProfile(updates);
      expect(result).toBe(true);

      // Verify update
      const updatedProfile = await mocks.profileNoteAdapter.getProfile();
      expect(updatedProfile).toEqual({
        ...mockProfile,
        ...updates,
      });
    });

    test('fails to update when no profile exists', async () => {
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

      // Configure migration behavior
      mocks.profileMigrationAdapter.setMockConvertFn(() => mockProfile);

      const result = await context.migrateLinkedInProfile(mockLinkedInProfile);
      expect(result).toBe(true);

      // Verify profile was created
      const savedProfile = await mocks.profileNoteAdapter.getProfile();
      expect(savedProfile).toEqual(mockProfile);
    });

    test('handles migration failures gracefully', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Configure migration to fail
      mocks.profileMigrationAdapter.setMockConvertFn(() => {
        throw new Error('Migration failed');
      });

      const result = await context.migrateLinkedInProfile(mockLinkedInProfile);
      expect(result).toBe(false);
    });
  });

  describe('Note Integration', () => {
    test('retrieves profile as note when it exists', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Set up profile note
      const profileNote: Note = {
        id: MockProfileNoteAdapter.PROFILE_NOTE_ID,
        title: 'Profile: Test User',
        content: 'Profile content',
        tags: ['profile'],
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'profile',
        embedding: [0.1, 0.2, 0.3, 0.4],
        conversationMetadata: null,
        confidence: null,
        verified: null,
      };

      mocks.noteContext.addMockNote(profileNote);

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

  describe('Storage Operations', () => {
    test('creates profiles through storage interface', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const storage = context.getStorage();
      const result = await storage.create(mockProfile);

      expect(result).toBe(MockProfileNoteAdapter.PROFILE_NOTE_ID);
    });

    test('reads profiles through storage interface', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const storage = context.getStorage();
      const result = await storage.read(MockProfileNoteAdapter.PROFILE_NOTE_ID);

      expect(result).toEqual(mockProfile);
    });

    test('lists profiles through storage interface', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      await mocks.profileNoteAdapter.setMockProfile(mockProfile);

      const storage = context.getStorage();
      const result = await storage.list();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProfile);
    });
  });

  describe('Formatting Capabilities', () => {
    test('formats profile data for display', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const formatter = context.getFormatter();
      const result = formatter.format(mockProfile);

      // Verify formatter produces readable output
      expect(typeof result).toBe('string');
      expect(result).toContain('Test User');
      expect(result).toContain('Software Engineer');
    });
  });

  describe('MCP Server Registration', () => {
    test('registers profile capabilities with MCP server', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const registrations = { tools: 0, resources: 0 };
      const mockServer = {
        tool: () => { registrations.tools++; },
        resource: () => { registrations.resources++; },
      };

      const success = context.registerOnServer(mockServer as unknown as McpServer);

      expect(success).toBe(true);
      expect(registrations.resources).toBeGreaterThan(0);
      expect(registrations.tools).toBeGreaterThan(0);
    });

    test('provides profile management capabilities', async () => {
      const { context } = createTestableProfileContext();
      await context.initialize();

      const capabilities = context.getCapabilities();

      expect(capabilities.resources.length).toBeGreaterThan(0);
      expect(capabilities.tools.length).toBeGreaterThan(0);

      // Verify resource provides profile access
      const profileResource = capabilities.resources.find(r => r.path === '/profile');
      expect(profileResource).toBeDefined();

      // Verify tools provide update and migration functionality
      const updateTool = capabilities.tools.find(t => t.path === '/profile/update');
      const migrationTool = capabilities.tools.find(t => t.path === '/profile/migrate-linkedin');
      expect(updateTool).toBeDefined();
      expect(migrationTool).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles profile retrieval errors gracefully', async () => {
      const { context, mocks } = createTestableProfileContext();
      await context.initialize();

      // Force an error
      mocks.profileNoteAdapter.getProfile = async () => {
        throw new Error('Database error');
      };

      const profile = await context.getProfile();
      expect(profile).toBeNull();
    });

    // TODO: Re-enable when cleanup is implemented
    // test('cleans up resources on shutdown', async () => {
    //   const { context } = createTestableProfileContext();
    //   await context.initialize();

    //   expect(context.isReady()).toBe(true);
    //   
    //   await context.cleanup();
    //   
    //   expect(context.isReady()).toBe(false);
    // });
  });
});
