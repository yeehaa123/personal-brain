import { describe, test, expect, mock } from 'bun:test';
import { PromptFormatter } from '@/mcp/protocol/components';
import { ConversationMemory } from '@/mcp/protocol/memory';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { Note } from '@models/note';
import { createMockNote } from '@test/mocks';

describe('PromptFormatter with ConversationMemory', () => {
  // Test data
  const sampleNotes: Note[] = [
    createMockNote('note-1', 'Quantum Computing Basics', ['quantum', 'computing']),
  ];

  // This test simulates how the PromptFormatter will be extended
  // to support conversation history
  test('should format prompt with conversation history', async () => {
    // Set up conversation memory
    const storage = new InMemoryStorage();
    const memory = new ConversationMemory({
      interfaceType: 'cli',
      storage: storage,
    });
    
    // Create a new conversation
    await memory.startConversation();
    
    // Add conversation turns
    await memory.addTurn(
      'What is quantum computing?', 
      'Quantum computing is a type of computation that uses quantum bits or qubits to perform operations.',
    );
    
    await memory.addTurn(
      'How is that different from classical computing?',
      'Classical computing uses classical bits that can be either 0 or 1, while quantum bits can exist in superposition, representing both 0 and 1 simultaneously.',
    );
    
    // Format conversation history
    const historyText = await memory.formatHistoryForPrompt();
    
    // Create prompt formatter
    const promptFormatter = new PromptFormatter();
    
    // Format the new query with notes (simulating how this will work in BrainProtocol)
    const query = 'Tell me about quantum entanglement.';
    const { formattedPrompt } = promptFormatter.formatPromptWithContext(
      query,
      sampleNotes,
      [],
      false,
    );
    
    // Manually combine history and formatted prompt for now
    // In the actual implementation, this will be done inside the updated PromptFormatter
    const combinedPrompt = `Recent Conversation History:
${historyText}
${formattedPrompt}`;
    
    // Verify the combined prompt contains both history and context
    expect(combinedPrompt).toContain('Recent Conversation History:');
    expect(combinedPrompt).toContain('User: What is quantum computing?');
    expect(combinedPrompt).toContain('Assistant: Quantum computing is a type');
    expect(combinedPrompt).toContain('User: How is that different from classical computing?');
    expect(combinedPrompt).toContain('Tell me about quantum entanglement.');
    expect(combinedPrompt).toContain('Quantum Computing Basics');
  });

  // Mock Test for how BrainProtocol will use ConversationMemory
  test('should simulate BrainProtocol using ConversationMemory', async () => {
    // Mock objects
    const mockMemory = {
      currentConversation: null,
      startConversation: mock(async () => 'mock-conv-id'),
      addTurn: mock(async (_query, _response) => {}),
      formatHistoryForPrompt: mock(async () => 'User: Previous question\nAssistant: Previous answer\n\n'),
    };
    
    const mockPromptFormatter = {
      formatPromptWithContext: mock((query) => ({
        formattedPrompt: `Formatted prompt for: ${query}`,
        citations: [],
      })),
    };
    
    const mockModel = {
      complete: mock(async (_systemPrompt, userPrompt) => ({
        response: 'Model response to: ' + userPrompt.slice(0, 20) + '...',
      })),
    };
    
    // Simulate processQuery method with conversation memory
    async function simulatedProcessQuery(query: string) {
      // Start conversation if none exists
      if (!mockMemory.currentConversation) {
        await mockMemory.startConversation();
      }
      
      // Get conversation history
      const historyText = await mockMemory.formatHistoryForPrompt();
      
      // Get basic prompt (simplified version of actual implementation)
      const { formattedPrompt } = mockPromptFormatter.formatPromptWithContext(query);
      
      // Combine history with formatted prompt
      const promptWithHistory = historyText.length > 0
        ? `Recent Conversation History:\n${historyText}\n${formattedPrompt}`
        : formattedPrompt;
      
      // Call model with combined prompt
      const systemPrompt = 'You are a helpful assistant';
      const modelResponse = await mockModel.complete(systemPrompt, promptWithHistory);
      
      // Save conversation turn
      await mockMemory.addTurn(query, modelResponse.response);
      
      // Return response
      return {
        answer: modelResponse.response,
        citations: [],
        relatedNotes: [],
      };
    }
    
    // Test the simulated processing
    const response = await simulatedProcessQuery('What is quantum physics?');
    
    // Verify the function calls
    expect(mockMemory.startConversation).toHaveBeenCalled();
    expect(mockMemory.formatHistoryForPrompt).toHaveBeenCalled();
    expect(mockPromptFormatter.formatPromptWithContext).toHaveBeenCalled();
    
    // Check that the formatPromptWithContext was called with the correct first argument
    expect(mockPromptFormatter.formatPromptWithContext.mock.calls[0][0]).toBe('What is quantum physics?');
    
    // The model should be called with a prompt containing history
    const modelCall = mockModel.complete.mock.calls[0];
    expect(modelCall[0]).toBe('You are a helpful assistant');
    expect(modelCall[1]).toContain('Recent Conversation History:');
    expect(modelCall[1]).toContain('User: Previous question');
    
    // The response should be recorded in conversation memory
    expect(mockMemory.addTurn).toHaveBeenCalledWith(
      'What is quantum physics?',
      response.answer,
    );
  });
});