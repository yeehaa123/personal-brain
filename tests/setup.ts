/**
 * Global test setup for the personal-brain application
 * This file is automatically loaded by Bun when running tests
 * 
 * This file centralizes all the global setup and mocking required for tests.
 * It ensures consistent behavior across all test suites.
 */

// Set the environment to test
import { afterAll, afterEach, beforeAll, beforeEach, mock } from 'bun:test';

// Import singleton reset functions and mocks
import { ExternalSourceContext } from '@/mcp/contexts/externalSources/core/externalSourceContext';
import { NoteContext } from '@/mcp/contexts/notes';
import { ProfileContext } from '@/mcp/contexts/profiles/core/profileContext';
import { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import { resetServiceRegistration } from '@/services/serviceRegistry';

import { setupLoggerMocks } from './__mocks__';
import { 
  MockBaseContext,
  MockConversationContext, 
  MockExternalSourceContext, 
  MockNoteContext, 
  MockProfileContext, 
} from './__mocks__/contexts';
import { MockConversationStorage } from './__mocks__/storage';
import { setupEmbeddingMocks } from './__mocks__/utils/embeddingUtils';
import { setupMockFetch } from './__mocks__/utils/fetchUtils';
import { setupMcpServerMocks } from './__mocks__/utils/mcpUtils';
import { setTestEnv } from './utils/envUtils';

// Set test environment
setTestEnv('NODE_ENV', 'test');

// Global setup - runs once before all tests
beforeAll(() => {
  // Mock the logger to prevent console noise during tests
  setupLoggerMocks(mock);
  
  // Set up global mocks for BrainProtocol and related classes
  setupMcpServerMocks();
});

// Per-test setup - runs before each test
beforeEach(() => {
  // Reset all singletons for test isolation (checking if methods exist first)
  if (typeof BrainProtocol?.resetInstance === 'function') {
    BrainProtocol.resetInstance();
  }
  
  // Reset original contexts
  if (typeof NoteContext?.resetInstance === 'function') {
    NoteContext.resetInstance();
  }
  
  if (typeof ProfileContext?.resetInstance === 'function') {
    ProfileContext.resetInstance();
  }
  
  if (typeof ExternalSourceContext?.resetInstance === 'function') {
    ExternalSourceContext.resetInstance();
  }
  
  // Reset our standardized mock contexts
  MockBaseContext.resetInstance();
  MockConversationContext.resetInstance();
  MockNoteContext.resetInstance();
  MockProfileContext.resetInstance();
  MockExternalSourceContext.resetInstance();
  
  resetServiceRegistration();
  
  // BEST PRACTICE FOR TESTING WITH InMemoryStorage:
  // 1. Always use InMemoryStorage.createFresh() in tests to get isolated instances
  // 2. Pass the storage instance explicitly to any component that needs it
  // 3. When testing BrainProtocol, use the memoryStorage option in the constructor
  // 4. DO NOT rely on or reset the singleton instance in tests
  //
  // Example:
  // const storage = InMemoryStorage.createFresh();
  // const protocol = new BrainProtocol({ memoryStorage: storage });
  
  
  // Setup embedding mocks for consistent vector operations
  setupEmbeddingMocks(mock);
  
  // Setup ConversationStorage mock
  mock.module('@/mcp/contexts/conversations/storage/inMemoryStorage', () => {
    return {
      InMemoryStorage: MockConversationStorage,
    };
  });
  
  // Mock the context classes
  mock.module('@/mcp/contexts/conversations/core/conversationContext', () => {
    return {
      ConversationContext: MockConversationContext,
    };
  });
  
  mock.module('@/mcp/contexts/notes/core/noteContext', () => {
    return {
      NoteContext: MockNoteContext,
    };
  });
  
  mock.module('@/mcp/contexts/profiles/core/profileContext', () => {
    return {
      ProfileContext: MockProfileContext,
    };
  });
  
  mock.module('@/mcp/contexts/externalSources/core/externalSourceContext', () => {
    return {
      ExternalSourceContext: MockExternalSourceContext,
    };
  });
  
  // Mock the ConversationSummarizer to return consistent results
  mock.module('@/mcp/contexts/conversations/memory/summarizer', () => {
    return {
      ConversationSummarizer: class {
        constructor() {}
        
        async summarizeTurns(turns: unknown[]) {
          if (!turns || turns.length === 0) {
            throw new Error('Cannot summarize empty turns array');
          }
          
          // Sort turns by timestamp - we know the structure but need to type it properly
          const typedTurns = turns as Array<{
            timestamp?: Date;
            id?: string;
          }>;
          
          const sortedTurns = [...typedTurns].sort((a, b) => {
            const aTime = a.timestamp ? a.timestamp.getTime() : 0;
            const bTime = b.timestamp ? b.timestamp.getTime() : 0;
            return aTime - bTime;
          });
          
          return {
            id: `summary-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date(),
            content: `Summary of ${turns.length} conversation turns about various topics.`,
            startTurnIndex: 0,
            endTurnIndex: turns.length - 1,
            startTimestamp: sortedTurns[0]?.timestamp,
            endTimestamp: sortedTurns[sortedTurns.length - 1]?.timestamp,
            turnCount: turns.length,
            metadata: {
              originalTurnIds: sortedTurns.map(t => t.id || ''),
            },
          };
        }
      },
    };
  });
  
  // Mock Claude model for testing
  mock.module('@/mcp/model/claude', () => {
    return {
      ClaudeModel: class {
        constructor() {}
        
        async complete(_systemPrompt: string, userPrompt: string) {
          const words = userPrompt
            .split(/\s+/)
            .filter(w => w.length > 4)
            .slice(0, 5)
            .join(', ');
          
          return {
            response: `This conversation covered topics including ${words || 'various subjects'}.`,
            usage: {
              inputTokens: 100,
              outputTokens: 50,
            },
          };
        }
      },
    };
  });
  
  // Setup default fetch mock for network isolation
  global.fetch = setupMockFetch({});
});

// Cleanup after each test
afterEach(() => {
  // Reset any per-test state that needs cleaning
});

// Final cleanup - runs once after all tests
afterAll(() => {
  // Any final cleanup
});