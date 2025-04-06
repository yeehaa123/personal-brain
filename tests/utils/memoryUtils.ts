/**
 * Memory Utilities for Tests
 * 
 * This file provides utilities for creating and mocking conversation memory components in tests.
 * It includes functions for mocking the ConversationSummarizer and other memory-related functions.
 * 
 * Usage:
 * ```typescript
 * import { setupMemoryMocks } from '@test/utils/memoryUtils';
 * 
 * // Setup mocks for the memory-related services
 * setupMemoryMocks(mock);
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
 * // Pass it to ConversationMemory
 * const memory = new ConversationMemory({ 
 *   interfaceType: 'cli',
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

import type { ConversationMemoryStorage } from '@/mcp/protocol/schemas/conversationMemoryStorage';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

/**
 * Create an isolated ConversationMemory instance for testing
 * 
 * This function follows best practices for test isolation by using InMemoryStorage.createFresh()
 * and explicitly passing the storage to the memory instance.
 * 
 * @param options Optional configuration for the ConversationMemory
 * @returns Object containing the memory instance and its isolated storage
 */
export async function createIsolatedMemory(options?: {
  interfaceType?: 'cli' | 'matrix';
  apiKey?: string;
  memoryOptions?: Record<string, unknown>;
}) {
  // Import dynamically to avoid circular dependencies
  // Using dynamic imports instead of require() to satisfy linting rules
  const Module = await import('@/mcp/protocol/memory');
  
  const { InMemoryStorage, ConversationMemory } = Module;
  
  // Always create a fresh isolated storage instance
  const storage = InMemoryStorage.createFresh();
  
  // Create the memory with the isolated storage
  const memory = new ConversationMemory({
    interfaceType: options?.interfaceType || 'cli',
    storage: storage as unknown as ConversationMemoryStorage,
    options: options?.memoryOptions,
    apiKey: options?.apiKey,
  });
  
  return { memory, storage };
}

/**
 * Setup memory-related mocks for testing
 */
export function setupMemoryMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  // We don't want to mock the ConversationMemory class itself since it contains core logic
  // Instead, we'll ensure the storage and summarizer work properly
  
  // Mock the ConversationSummarizer to return consistent results and avoid API calls
  mockFn.module('@/mcp/protocol/memory/summarizer', () => {
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