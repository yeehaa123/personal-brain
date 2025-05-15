# Message Schema Standardization Plan

## Current State

After analyzing the codebase, I've identified inconsistencies in how messages between contexts are validated and processed:

1. **Inconsistent Schema Validation**:
   - Some components use Zod schemas for validation (e.g., `WebsiteIdentitySchema` and `StandardResponseSchema`)
   - The cross-context messaging system lacks consistent schema validation
   - Message handlers perform manual parameter checks instead of formalized validation

2. **Manual Type Safety**:
   - Parameters from messages are typically cast to expected types without validation
   - Example: `const query = request.parameters?.['query'] as string;`
   - No guarantee that parameters exist or have the correct type

3. **Disparate Error Handling**:
   - Error responses vary in format and level of detail
   - No standardized way to communicate validation failures

4. **Missing Parameter Schemas**:
   - While message types are well-defined in `messageTypes.ts`, there are no formal schemas for the expected parameters

## Goals

1. **Standardize Message Validation**: Implement consistent schema validation for all inter-context messages
2. **Improve Type Safety**: Ensure compile-time and runtime type checking for message parameters
3. **Consistent Error Handling**: Standardize error responses for validation failures
4. **Reduce Boilerplate**: Make handlers more concise by centralizing validation logic
5. **Maintain Backward Compatibility**: Implement changes without breaking existing functionality
6. **Follow Domain-Driven Design**: Keep validation logic close to the domain logic that uses it

## Schema Location: Hybrid Approach

After considering the tradeoffs, we'll adopt a hybrid approach for schema locations:

1. **Context-Specific Schemas in Each Context**: 
   - Define schemas within the context that owns the data
   - Example file locations:
     ```
     src/contexts/notes/schemas/messageSchemas.ts
     src/contexts/profiles/schemas/messageSchemas.ts
     src/contexts/website/schemas/messageSchemas.ts
     ```

2. **Central Registry in Protocol Layer**:
   - Create a registry that imports and re-exports all schemas
   - Example file location:
     ```
     src/protocol/messaging/schemaRegistry.ts
     ```

This hybrid approach offers several advantages:
- **Local Ownership**: Each context team owns and maintains their schemas
- **Proximity to Implementation**: Schemas are defined close to the code that uses them
- **Domain-Specific Knowledge**: Context experts design schemas
- **Independent Evolution**: Contexts can modify schemas without affecting others
- **Central Discovery**: Registry provides a single point for all schemas
- **Reduced Merge Conflicts**: Changes to different contexts' schemas don't collide

## Implementation Plan

### Phase 1: Define Schema Structure & Registry

1. **Create schema files in each context**:
   ```typescript
   // src/contexts/notes/schemas/messageSchemas.ts
   import { z } from 'zod';
   
   /**
    * Schema for NOTE_BY_ID request parameters
    * Used when requesting a specific note by its ID
    */
   export const NoteByIdParamsSchema = z.object({
     /** Note ID to retrieve */
     id: z.string().min(1, 'Note ID is required'),
   });
   
   /**
    * Schema for NOTES_SEARCH request parameters
    * Used when searching for notes by query text
    */
   export const NotesSearchParamsSchema = z.object({
     /** Search query text */
     query: z.string().min(1, 'Search query is required'),
     /** Maximum number of notes to return */
     limit: z.number().int().positive().optional(),
     /** Whether to include note content in results */
     includeContent: z.boolean().optional().default(true),
   });
   
   // Additional schemas for notes context...
   
   // Export derived types
   export type NoteByIdParams = z.infer<typeof NoteByIdParamsSchema>;
   export type NotesSearchParams = z.infer<typeof NotesSearchParamsSchema>;
   ```

2. **Create a central schema registry**:
   ```typescript
   // src/protocol/messaging/schemaRegistry.ts
   import { z } from 'zod';
   import { DataRequestType, NotificationType } from './messageTypes';
   
   // Import schemas from contexts
   import {
     NoteByIdParamsSchema,
     NotesSearchParamsSchema,
     // Other note schemas...
   } from '@/contexts/notes/schemas/messageSchemas';
   
   import {
     ProfileDataParamsSchema,
     // Other profile schemas...
   } from '@/contexts/profiles/schemas/messageSchemas';
   
   import {
     WebsiteStatusParamsSchema,
     // Other website schemas...
   } from '@/contexts/website/schemas/messageSchemas';
   
   // Re-export all schemas for convenience
   export {
     NoteByIdParamsSchema,
     NotesSearchParamsSchema,
     ProfileDataParamsSchema,
     WebsiteStatusParamsSchema,
     // Other schemas...
   };
   
   // Re-export all types
   export type {
     NoteByIdParams,
     NotesSearchParams,
     ProfileDataParams,
     WebsiteStatusParams,
     // Other types...
   };
   
   /**
    * Registry mapping message types to their parameter schemas
    * This provides a way to look up the appropriate schema for a given message type
    */
   export const MessageSchemaRegistry = {
     // Request parameter schemas
     [DataRequestType.NOTE_BY_ID]: NoteByIdParamsSchema,
     [DataRequestType.NOTES_SEARCH]: NotesSearchParamsSchema,
     [DataRequestType.PROFILE_DATA]: ProfileDataParamsSchema,
     [DataRequestType.WEBSITE_STATUS]: WebsiteStatusParamsSchema,
     
     // Notification payload schemas
     [NotificationType.NOTE_CREATED]: NoteCreatedPayloadSchema,
     [NotificationType.NOTE_UPDATED]: NoteUpdatedPayloadSchema,
     // Other mappings...
   } as const;
   ```

