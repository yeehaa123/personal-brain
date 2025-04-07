/**
 * Context Utilities for Tests
 * 
 * This file provides utilities for creating and mocking conversation context components in tests.
 * It includes functions for mocking the ConversationSummarizer and other context-related functions.
 * 
 * Usage:
 * ```typescript
 * import { setupContextMocks } from '@test/utils/contextUtils';
 * 
 * // Setup mocks for the context-related services
 * setupContextMocks(mock);
 * ```
 * 
 * # IMPORTANT: Best Practices for InMemoryStorage in Tests
 * 
 * To prevent test interference and ensure proper isolation, follow these guidelines:
 * 
 * 1. Always use createFresh() to get an isolated instance:
 * ```typescript
 * // Good - isolated test instance
 * const storage = InMemoryStorage.createFresh(); 
 * 
 * // Bad - shared singleton that can cause test interference
 * const storage = InMemoryStorage.getInstance(); 
 * ```
 * 
 * 2. Explicitly pass the storage to components that need it:
 * ```typescript
 * // Create an isolated storage instance
 * const storage = InMemoryStorage.createFresh();
 * 
 * // Pass it to ConversationContext
 * const context = ConversationContext.createFresh({ 
 *   storage: storage
 * });
 * 
 * // Pass it to BrainProtocol
 * const protocol = new BrainProtocol({ 
 *   memoryStorage: storage
 * });
 * ```
 * 
 * 3. For BrainProtocol, use the memoryStorage option in constructor:
 * ```typescript
 * const protocol = new BrainProtocol({
 *   apiKey: 'test-key',
 *   memoryStorage: InMemoryStorage.createFresh()
 * });
 * ```
 */

import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import { MockInMemoryStorage } from '@test/mcp/contexts/conversations/__mocks__/mockInMemoryStorage';

/**
 * Set up mocks for all InMemoryStorage instances across tests
 * This function mocks the InMemoryStorage module to use our mock implementation
 * @param mockFn The mock function to use (from bun:test)
 */
export function setupInMemoryStorageMock(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  mockFn.module('@/mcp/contexts/conversations/storage/inMemoryStorage', () => {
    return {
      InMemoryStorage: MockInMemoryStorage,
    };
  });
}

/**
 * Create an isolated ConversationContext instance for testing
 * 
 * This function follows best practices for test isolation by using InMemoryStorage.createFresh()
 * and explicitly passing the storage to the context instance.
 * 
 * @param options Optional configuration for the ConversationContext
 * @returns Object containing the context instance and its isolated storage
 */
export async function createIsolatedContext(options?: {
  apiKey?: string;
  contextOptions?: Record<string, unknown>;
}) {
  // Import dynamically to avoid circular dependencies
  // Using dynamic imports instead of require() to satisfy linting rules
  const Module = await import('@/mcp/contexts/conversations');
  
  const { ConversationContext } = Module;
  
  // Always create a fresh isolated storage instance
  const storage = MockInMemoryStorage.createFresh();
  
  // Create the context with the isolated storage
  const context = ConversationContext.createFresh({
    storage: storage,
    ...options?.contextOptions,
    apiKey: options?.apiKey,
  });
  
  return { context, storage };
}

/**
 * Setup context-related mocks for testing
 */
export function setupContextMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  // Set up InMemoryStorage mock first
  setupInMemoryStorageMock(mockFn);

  // We don't want to mock the ConversationContext class itself since it contains core logic
  // Instead, we'll ensure the storage and summarizer work properly
  
  // Mock the ConversationSummarizer to return consistent results and avoid API calls
  mockFn.module('@/mcp/contexts/conversations/memory/summarizer', () => {
    return {
      ConversationSummarizer: class MockConversationSummarizer {
        constructor() {
          // No shared state between instances
        }
        
        async summarizeTurns(turns: ConversationTurn[]) {
          if (!turns || turns.length === 0) {
            throw new Error('Cannot summarize empty turns array');
          }
          
          // Sort turns by timestamp to ensure chronological order
          const sortedTurns = [...turns].sort((a, b) => {
            const aTime = a.timestamp ? a.timestamp.getTime() : 0;
            const bTime = b.timestamp ? b.timestamp.getTime() : 0;
            return aTime - bTime;
          });
          
          return {
            id: `summary-${Math.random().toString(36).substring(2, 10)}`,
            timestamp: new Date(),
            content: `Summary of ${turns.length} conversation turns about various topics.`,
            startTurnIndex: 0,
            endTurnIndex: turns.length - 1,
            startTimestamp: sortedTurns[0].timestamp,
            endTimestamp: sortedTurns[sortedTurns.length - 1].timestamp,
            turnCount: turns.length,
            metadata: {
              originalTurnIds: sortedTurns.map(t => t.id),
            },
          };
        }
      },
    };
  });
  
  // Optionally mock ClaudeModel used for summary generation (if needed)
  mockFn.module('@/mcp/model/claude', () => {
    return {
      ClaudeModel: class MockClaudeModel {
        constructor() {}
        
        async complete(_systemPrompt: string, userPrompt: string) {
          // Extract some keywords from the prompt for a more realistic summary
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
}