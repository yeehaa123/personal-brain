# Protocol Response Simplification Plan

## Goals

1. Simplify the `BrainProtocol` by delegating metadata generation to the Claude model
2. Use Claude's schema capabilities to generate structured responses
3. Provide both a standard response format and a custom schema option
4. Significantly reduce code complexity in the protocol layer

## Current Approach

Currently, the BrainProtocol:
1. Collects relevant context from multiple sources (notes, external, profile)
2. Manually formats this context into a prompt
3. Gets a plain text answer from the model
4. Manually constructs a response with metadata extracted from the context sources
5. Returns a verbose response with multiple fields

## Proposed Solution

Instead, we'll:
1. Still collect context from various sources
2. Provide this context to Claude in a formatted prompt
3. Let Claude generate both the answer and metadata in a consistent structure
4. Provide an alternative method for users to specify custom schemas when needed

## Standard Response Schema

For most use cases, we'll use a consistent schema that covers the common needs:

```typescript
import { z } from 'zod';

// Schema for a citation to a note
export const CitationSchema = z.object({
  /** Note ID that was referenced */
  noteId: z.string(),
  /** Title of the referenced note */
  noteTitle: z.string(),
  /** Relevant excerpt from the note */
  excerpt: z.string().optional(),
});

// Schema for an external source
export const ExternalSourceSchema = z.object({
  /** Title of the external source */
  title: z.string(),
  /** Source name (e.g., Wikipedia) */
  source: z.string(),
  /** URL of the source */
  url: z.string().url(),
  /** Relevant excerpt from the source */
  excerpt: z.string().optional(),
});

// Standard schema for model responses
export const StandardResponseSchema = z.object({
  /** The answer to the user's question */
  answer: z.string(),
  /** Metadata about the response */
  metadata: z.object({
    /** Whether any sources were used */
    hasSources: z.boolean(),
    /** Source types used (e.g., 'notes', 'external', 'profile') */
    sourceTypes: z.array(z.enum(['notes', 'external', 'profile'])).optional(),
    /** Citations to notes used */
    citations: z.array(CitationSchema).optional(),
    /** External sources used */
    externalSources: z.array(ExternalSourceSchema).optional(),
    /** Whether profile information was used */
    usedProfile: z.boolean().optional(),
    /** Brief explanation of sources used */
    sourceExplanation: z.string().optional(),
  }),
});

// Type derived from schema
export type StandardResponse = z.infer<typeof StandardResponseSchema>;
```

## Custom Schema Option

For specialized use cases, we'll allow users to provide their own schema:

```typescript
/**
 * Process a query using a custom schema
 * @param query The user query
 * @param schema Custom Zod schema for the response
 * @param systemPrompt Custom system prompt (optional)
 * @returns Response validated against the custom schema
 */
async processQueryWithSchema<T extends z.ZodTypeAny>(
  query: string, 
  schema: T, 
  systemPrompt?: string
): Promise<z.infer<T>> {
  // Similar context collection logic as standard processQuery
  
  // Use provided schema and system prompt
  const modelResponse = await this.model.complete({
    systemPrompt: systemPrompt ?? this.defaultSystemPrompt,
    userPrompt: formattedPrompt,
    schema,
  });
  
  // Return response validated against custom schema
  return modelResponse.object;
}
```

## Implementation in BrainProtocol

Here's how we'll update the main processQuery method to use the standard schema:

```typescript
/**
 * Process a user query with standard response format
 * @param query The user query
 * @param options Optional parameters
 * @returns Standardized response with answer and metadata
 */
async processQuery(query: string, options?: QueryOptions): Promise<StandardResponse> {
  // Input validation and initialization
  if (!isNonEmptyString(query)) {
    query = 'What information do you have in this brain?';
  }

  // Set up conversation
  if (options?.roomId) {
    await this.setCurrentRoom(options.roomId);
  }
  if (!this.currentConversationId) {
    await this.initializeConversation();
  }

  // 1. Collect context from various sources
  const isProfileQuery = this.profileAnalyzer.isProfileQuery(query);
  let profileRelevance = 0;
  if (this.profile?.embedding) {
    profileRelevance = await this.profileAnalyzer.getProfileRelevance(query, this.profile);
  }

  const relevantNotes = await this.noteService.fetchRelevantContext(query);
  const externalResults = this.useExternalSources ? 
    await this.externalSourceService.fetchExternalContext(query) : [];

  // 2. Get conversation history if available
  const conversationHistory = this.currentConversationId ? 
    await this.conversationContext.formatHistoryForPrompt(this.currentConversationId) : '';

  // 3. Format the context for the model
  const includeProfile = isProfileQuery || profileRelevance > relevanceConfig.profileThreshold;
  const formattedPrompt = this.promptFormatter.formatPromptWithContext(
    query,
    relevantNotes,
    externalResults,
    includeProfile,
    this.profile,
    conversationHistory,
  );

  // 4. Generate system prompt for standard schema
  const systemPrompt = this.generateStandardSystemPrompt();

  // 5. Query the model with the standard schema
  const modelResponse = await this.model.complete({
    systemPrompt,
    userPrompt: formattedPrompt,
    schema: StandardResponseSchema,
  });

  // 6. Save the conversation turn
  try {
    if (this.currentConversationId) {
      await this.saveTurn(query, modelResponse.object.answer, options);
    }
  } catch (error) {
    this.logger.warn('Failed to save conversation turn:', error);
  }

  // 7. Return the structured response
  return modelResponse.object;
}

/**
 * Generate system prompt for standard schema
 */
private generateStandardSystemPrompt(): string {
  return `