### Phase 2: Create Validation Utilities

1. **Create validation utility functions**:
   ```typescript
   // src/protocol/messaging/validation.ts
   import { z } from 'zod';
   import type { 
     DataRequestMessage, 
     NotificationMessage,
   } from './messageTypes';
   import { MessageSchemaRegistry } from './schemaRegistry';
   
   /**
    * Options for validation functions
    */
   export interface ValidationOptions {
     /** Whether to throw errors on validation failure */
     throwOnError?: boolean;
   }
   
   /**
    * Validation result type
    */
   export interface ValidationResult<T> {
     /** Whether validation was successful */
     success: boolean;
     /** Parsed and validated data (if successful) */
     data?: T;
     /** Validation error (if unsuccessful) */
     error?: z.ZodError;
     /** Formatted error message */
     errorMessage?: string;
   }
   
   /**
    * Validate request parameters against their schema
    * 
    * @param message The request message to validate
    * @param options Validation options
    * @returns Validation result with parsed data or error
    */
   export function validateRequestParams<T>(
     message: DataRequestMessage,
     options: ValidationOptions = {},
   ): ValidationResult<T> {
     const schema = MessageSchemaRegistry[message.dataType];
     
     if (!schema) {
       return {
         success: false,
         errorMessage: `No schema defined for request type: ${message.dataType}`,
       };
     }
     
     try {
       const params = message.parameters || {};
       const result = schema.parse(params) as T;
       
       return {
         success: true,
         data: result,
       };
     } catch (error) {
       if (error instanceof z.ZodError) {
         const errorMessage = formatZodError(error);
         
         if (options.throwOnError) {
           throw error;
         }
         
         return {
           success: false,
           error,
           errorMessage,
         };
       }
       
       // Non-Zod error (should not happen with well-formed messages)
       const errorMessage = error instanceof Error ? error.message : String(error);
       
       if (options.throwOnError) {
         throw error;
       }
       
       return {
         success: false,
         errorMessage,
       };
     }
   }
   
   /**
    * Validate notification payload against its schema
    * 
    * @param message The notification message to validate
    * @param options Validation options
    * @returns Validation result with parsed data or error
    */
   export function validateNotificationPayload<T>(
     message: NotificationMessage,
     options: ValidationOptions = {},
   ): ValidationResult<T> {
     // Similar implementation as validateRequestParams
     // ...
   }
   
   /**
    * Format a Zod error into a readable message
    * 
    * @param error Zod validation error
    * @returns Formatted error message
    */
   function formatZodError(error: z.ZodError): string {
     return error.errors.map(e => 
       `${e.path.join('.')}: ${e.message}`
     ).join('; ');
   }
   ```

### Phase 3: Enhance MessageFactory with Validation

1. **Update MessageFactory to include validation**:
   ```typescript
   // Add to messageFactory.ts
   
   import { 
     validateRequestParams, 
     validateNotificationPayload,
     type ValidationOptions,
     type ValidationResult,
   } from './validation';
   
   // Add methods to MessageFactory class
   
   /**
    * Create a data request message with parameter validation
    *
    * @param sourceContext Source context identifier
    * @param targetContext Target context identifier
    * @param dataType Type of data being requested
    * @param parameters Request parameters
    * @param options Validation options
    * @param timeout Optional timeout in milliseconds
    * @returns Data request message or validation error
    */
   static createValidatedDataRequest<T>(
     sourceContext: string,
     targetContext: string,
     dataType: DataRequestType,
     parameters: Record<string, unknown>,
     options: ValidationOptions = {},
     timeout?: number,
   ): DataRequestMessage | ValidationResult<T> {
     // Create a temporary message to validate
     const tempMessage = this.createDataRequest(
       sourceContext,
       targetContext,
       dataType,
       parameters,
       timeout,
     );
     
     // Validate the parameters
     const validationResult = validateRequestParams<T>(tempMessage, {
       throwOnError: false,
       ...options,
     });
     
     if (!validationResult.success) {
       return validationResult;
     }
     
     // Parameters are valid, return the message
     return tempMessage;
   }
   
   /**
    * Create a notification message with payload validation
    *
    * @param sourceContext Source context identifier
    * @param targetContext Target context identifier
    * @param notificationType Type of notification
    * @param payload Notification payload
    * @param options Validation options
    * @param requiresAck Whether acknowledgment is required
    * @returns Notification message or validation error
    */
   static createValidatedNotification<T>(
     sourceContext: string,
     targetContext: string,
     notificationType: NotificationType,
     payload: Record<string, unknown>,
     options: ValidationOptions = {},
     requiresAck: boolean = false,
   ): NotificationMessage | ValidationResult<T> {
     // Implementation similar to createValidatedDataRequest
     // ...
   }
   ```

