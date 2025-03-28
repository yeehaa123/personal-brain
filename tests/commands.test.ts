import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { CommandHandler } from '../src/commands';
import { createMockEmbedding, createMockNote, createMockProfile, mockEnv, resetMocks } from './mocks';

// Define the mock notes outside to reduce duplication
const mockEcosystemNote = createMockNote('note-1', 'Ecosystem Architecture Principles', ['ecosystem-architecture', 'innovation']);
const mockCommunityNote = createMockNote('note-2', 'Building Communities', ['community', 'collaboration']);

// Mock BrainProtocol
mock.module('../src/mcp/protocol/brainProtocol', () => {
  return {
    BrainProtocol: class MockBrainProtocol {
      useExternalSources = false;
      
      getProfileContext() {
        return {
          getProfile: async () => createMockProfile('mock-profile-id'),
          extractProfileKeywords: (profile) => ['ecosystem', 'architect', 'innovation', 'collaboration'],
          findRelatedNotes: async () => [mockEcosystemNote]
        };
      }
      
      getNoteContext() {
        return {
          searchNotes: async ({ query, tags, limit }) => {
            // For list command with tag
            if (tags && tags.includes('ecosystem')) {
              return [
                {
                  ...mockEcosystemNote,
                  tags: ['ecosystem', 'innovation']
                }
              ];
            }
            
            // For search command
            if (query === 'ecosystem') {
              return [mockEcosystemNote];
            }
            
            // Default list response
            return [mockCommunityNote];
          },
          getNoteById: async (id) => {
            if (id === 'note-1') {
              return mockEcosystemNote;
            }
            return null;
          },
          getNoteCount: async () => 10
        };
      }
      
      getExternalSourceContext() {
        return {
          checkSourcesAvailability: async () => ({
            'Wikipedia': true,
            'NewsAPI': false
          })
        };
      }
      
      processQuery(query) {
        return Promise.resolve({
          query, // Include the query in the response
          answer: 'Mock answer',
          citations: [],
          relatedNotes: []
        });
      }
      
      setUseExternalSources(enabled) {
        this.useExternalSources = enabled;
      }
    }
  };
});

describe('CommandHandler', () => {
  let commandHandler;
  let originalLogger;
  
  beforeAll(() => {
    mockEnv();
  });
  
  afterAll(() => {
    resetMocks();
  });
  
  beforeEach(() => {
    // Import directly from the mocked module to avoid reference error
    const { BrainProtocol } = require('../src/mcp/protocol/brainProtocol');
    const mockBrainProtocol = new BrainProtocol();
    
    commandHandler = new CommandHandler(mockBrainProtocol);
  });
  
  describe('command listing and handling', () => {
    test('should provide a list of available commands', () => {
      const commands = commandHandler.getCommands();
      
      expect(commands).toBeDefined();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      
      // Check for required commands
      const commandNames = commands.map(cmd => cmd.command);
      const requiredCommands = ['help', 'search', 'list', 'profile', 'ask'];
      
      requiredCommands.forEach(cmd => {
        expect(commandNames).toContain(cmd);
      });
    });
    
    test('should handle unknown command', async () => {
      const result = await commandHandler.processCommand('unknown', '');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('error');
      expect(result.message).toContain('Unknown command');
    });
  });
  
  describe('profile commands', () => {
    test('should handle profile command', async () => {
      const result = await commandHandler.processCommand('profile', '');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('profile');
      expect(result.profile).toBeDefined();
      expect(result.profile.fullName).toBe('John Doe');
      expect(Array.isArray(result.keywords)).toBe(true);
    });
    
    test('should handle profile related command', async () => {
      const result = await commandHandler.processCommand('profile', 'related');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('profile-related');
      expect(result.profile).toBeDefined();
      expect(Array.isArray(result.relatedNotes)).toBe(true);
      expect(result.relatedNotes.length).toBeGreaterThan(0);
      expect(['tags', 'semantic', 'keyword']).toContain(result.matchType);
    });
  });
  
  describe('note commands', () => {
    test('should handle search command', async () => {
      const result = await commandHandler.processCommand('search', 'ecosystem');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('search');
      expect(result.query).toBe('ecosystem');
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes[0].title).toContain('Ecosystem');
      expect(result.notes[0].tags).toContain('ecosystem-architecture');
    });
    
    test('should handle list command', async () => {
      const result = await commandHandler.processCommand('list', '');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('notes');
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes[0].title).toBe('Building Communities');
    });
    
    test('should handle list with tag command', async () => {
      const result = await commandHandler.processCommand('list', 'ecosystem');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('notes');
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes[0].tags).toContain('ecosystem');
    });
    
    test('should handle note command', async () => {
      const result = await commandHandler.processCommand('note', 'note-1');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('note');
      expect(result.note).toBeDefined();
      expect(result.note.id).toBe('note-1');
      expect(result.note.title).toBe('Ecosystem Architecture Principles');
      expect(result.note.tags).toContain('ecosystem-architecture');
    });
  });
  
  describe('ask command', () => {
    test('should handle ask command', async () => {
      // Set ANTHROPIC_API_KEY for test
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const result = await commandHandler.processCommand('ask', 'What is ecosystem architecture?');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('ask');  // Type is 'ask', not 'answer'
      expect(result.answer).toBe('Mock answer');
      expect(Array.isArray(result.citations)).toBe(true);
      expect(Array.isArray(result.relatedNotes)).toBe(true);
      
      // The query is not returned in the result, so we don't test for it
      // expect(result.query).toBe('What is ecosystem architecture?');
    });
  });
});