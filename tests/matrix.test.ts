import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { MatrixBrainInterface } from '../src/interfaces/matrix';
import { createMockEmbedding, mockEnv, resetMocks } from './mocks';

// Mock matrix-js-sdk
mock.module('matrix-js-sdk', () => {
  return {
    createClient: () => ({
      startClient: () => Promise.resolve(),
      once: (event: string, callback: Function) => {
        // Simulate the sync event being emitted
        if (event === 'sync') {
          callback('PREPARED');
        }
      },
      on: () => {},
      joinRoom: () => Promise.resolve(),
      sendMessage: (roomId: string, content: any) => Promise.resolve(),
      sendHtmlMessage: (roomId: string, text: string, html: string) => Promise.resolve()
    }),
    ClientEvent: { Sync: 'sync' },
    RoomEvent: { Timeline: 'Room.timeline' },
    RoomMemberEvent: { Membership: 'RoomMember.membership' },
    MsgType: { Text: 'm.text' }
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
      };
      
      getNoteContext() {
        return {
          searchNotes: async () => []
        };
      };
      
      processQuery() {
        return Promise.resolve({
          answer: 'Mock answer',
          citations: [],
          relatedNotes: []
        });
      }
    }
  };
});

describe('MatrixBrainInterface', () => {
  let matrixInterface: any;
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
    matrixInterface = new MatrixBrainInterface();
    
    // Override sendMessage to capture output
    matrixInterface.sendMessage = (roomId: string, message: string) => {
      sentMessages.push({ roomId, message });
    };
  });
  
  test('should register profile command', () => {
    const commands = matrixInterface.commandHandlers.map((handler: any) => handler.command);
    expect(commands).toContain('profile');
  });
  
  test('should provide help message with profile command', async () => {
    await matrixInterface.handleHelp('', 'test-room', {});
    
    // Check that at least one message was sent
    expect(sentMessages.length).toBe(1);
    
    // Verify message content
    const helpMessage = sentMessages[0].message;
    expect(helpMessage).toContain('profile');
    expect(helpMessage).toContain('View your profile information');
  });
  
  test('should handle profile command', async () => {
    await matrixInterface.handleProfile('', 'test-room', {});
    
    // Check that at least one message was sent
    expect(sentMessages.length).toBe(1);
    
    // Verify message content
    const profileMessage = sentMessages[0].message;
    expect(profileMessage).toContain('Profile Information');
    expect(profileMessage).toContain('John Doe');
    expect(profileMessage).toContain('Ecosystem Architect');
  });
  
  test('should handle profile related command', async () => {
    await matrixInterface.handleProfile('related', 'test-room', {});
    
    // Check that at least one message was sent
    expect(sentMessages.length).toBe(1);
    
    // Verify message content
    const profileMessage = sentMessages[0].message;
    expect(profileMessage).toContain('Notes related to your profile');
    expect(profileMessage).toContain('Ecosystem Architecture Principles');
  });
  
  test('should process profile command via command processor', async () => {
    await matrixInterface.processCommand('profile', '', 'test-room', {});
    
    // Check that at least one message was sent
    expect(sentMessages.length).toBe(1);
    
    // Verify message content
    const profileMessage = sentMessages[0].message;
    expect(profileMessage).toContain('Profile Information');
    expect(profileMessage).toContain('John Doe');
  });
});