### Phase 4: Update Message Handlers to Use Schema Validation

1. **Update NoteMessageHandler as an example**:
   ```typescript
   // in src/contexts/notes/messaging/noteMessageHandler.ts
   
   import { 
     type NoteByIdParams, 
     type NotesSearchParams,
     type NotesSemanticSearchParams,
   } from '@/protocol/messaging/schemaRegistry';
   import { validateRequestParams } from '@/protocol/messaging/validation';
   
   // Update handleNoteById method
   private async handleNoteById(request: DataRequestMessage) {
     try {
       // Validate parameters using schema
       const validation = validateRequestParams<NoteByIdParams>(request);
       
       if (!validation.success) {
         return MessageFactory.createErrorResponse(
           request.id,
           ContextId.NOTES,
           request.sourceContext,
           validation.errorMessage || 'Invalid parameters',
           'VALIDATION_ERROR',
         );
       }
       
       // Now we have type-safe access to the validated parameters
       const { id } = validation.data;
       
       const note = await this.noteContext.getNoteById(id);
       
       if (!note) {
         return MessageFactory.createErrorResponse(
           request.id,
           ContextId.NOTES,
           request.sourceContext,
           `Note with ID ${id} not found`,
           'NOTE_NOT_FOUND',
         );
       }
       
       return MessageFactory.createDataResponse(
         request.id,
         ContextId.NOTES,
         request.sourceContext,
         'note', 
         note,
       );
     } catch (error) {
       return MessageFactory.createErrorResponse(
         request.id,
         ContextId.NOTES,
         request.sourceContext,
         `Error retrieving note: ${error instanceof Error ? error.message : String(error)}`,
         'READ_ERROR',
       );
     }
   }
   
   // Similar updates for other handlers...
   ```

2. **Update NoteNotifier as an example**:
   ```typescript
   // in src/contexts/notes/messaging/noteNotifier.ts
   
   import { 
     type NoteCreatedPayload,
   } from '@/protocol/messaging/schemaRegistry';
   
   // Update notifyNoteCreated method
   async notifyNoteCreated(note: Note): Promise<void> {
     const payload: NoteCreatedPayload = {
       noteId: note.id,
       title: note.title,
       tags: note.tags,
     };
     
     const notification = MessageFactory.createNotification(
       ContextId.NOTES,
       '*', // broadcast to all contexts
       NotificationType.NOTE_CREATED,
       payload,
     );
     
     await this.mediator.sendNotification(notification);
   }
   
   // Similar updates for other notification methods
   ```

### Phase 5: Testing Strategy

1. **Unit Tests for Schemas**:
   ```typescript
   // tests/contexts/notes/schemas/messageSchemas.test.ts
   
   import { 
     NoteByIdParamsSchema, 
     NotesSearchParamsSchema,
   } from '@/contexts/notes/schemas/messageSchemas';
   
   describe('Note Message Schemas', () => {
     describe('NoteByIdParamsSchema', () => {
       test('should validate valid note ID parameters', () => {
         const result = NoteByIdParamsSchema.safeParse({ id: 'test-note-id' });
         expect(result.success).toBe(true);
       });
       
       test('should reject empty note ID', () => {
         const result = NoteByIdParamsSchema.safeParse({ id: '' });
         expect(result.success).toBe(false);
       });
       
       test('should reject missing note ID', () => {
         const result = NoteByIdParamsSchema.safeParse({});
         expect(result.success).toBe(false);
       });
     });
     
     // Tests for other schemas...
   });
   ```