You are a helpful assistant with access to a personal knowledge base.
When answering questions, use the provided context information if relevant.
Structure your response according to the schema provided.

For the 'answer' field:
- Provide a clear, direct, and helpful response to the query
- Use information from the context when relevant
- Be concise but complete

For the 'metadata' object:
- The 'hasSources' field should be true if you referenced any notes, external sources, or profile information
- The 'sourceTypes' field should list the types of sources used (e.g., 'notes', 'external', 'profile')
- The 'citations' field should include references to any notes you used in your answer
- The 'externalSources' field should include references to any external sources you used
- The 'usedProfile' field should be true if you referenced profile information
- The 'sourceExplanation' field should briefly explain how you used the sources

Always prioritize accuracy and relevance in your answer.
`;
}
```

## Test-Driven Development

We'll write tests for both the standard and custom schema approaches:

```typescript
// Test standard schema responses
describe('BrainProtocol with standard schema', () => {
  let protocol: BrainProtocol;
  
  beforeEach(() => {
    BrainProtocol.resetInstance();
    protocol = BrainProtocol.createFresh();
  });
  
  test('should return standard response for queries without sources', async () => {
    // Mock no relevant sources
    mock.spyOn(protocol['noteService'], 'fetchRelevantContext').mockResolvedValue([]);
    
    // Mock model response
    mock.spyOn(protocol['model'], 'complete').mockResolvedValue({
      object: {
        answer: 'This is a test answer.',
        metadata: {
          hasSources: false,
        },
      },
    });
    
    const response = await protocol.processQuery('Test query');
    
    // Check response structure
    expect(response.answer).toBe('This is a test answer.');
    expect(response.metadata.hasSources).toBe(false);
    expect(response.metadata.sourceTypes).toBeUndefined();
  });
  
  test('should include notes metadata when notes are used', async () => {
    // Mock relevant notes
    const mockNotes = [createMockNote('note1', 'Test Note', ['test'], 'Test content')];
    mock.spyOn(protocol['noteService'], 'fetchRelevantContext').mockResolvedValue(mockNotes);
    
    // Mock model response
    mock.spyOn(protocol['model'], 'complete').mockResolvedValue({
      object: {
        answer: 'Answer with note references.',
        metadata: {
          hasSources: true,
          sourceTypes: ['notes'],
          citations: [
            {
              noteId: 'note1',
              noteTitle: 'Test Note',
              excerpt: 'Test content',
            },
          ],
        },
      },
    });
    
    const response = await protocol.processQuery('Tell me about test notes');
    
    // Check response structure
    expect(response.answer).toBe('Answer with note references.');
    expect(response.metadata.hasSources).toBe(true);
    expect(response.metadata.sourceTypes).toContain('notes');
    expect(response.metadata.citations).toHaveLength(1);
    expect(response.metadata.citations?.[0].noteId).toBe('note1');
  });
  
  test('should include external sources when used', async () => {
    // Enable external sources
    protocol['useExternalSources'] = true;
    
    // Mock external sources
    const mockExternalResults = [
      { title: 'External Test', source: 'Wikipedia', url: 'https://example.com', content: 'External content' },
    ];
    mock.spyOn(protocol['externalSourceService'], 'fetchExternalContext').mockResolvedValue(mockExternalResults);
    
    // Mock model response
    mock.spyOn(protocol['model'], 'complete').mockResolvedValue({
      object: {
        answer: 'Answer with external references.',
        metadata: {
          hasSources: true,
          sourceTypes: ['external'],
          externalSources: [
            {
              title: 'External Test',
              source: 'Wikipedia',
              url: 'https://example.com',
              excerpt: 'External content',
            },
          ],
        },
      },
    });
    
    const response = await protocol.processQuery('Tell me about external topics');
    
    // Check response structure
    expect(response.answer).toBe('Answer with external references.');
    expect(response.metadata.hasSources).toBe(true);
    expect(response.metadata.sourceTypes).toContain('external');
    expect(response.metadata.externalSources).toHaveLength(1);
    expect(response.metadata.externalSources?.[0].source).toBe('Wikipedia');
  });
});

// Test custom schema approach
describe('BrainProtocol with custom schemas', () => {
  let protocol: BrainProtocol;
  
  beforeEach(() => {
    BrainProtocol.resetInstance();
    protocol = BrainProtocol.createFresh();
  });
  
  test('should process query with custom schema', async () => {
    // Define a custom schema
    const CustomSchema = z.object({
      summary: z.string(),
      keyPoints: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    });
    
    // Mock model response
    mock.spyOn(protocol['model'], 'complete').mockResolvedValue({
      object: {
        summary: 'This is a summary.',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        confidence: 0.85,
      },
    });
    
    const response = await protocol.processQueryWithSchema(
      'Summarize this topic',
      CustomSchema,
      'You are a helpful assistant. Provide a summary, key points, and confidence level.'
    );
    
    // Check response matches custom schema
    expect(response.summary).toBe('This is a summary.');
    expect(response.keyPoints).toHaveLength(3);
    expect(response.confidence).toBe(0.85);
  });
  
  test('should validate response against custom schema', async () => {
    // Define a custom schema with validation
    const ValidationSchema = z.object({
      number: z.number().min(1).max(10),
      text: z.string().min(5),
    });
    
    // Mock an invalid response
    mock.spyOn(protocol['model'], 'complete').mockResolvedValue({
      object: {
        number: 0, // Invalid: below minimum
        text: 'Hi', // Invalid: too short
      },
    });
    
    // Should throw validation error
    await expect(protocol.processQueryWithSchema(
      'Test validation',
      ValidationSchema
    )).rejects.toThrow();
  });
});
```

