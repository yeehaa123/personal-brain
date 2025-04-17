import { describe, expect, mock, test } from 'bun:test';

import { PromptFormatter } from '@/protocol/components';
import type { Note } from '@models/note';
import { createMockNote } from '@test/__mocks__/models/note';

describe('PromptFormatter with ConversationContext', () => {
  // Test data
  const sampleNotes: Note[] = [
    createMockNote('note-1', 'Quantum Computing Basics', ['quantum', 'computing']),
  ];

  // This test simulates how the PromptFormatter will be extended
  // to support conversation history
  test('should format prompt with conversation history', async () => {
    // Skip using the actual ConversationContext and just use mock data directly
    // This avoids DI issues and simplifies the test
    const historyText = `User: What is quantum computing?
Assistant: Quantum computing is a type of computation that uses quantum bits or qubits to perform operations.

User: How is that different from classical computing?
Assistant: Classical computing uses classical bits that can be either 0 or 1, while quantum bits can exist in superposition, representing both 0 and 1 simultaneously.

`;

    // Create prompt formatter
    const promptFormatter = PromptFormatter.createFresh();

    // Format the new query with notes
    const query = 'Tell me about quantum entanglement.';
    const { formattedPrompt } = promptFormatter.formatPromptWithContext(
      query,
      sampleNotes,
      [],
      false,
      1.0,
      undefined,
      historyText,
    );

    // Verify the formatted prompt contains both history and context
    // The conversation history should be included in the prompt
    expect(formattedPrompt).toContain('Recent Conversation History:');
    expect(formattedPrompt).toContain('User: What is quantum computing?');
    expect(formattedPrompt).toContain('Assistant: Quantum computing is a type');
    expect(formattedPrompt).toContain('User: How is that different from classical computing?');
    // The query and note information should also be included
    expect(formattedPrompt).toContain('Tell me about quantum entanglement.');
    expect(formattedPrompt).toContain('Quantum Computing Basics');
  });

  // Mock Test for how BrainProtocol will use ConversationContext
  test('should simulate BrainProtocol using ConversationContext', async () => {
    // Mock objects
    const mockContext = {
      currentConversationId: null as string | null,
      getOrCreateConversationForRoom: mock(async (_roomId: string, _interfaceType: string) => 'mock-conv-id'),
      addTurn: mock(async (_convId, _query, _response) => { }),
      formatHistoryForPrompt: mock(async (_conversationId: string) => 'User: Previous question\nAssistant: Previous answer\n\n'),
    };

    const mockPromptFormatter = {
      formatPromptWithContext: mock((query) => ({
        formattedPrompt: `Formatted prompt for: ${query}`,
        citations: [],
      })),
    };

    const mockModel = {
      complete: mock(async (options) => ({
        object: { answer: 'Model response to: ' + options.userPrompt.slice(0, 20) + '...' },
        usage: { inputTokens: 100, outputTokens: 20 },
      })),
    };

    // Simulate processQuery method with conversation context
    async function simulatedProcessQuery(query: string) {
      // Start conversation if none exists
      if (!mockContext.currentConversationId) {
        mockContext.currentConversationId = await mockContext.getOrCreateConversationForRoom('default-room', 'cli');
      }

      // Get conversation history
      const historyText = await mockContext.formatHistoryForPrompt(mockContext.currentConversationId);

      // Get basic prompt (simplified version of actual implementation)
      const { formattedPrompt } = mockPromptFormatter.formatPromptWithContext(query);

      // Combine history with formatted prompt
      const promptWithHistory = historyText.length > 0
        ? `Recent Conversation History:\n${historyText}\n${formattedPrompt}`
        : formattedPrompt;

      // Call model with combined prompt
      const systemPrompt = 'You are a helpful assistant';
      const modelResponse = await mockModel.complete({
        systemPrompt,
        userPrompt: promptWithHistory,
      });

      // Save conversation turn
      await mockContext.addTurn(
        mockContext.currentConversationId,
        query,
        modelResponse.object.answer,
      );

      // Return response
      return {
        answer: modelResponse.object.answer,
        citations: [],
        relatedNotes: [],
      };
    }

    // Test the simulated processing
    const response = await simulatedProcessQuery('What is quantum physics?');

    // Verify the function calls
    expect(mockContext.getOrCreateConversationForRoom).toHaveBeenCalled();
    expect(mockContext.formatHistoryForPrompt).toHaveBeenCalled();
    expect(mockPromptFormatter.formatPromptWithContext).toHaveBeenCalled();

    // Check that the formatPromptWithContext was called with the correct first argument
    expect(mockPromptFormatter.formatPromptWithContext.mock.calls[0][0]).toBe('What is quantum physics?');

    // The model should be called with a prompt containing history
    const modelCall = mockModel.complete.mock.calls[0];
    expect(modelCall[0].systemPrompt).toBe('You are a helpful assistant');
    expect(modelCall[0].userPrompt).toContain('Recent Conversation History:');
    expect(modelCall[0].userPrompt).toContain('User: Previous question');

    // The response should be recorded in conversation context
    expect(mockContext.addTurn).toHaveBeenCalledWith(
      'mock-conv-id',
      'What is quantum physics?',
      response.answer,
    );
  });
});