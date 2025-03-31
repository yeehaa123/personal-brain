import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { MatrixBrainInterface } from '../src/interfaces/matrix';
import { createMockEmbedding, mockEnv, resetMocks } from './mocks';

// Mock matrix-js-sdk
mock.module('matrix-js-sdk', () => {
  return {
    createClient: () => ({
      startClient: () => Promise.resolve(),
      once: (event: string, callback: (state: string) => void) => {
        // Simulate the sync event being emitted
        if (event === 'sync') {
          callback('PREPARED');
        }
      },
      on: () => {},
      joinRoom: () => Promise.resolve(),
      sendMessage: (_roomId: string, _content: Record<string, unknown>) => Promise.resolve(),
      sendHtmlMessage: (_roomId: string, _text: string, _html: string) => Promise.resolve(),
    }),
    ClientEvent: { Sync: 'sync' },
    RoomEvent: { Timeline: 'Room.timeline' },
    RoomMemberEvent: { Membership: 'RoomMember.membership' },
    MsgType: { Text: 'm.text' },
  };
});

// Mock BrainProtocol
mock.module('../src/mcp/protocol/brainProtocol', () => {
  return {
    BrainProtocol: class MockBrainProtocol {
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
                endDate: null,
              },
            ],
            education: [
              {
                degree: 'PhD in Systemic Design',
                school: 'University of Innovation',
                startDate: '2010-01',
                endDate: '2014-01',
              },
            ],
            languages: ['English', 'JavaScript', 'Python'],
            city: 'Innovation City',
            state: 'Creative State',
            countryFullName: 'Futureland',
            embedding: createMockEmbedding('John Doe profile'),
            tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          extractProfileKeywords: (_profile) => ['ecosystem', 'architect', 'innovation', 'collaboration'],
          findRelatedNotes: async () => [
            {
              id: 'note-1',
              title: 'Ecosystem Architecture Principles',
              content: 'Content about ecosystem architecture',
              tags: ['ecosystem-architecture', 'innovation'],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        };
      }
      
      getNoteContext() {
        return {
          searchNotes: async () => [],
        };
      }
      
      processQuery() {
        return Promise.resolve({
          answer: 'Mock answer',
          citations: [],
          relatedNotes: [],
        });
      }
    },
  };
});

// Mock the CommandHandler and MatrixRenderer
mock.module('../src/commands', () => {
  return {
    CommandHandler: class MockCommandHandler {
      getCommands() {
        return [
          {
            command: 'help',
            description: 'Show available commands',
            usage: 'help',
          },
          {
            command: 'profile',
            description: 'View your profile information',
            usage: 'profile [related]',
          },
        ];
      }
      
      async processCommand(command: string, args: string) {
        if (command === 'profile') {
          if (args === 'related') {
            return {
              type: 'profile-related',
              profile: {
                fullName: 'John Doe',
                occupation: 'Ecosystem Architect',
              },
              relatedNotes: [
                {
                  id: 'note-1',
                  title: 'Ecosystem Architecture Principles',
                  content: 'Test content',
                  tags: ['test'],
                },
              ],
              matchType: 'tags',
              keywords: ['ecosystem', 'architect'],
            };
          }
          
          return {
            type: 'profile',
            profile: {
              fullName: 'John Doe',
              occupation: 'Ecosystem Architect',
            },
            keywords: ['ecosystem', 'architect'],
          };
        }
        
        return {
          type: 'error',
          message: `Unknown command: ${command}`,
        };
      }
    },
  };
});

// Mock the MatrixRenderer
mock.module('../src/commands/matrix-renderer', () => {
  return {
    MatrixRenderer: class MockMatrixRenderer {
      constructor(commandPrefix, sendMessageFn) {
        this.commandPrefix = commandPrefix;
        this.sendMessageFn = sendMessageFn;
      }
      
      renderHelp(roomId, _commands) {
        this.sendMessageFn(roomId, 'Mock help: Personal Brain Commands, profile');
      }
      
      render(roomId, result) {
        if (result.type === 'profile') {
          this.sendMessageFn(roomId, 'Mock profile: John Doe');
        } else if (result.type === 'profile-related') {
          this.sendMessageFn(roomId, 'Mock profile with Notes related to your profile');
        } else {
          this.sendMessageFn(roomId, `Mock result: ${result.type}`);
        }
      }
    },
  };
});

describe('MatrixBrainInterface', () => {
  let matrixInterface: MatrixBrainInterface;
  let sentMessages: Array<{roomId: string, message: string}> = [];
  
  beforeAll(() => {
    mockEnv();
    // Set required environment variables
    process.env.MATRIX_HOMESERVER_URL = 'https://matrix.test.org';
    process.env.MATRIX_USER_ID = '@test:test.org';
    process.env.MATRIX_ACCESS_TOKEN = 'mock-token';
    process.env.MATRIX_ROOM_IDS = '!room1:test.org';
    process.env.COMMAND_PREFIX = '!brain';
  });
  
  afterAll(() => {
    resetMocks();
    delete process.env.MATRIX_HOMESERVER_URL;
    delete process.env.MATRIX_USER_ID;
    delete process.env.MATRIX_ACCESS_TOKEN;
    delete process.env.MATRIX_ROOM_IDS;
    delete process.env.COMMAND_PREFIX;
  });
  
  beforeEach(() => {
    sentMessages = [];
    
    // Create MatrixBrainInterface with overridden sendMessage
    matrixInterface = new MatrixBrainInterface();
    
    // Override the renderer to use our mocked sendMessage
    matrixInterface.renderer = {
      renderHelp: (roomId, _commands) => {
        sentMessages.push({ 
          roomId, 
          message: 'Mock help: Personal Brain Commands, profile', 
        });
      },
      render: (roomId, result) => {
        if (result.type === 'profile') {
          sentMessages.push({ 
            roomId, 
            message: 'Mock profile: John Doe', 
          });
        } else if (result.type === 'profile-related') {
          sentMessages.push({ 
            roomId, 
            message: 'Mock profile with Notes related to your profile', 
          });
        } else {
          sentMessages.push({ 
            roomId, 
            message: `Mock result: ${result.type}`, 
          });
        }
      },
    };
  });
  
  test('should have command handler and renderer', () => {
    expect(matrixInterface.commandHandler).toBeDefined();
    expect(matrixInterface.renderer).toBeDefined();
  });
  
  test('should process help command', async () => {
    await matrixInterface.processCommand('help', 'test-room', {});
    
    // Check that at least one message was sent
    expect(sentMessages.length).toBe(1);
    
    // Verify message content
    const helpMessage = sentMessages[0].message;
    expect(helpMessage).toContain('Mock help');
    expect(helpMessage).toContain('profile');
  });
  
  test('should process profile command', async () => {
    await matrixInterface.processCommand('profile', 'test-room', {});
    
    // Check that at least one message was sent
    expect(sentMessages.length).toBe(1);
    
    // Verify message content contains profile info
    expect(sentMessages[0].message).toContain('Mock profile: John Doe');
  });
  
  test('should process profile related command', async () => {
    // Use the underlying processCommand method directly
    await matrixInterface.processCommand('profile related', 'test-room', {});
    
    // Verify message was sent
    expect(sentMessages.length).toBe(1);
    
    // Check for related notes content
    expect(sentMessages[0].message).toContain('Notes related to your profile');
  });
});