## Renderer for Standard Responses

We'll update the renderers to handle the standard response format:

```typescript
// CLI Renderer for standard responses
class StandardCLIRenderer {
  renderStandardResponse(response: StandardResponse): void {
    // Always show the answer
    CLIInterface.displayTitle('Answer');
    CLIInterface.print(response.answer);
    
    // If sources were used, show metadata
    if (response.metadata.hasSources) {
      CLIInterface.print('');
      
      // Build source summary
      const sourceTypes = response.metadata.sourceTypes || [];
      const summary: string[] = [];
      
      if (sourceTypes.includes('notes')) {
        const count = response.metadata.citations?.length || 0;
        summary.push(`${count} note${count !== 1 ? 's' : ''}`);
      }
      
      if (sourceTypes.includes('external')) {
        const count = response.metadata.externalSources?.length || 0;
        summary.push(`${count} external source${count !== 1 ? 's' : ''}`);
      }
      
      if (sourceTypes.includes('profile')) {
        summary.push('profile information');
      }
      
      if (summary.length > 0) {
        CLIInterface.info(`Sources used: ${summary.join(', ')}`);
        
        // Show explanation if available
        if (response.metadata.sourceExplanation) {
          CLIInterface.print(response.metadata.sourceExplanation);
        }
      }
      
      // Show citations if available
      if (response.metadata.citations && response.metadata.citations.length > 0) {
        CLIInterface.displaySubtitle('Citations');
        response.metadata.citations.forEach((citation, index) => {
          CLIInterface.print(`${index + 1}. ${citation.noteTitle} (${citation.noteId})`);
          if (citation.excerpt) {
            CLIInterface.print(`   "${citation.excerpt}"`);
          }
          CLIInterface.print('');
        });
      }
      
      // Show external sources if available
      if (response.metadata.externalSources && response.metadata.externalSources.length > 0) {
        CLIInterface.displaySubtitle('External Sources');
        response.metadata.externalSources.forEach((source, index) => {
          CLIInterface.print(`${index + 1}. ${source.title} (${source.source})`);
          CLIInterface.print(`   URL: ${source.url}`);
          if (source.excerpt) {
            CLIInterface.print(`   "${source.excerpt}"`);
          }
          CLIInterface.print('');
        });
      }
    }
  }
}
```

## Benefits of This Approach

1. **Simplicity**: A standard schema handles most common cases
2. **Consistency**: Responses follow a predictable structure
3. **Flexibility**: Custom schemas available for specialized needs
4. **Reduced Code**: No need to manually extract and format metadata
5. **Future-Proof**: Can easily extend the standard schema as needed

## Implementation Plan

1. **Define Standard Schema**: Implement the standard response schema
2. **Update BrainProtocol**: Modify processQuery to use the standard schema
3. **Add Custom Schema Support**: Implement processQueryWithSchema for specialized use cases
4. **Update System Prompts**: Create prompts that instruct Claude on using the schemas
5. **Update Renderers**: Modify renderers to handle the standard response format
6. **Add Tests**: Implement tests for both standard and custom schema approaches

## Conclusion

This two-tier approach offers a good balance of simplicity and flexibility:

1. **Standard Schema**: A consistent format that works for most queries
2. **Custom Schema**: Escape hatch for specialized use cases

By delegating metadata generation to Claude while maintaining a consistent structure, we can significantly simplify the BrainProtocol while keeping it flexible for various use cases.