2. **Integration Tests for Message Handlers**:
   ```typescript
   // tests/contexts/notes/messaging/noteMessageHandler.test.ts
   
   import { NoteMessageHandler } from '@/contexts/notes/messaging/noteMessageHandler';
   import { DataRequestType, MessageFactory } from '@/protocol/messaging';
   import { ContextId } from '@/protocol/core/contextOrchestrator';
   import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
   
   describe('NoteMessageHandler', () => {
     let noteContext: MockNoteContext;
     let handler: NoteMessageHandler;
     
     beforeEach(() => {
       // Reset all instances and mocks
       NoteMessageHandler.resetInstance();
       noteContext = MockNoteContext.createFresh();
       
       // Create a fresh handler instance for testing
       handler = NoteMessageHandler.createFresh(noteContext);
     });
     
     describe('handleNoteById', () => {
       test('should handle valid note ID request', async () => {
         // Mock the note context to return a test note
         const testNote = { id: 'test-note-id', title: 'Test Note', content: 'Test content' };
         noteContext.getNoteById = jest.fn().mockResolvedValue(testNote);
         
         // Create a test request
         const request = MessageFactory.createDataRequest(
           'test-source',
           ContextId.NOTES,
           DataRequestType.NOTE_BY_ID,
           { id: 'test-note-id' },
         );
         
         // Handle the request
         const response = await handler.handleRequest(request);
         
         // Verify response
         expect(response?.status).toBe('success');
         expect(response?.data?.note).toEqual(testNote);
       });
       
       test('should reject request with invalid parameters', async () => {
         // Create a test request with invalid parameters
         const request = MessageFactory.createDataRequest(
           'test-source',
           ContextId.NOTES,
           DataRequestType.NOTE_BY_ID,
           {}, // Missing id
         );
         
         // Handle the request
         const response = await handler.handleRequest(request);
         
         // Verify response
         expect(response?.status).toBe('error');
         expect(response?.error?.code).toBe('VALIDATION_ERROR');
         expect(response?.error?.message).toContain('Note ID is required');
       });
     });
     
     // Tests for other handlers...
   });
   ```

3. **Tests for Schema Registry**:
   ```typescript
   // tests/protocol/messaging/schemaRegistry.test.ts
   
   import { MessageSchemaRegistry } from '@/protocol/messaging/schemaRegistry';
   import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';
   
   describe('MessageSchemaRegistry', () => {
     test('should have schema for each DataRequestType', () => {
       // Check that all request types have a schema
       Object.values(DataRequestType).forEach(type => {
         expect(MessageSchemaRegistry[type]).toBeDefined();
       });
     });
     
     test('should have schema for each NotificationType', () => {
       // Check that all notification types have a schema
       Object.values(NotificationType).forEach(type => {
         expect(MessageSchemaRegistry[type]).toBeDefined();
       });
     });
   });
   ```

### Phase 6: Implementation Strategy

1. **Incremental Rollout**:
   - Start with the schema registry structure
   - Implement one context (Notes) first as a proof of concept
   - Gradually expand to other contexts
   - Focus on high-value/high-risk message types first

2. **Backward Compatibility**:
   - Keep original message handlers working with manual validation
   - Add new validated versions with clear deprecation notices
   - Set a timeline for removing the old versions

3. **Documentation**:
   - Add JSDoc comments to all schemas
   - Create examples in README files within each context
   - Document the validation process for new developers

## Benefits

1. **Improved Type Safety**:
   - Static type checking via TypeScript
   - Runtime validation via Zod schemas
   - Elimination of unsafe type casting

2. **Consistent Validation**:
   - Standardized validation rules across all contexts
   - Domain-driven schema organization
   - Clear validation error messages

3. **Reduced Boilerplate**:
   - Less manual parameter checking in handlers
   - Standardized error handling for validation failures
   - Type-safe access to validated parameters

4. **Better Developer Experience**:
   - IDE autocomplete for message parameters
   - Clear type definitions for message structures
   - Documented parameter constraints

5. **Domain Ownership**:
   - Each context team owns their schemas
   - Changes can be made independently
   - Reduced merge conflicts

## Risks and Mitigations

1. **Risk**: Breaking existing message handling
   **Mitigation**: Thorough testing and gradual rollout

2. **Risk**: Performance impact of validation
   **Mitigation**: Profile validation overhead and optimize if necessary

3. **Risk**: Discovery challenges with distributed schemas
   **Mitigation**: Central registry with re-exports for easy imports

4. **Risk**: Inconsistent schema design across contexts
   **Mitigation**: Provide schema templates and documentation

## Implementation Timeline

1. **Week 1**: Create schema structure and registry
2. **Week 2**: Implement Notes context validation as proof of concept
3. **Week 3**: Implement Profile context validation
4. **Week 4**: Roll out to remaining contexts
5. **Week 5**: Documentation, testing, and cleanup