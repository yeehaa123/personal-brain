import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { CommandHandler } from '../src/commands';
import { createMockEmbedding, mockEnv, resetMocks } from './mocks';

// Mock BrainProtocol
mock.module('../src/mcp/protocol/brainProtocol', () => {
  return {
    BrainProtocol: class MockBrainProtocol {
      useExternalSources = false;
      
      getProfileContext() {
        return {
          getProfile: async () => ({
            id: 'mock-profile-id',
            fullName: 'John Doe',
            occupation: 'Ecosystem Architect',
            headline: 'Innovator | Thinker | Community Builder',
            summary: 'I build ecosystems that foster innovation and collaboration.',
            experiences: [
              {
                title: 'Ecosystem Architect',
                company: 'Ecosystem Corp',
                description: 'Building regenerative ecosystem architectures',
                startDate: '2020-01',
                endDate: null
              }
            ],
            education: [
              {
                degree: 'PhD in Systemic Design',
                school: 'University of Innovation',
                startDate: '2010-01',
                endDate: '2014-01'
              }
            ],
            languages: ['English', 'JavaScript', 'Python'],
            city: 'Innovation City',
            state: 'Creative State',
            countryFullName: 'Futureland',
            embedding: createMockEmbedding('John Doe profile'),
            tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
            createdAt: new Date(),
            updatedAt: new Date()
          }),
          extractProfileKeywords: (profile) => ['ecosystem', 'architect', 'innovation', 'collaboration'],
          findRelatedNotes: async () => [
            {
              id: 'note-1',
              title: 'Ecosystem Architecture Principles',
              content: 'Content about ecosystem architecture',
              tags: ['ecosystem-architecture', 'innovation'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        };
      }
      
      getNoteContext() {
        return {
          searchNotes: async ({ query, tags, limit }) => {
            // For list command with tag
            if (tags && tags.includes('ecosystem')) {
              return [
                {
                  id: 'note-1',
                  title: 'Ecosystem Architecture Principles',
                  content: 'Content about ecosystem architecture',
                  tags: ['ecosystem', 'innovation'],
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              ];
            }
            
            // For search command
            if (query === 'ecosystem') {
              return [
                {
                  id: 'note-1',
                  title: 'Ecosystem Architecture Principles',
                  content: 'Content about ecosystem architecture',
                  tags: ['ecosystem-architecture', 'innovation'],
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              ];
            }
            
            // Default list response
            return [
              {
                id: 'note-2',
                title: 'Building Communities',
                content: 'Content about community building',
                tags: ['community', 'collaboration'],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ];
          },
          getNoteById: async (id) => {
            if (id === 'note-1') {
              return {
                id: 'note-1',
                title: 'Ecosystem Architecture Principles',
                content: 'Content about ecosystem architecture',
                tags: ['ecosystem-architecture', 'innovation'],
                createdAt: new Date(),
                updatedAt: new Date()
              };
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
      
      processQuery() {
        return Promise.resolve({
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
  
  test('should provide a list of available commands', () => {
    const commands = commandHandler.getCommands();
    
    expect(commands).toBeDefined();
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
    
    // Check for required commands
    const commandNames = commands.map(cmd => cmd.command);
    expect(commandNames).toContain('help');
    expect(commandNames).toContain('search');
    expect(commandNames).toContain('list');
    expect(commandNames).toContain('profile');
    expect(commandNames).toContain('ask');
  });
  
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
  
  test('should handle search command', async () => {
    const result = await commandHandler.processCommand('search', 'ecosystem');
    
    expect(result).toBeDefined();
    expect(result.type).toBe('search');
    expect(result.query).toBe('ecosystem');
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0].title).toContain('Ecosystem');
  });
  
  test('should handle list command', async () => {
    const result = await commandHandler.processCommand('list', '');
    
    expect(result).toBeDefined();
    expect(result.type).toBe('notes');
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
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
  });
  
  test('should handle unknown command', async () => {
    const result = await commandHandler.processCommand('unknown', '');
    
    expect(result).toBeDefined();
    expect(result.type).toBe('error');
    expect(result.message).toContain('Unknown command');
  });
});