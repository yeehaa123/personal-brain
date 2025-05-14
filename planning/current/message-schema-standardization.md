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

## Implementation Plan

### Phase 1: Define Message Parameter Schemas

1. **Create a new file `messageSchemas.ts` in the messaging directory**:
   ```typescript
   // src/protocol/messaging/messageSchemas.ts
   import { z } from 'zod';
   
   /**
    * Schema definitions for message parameters
    * These schemas define the structure and validation rules for message parameters
    */
   
   // Schema for NOTE_BY_ID request parameters
   export const NoteByIdParamsSchema = z.object({
     id: z.string().min(1, 'Note ID is required'),
   });
   
   // Schema for NOTES_SEARCH request parameters
   export const NotesSearchParamsSchema = z.object({
     query: z.string().min(1, 'Search query is required'),
     limit: z.number().int().positive().optional(),
     includeContent: z.boolean().optional().default(true),
   });
   
   // Schema for NOTES_SEMANTIC_SEARCH request parameters
   export const NotesSemanticSearchParamsSchema = z.object({
     text: z.string().min(1, 'Search text is required'),
     limit: z.number().int().positive().optional().default(10),
     tags: z.array(z.string()).optional(),
   });
   
   // Schema for PROFILE_DATA request parameters
   export const ProfileDataParamsSchema = z.object({
     includeAll: z.boolean().optional().default(true),
     fields: z.array(z.string()).optional(),
   });
   
   // Schema for note creation notification payload
   export const NoteCreatedPayloadSchema = z.object({
     noteId: z.string().min(1),
     title: z.string(),
     tags: z.array(z.string()).optional(),
   });
   
   // Schema for note update notification payload
   export const NoteUpdatedPayloadSchema = z.object({
     noteId: z.string().min(1),
     title: z.string().optional(),
     tags: z.array(z.string()).optional(),
   });
   
   // Schema for note deletion notification payload
   export const NoteDeletedPayloadSchema = z.object({
     noteId: z.string().min(1),
   });
   
   // Add schemas for other message types...
   
   // Export derived types
   export type NoteByIdParams = z.infer<typeof NoteByIdParamsSchema>;
   export type NotesSearchParams = z.infer<typeof NotesSearchParamsSchema>;
   export type NotesSemanticSearchParams = z.infer<typeof NotesSemanticSearchParamsSchema>;
   export type ProfileDataParams = z.infer<typeof ProfileDataParamsSchema>;
   export type NoteCreatedPayload = z.infer<typeof NoteCreatedPayloadSchema>;
   export type NoteUpdatedPayload = z.infer<typeof NoteUpdatedPayloadSchema>;
   export type NoteDeletedPayload = z.infer<typeof NoteDeletedPayloadSchema>;
   ```

2. **Create a schema registry to map message types to their schemas**:
   ```typescript
   // Add to messageSchemas.ts
   
   import { DataRequestType, NotificationType } from './messageTypes';
   
   /**
    * Registry mapping message types to their parameter schemas
    */
   export const MessageSchemaRegistry = {
     // Request parameter schemas
     [DataRequestType.NOTE_BY_ID]: NoteByIdParamsSchema,
     [DataRequestType.NOTES_SEARCH]: NotesSearchParamsSchema,
     [DataRequestType.NOTES_SEMANTIC_SEARCH]: NotesSemanticSearchParamsSchema,
     [DataRequestType.PROFILE_DATA]: ProfileDataParamsSchema,
     
     // Notification payload schemas
     [NotificationType.NOTE_CREATED]: NoteCreatedPayloadSchema,
     [NotificationType.NOTE_UPDATED]: NoteUpdatedPayloadSchema,
     [NotificationType.NOTE_DELETED]: NoteDeletedPayloadSchema,
     
     // Add mappings for other message types...
   } as const;
   ```

### Phase 2: Create Validation Utilities

1. **Create validation utility functions**:
   ```typescript
   // Add to messageSchemas.ts
   
   import type { DataRequestMessage, NotificationMessage } from './messageTypes';
   
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
     const schema = MessageSchemaRegistry[message.dataType as DataRequestType];
     
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
         const errorMessage = error.errors.map(e => 
           `${e.path.join('.')}: ${e.message}`
         ).join('; ');
         
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
     const schema = MessageSchemaRegistry[message.notificationType as NotificationType];
     
     if (!schema) {
       return {
         success: false,
         errorMessage: `No schema defined for notification type: ${message.notificationType}`,
       };
     }
     
     try {
       const payload = message.payload || {};
       const result = schema.parse(payload) as T;
       
       return {
         success: true,
         data: result,
       };
     } catch (error) {
       // Similar error handling as validateRequestParams
       // ...
     }
   }
   ```

### Phase 3: Enhance MessageFactory with Validation

1. **Update MessageFactory to include validation**:
   ```typescript
   // Add to messageFactory.ts
   
   import { validateRequestParams, validateNotificationPayload } from './messageSchemas';
   import type { ValidationOptions } from './messageSchemas';
   
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
     // Create a temporary message to validate
     const tempMessage = this.createNotification(
       sourceContext,
       targetContext,
       notificationType,
       payload,
       requiresAck,
     );
     
     // Validate the payload
     const validationResult = validateNotificationPayload<T>(tempMessage, {
       throwOnError: false,
       ...options,
     });
     
     if (!validationResult.success) {
       return validationResult;
     }
     
     // Payload is valid, return the message
     return tempMessage;
   }
   ```

### Phase 4: Update Message Handlers to Use Schema Validation

1. **Update NoteMessageHandler as an example**:
   ```typescript
   // in src/contexts/notes/messaging/noteMessageHandler.ts
   
   import { 
     NoteByIdParams, 
     NotesSearchParams,
     NotesSemanticSearchParams,
     validateRequestParams, 
     validateNotificationPayload 
   } from '@/protocol/messaging/messageSchemas';
   
   // Update handleNoteById method
   private async handleNoteById(request: DataRequestMessage) {
     try {
       // Validate parameters using schema
       const validation = validateRequestParams<NoteByIdParams>(request);
       
       if (!validation.success) {
         return MessageFactory.createErrorResponse(
           ContextId.NOTES,
           request.sourceContext,
           request.id,
           'VALIDATION_ERROR',
           validation.errorMessage || 'Invalid parameters',
         );
       }
       
       // Now we have type-safe access to the validated parameters
       const { id } = validation.data;
       
       const note = await this.noteContext.getNoteById(id);
       
       if (!note) {
         return MessageFactory.createErrorResponse(
           ContextId.NOTES,
           request.sourceContext,
           request.id,
           'NOTE_NOT_FOUND',
           `Note with ID ${id} not found`,
         );
       }
       
       return MessageFactory.createSuccessResponse(
         ContextId.NOTES,
         request.sourceContext,
         request.id,
         { note },
       );
     } catch (error) {
       return MessageFactory.createErrorResponse(
         ContextId.NOTES,
         request.sourceContext,
         request.id,
         'READ_ERROR',
         `Error retrieving note: ${error instanceof Error ? error.message : String(error)}`,
       );
     }
   }
   
   // Update handleNotesSearch method
   private async handleNotesSearch(request: DataRequestMessage) {
     try {
       // Validate parameters using schema
       const validation = validateRequestParams<NotesSearchParams>(request);
       
       if (!validation.success) {
         return MessageFactory.createErrorResponse(
           ContextId.NOTES,
           request.sourceContext,
           request.id,
           'VALIDATION_ERROR',
           validation.errorMessage || 'Invalid parameters',
         );
       }
       
       // Now we have type-safe access to the validated parameters
       const { query, limit, includeContent } = validation.data;
       
       // Create a search options object
       const searchOptions = {
         query,
         limit,
         includeContent,
         semanticSearch: true, 
       };
       
       // Search notes using the options object
       const notes = await this.noteContext.searchNotes(searchOptions);
       
       return MessageFactory.createSuccessResponse(
         ContextId.NOTES,
         request.sourceContext,
         request.id,
         { notes },
       );
     } catch (error) {
       return MessageFactory.createErrorResponse(
         ContextId.NOTES,
         request.sourceContext,
         request.id,
         'SEARCH_ERROR',
         `Error searching notes: ${error instanceof Error ? error.message : String(error)}`,
       );
     }
   }
   
   // Update handleNoteSemanticSearch method
   private async handleNoteSemanticSearch(request: DataRequestMessage) {
     try {
       // Validate parameters using schema
       const validation = validateRequestParams<NotesSemanticSearchParams>(request);
       
       if (!validation.success) {
         return MessageFactory.createErrorResponse(
           ContextId.NOTES,
           request.sourceContext,
           request.id,
           'VALIDATION_ERROR',
           validation.errorMessage || 'Invalid parameters',
         );
       }
       
       // Now we have type-safe access to the validated parameters
       const { text, limit, tags } = validation.data;
       
       // Use the searchWithEmbedding method
       const notes = await this.noteContext.searchWithEmbedding(text, limit, tags);
       
       return MessageFactory.createSuccessResponse(
         ContextId.NOTES,
         request.sourceContext,
         request.id,
         { notes },
       );
     } catch (error) {
       return MessageFactory.createErrorResponse(
         ContextId.NOTES,
         request.sourceContext,
         request.id,
         'SEARCH_ERROR',
         `Error in semantic search: ${error instanceof Error ? error.message : String(error)}`,
       );
     }
   }
   ```

2. **Update NoteNotifier as an example**:
   ```typescript
   // in src/contexts/notes/messaging/noteNotifier.ts
   
   import { 
     NoteCreatedPayload, 
     NoteUpdatedPayload,
     NoteDeletedPayload
   } from '@/protocol/messaging/messageSchemas';
   import { validateRequestParams, validateNotificationPayload } from '@/protocol/messaging/messageSchemas';
   
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
   // tests/protocol/messaging/messageSchemas.test.ts
   
   import { 
     NoteByIdParamsSchema, 
     NotesSearchParamsSchema,
     validateRequestParams,
     validateNotificationPayload,
   } from '@/protocol/messaging/messageSchemas';
   import { DataRequestType, MessageFactory } from '@/protocol/messaging';
   
   describe('Message Schemas', () => {
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
     
     describe('validateRequestParams', () => {
       test('should validate valid parameters', () => {
         const message = MessageFactory.createDataRequest(
           'test-source',
           'notes',
           DataRequestType.NOTE_BY_ID,
           { id: 'test-note-id' },
         );
         
         const result = validateRequestParams(message);
         expect(result.success).toBe(true);
         expect(result.data?.id).toBe('test-note-id');
       });
       
       test('should reject invalid parameters', () => {
         const message = MessageFactory.createDataRequest(
           'test-source',
           'notes',
           DataRequestType.NOTE_BY_ID,
           { id: '' }, // Invalid: empty ID
         );
         
         const result = validateRequestParams(message);
         expect(result.success).toBe(false);
         expect(result.errorMessage).toContain('Note ID is required');
       });
     });
     
     // Tests for validateNotificationPayload...
   });
   ```

2. **Integration Tests for Message Handlers**:
   ```typescript
   // tests/contexts/notes/messaging/noteMessageHandler.test.ts
   
   import { NoteMessageHandler } from '@/contexts/notes/messaging/noteMessageHandler';
   import { DataRequestType, MessageFactory } from '@/protocol/messaging';
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
           'notes',
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
           'notes',
           DataRequestType.NOTE_BY_ID,
           {}, // Missing id
         );
         
         // Handle the request
         const response = await handler.handleRequest(request);
         
         // Verify response
         expect(response?.status).toBe('error');
         expect(response?.error?.code).toBe('VALIDATION_ERROR');
       });
     });
     
     // Tests for other handlers...
   });
   ```

### Phase 6: Implementation Strategy

1. **Incremental Rollout**:
   - Start with a single context (e.g., Notes) to validate the approach
   - Gradually roll out to other contexts after confirming success
   - Update unit tests alongside each context update

2. **Backward Compatibility**:
   - Ensure old message formats continue to work by adding fallback validation
   - Add deprecation warnings for non-schema-validated message creation

3. **Documentation**:
   - Add JSDoc comments to all schemas and validation functions
   - Create examples for message handlers to reference

## Benefits

1. **Improved Type Safety**:
   - Static type checking via TypeScript
   - Runtime validation via Zod schemas
   - Elimination of unsafe type casting

2. **Consistent Validation**:
   - Standardized validation rules across all contexts
   - Centralized schema definitions for message parameters
   - Clear validation error messages

3. **Reduced Boilerplate**:
   - Less manual parameter checking in handlers
   - Standardized error handling for validation failures
   - Type-safe access to validated parameters

4. **Better Developer Experience**:
   - IDE autocomplete for message parameters
   - Clear type definitions for message structures
   - Documented parameter constraints

## Risks and Mitigations

1. **Risk**: Breaking existing message handling
   **Mitigation**: Thorough testing and gradual rollout

2. **Risk**: Performance impact of validation
   **Mitigation**: Profile validation overhead and optimize if necessary

3. **Risk**: Excessive boilerplate in schema definitions
   **Mitigation**: Use schema composition and reuse common schemas

4. **Risk**: Learning curve for developers
   **Mitigation**: Provide clear examples and documentation

## Implementation Timeline

1. **Week 1**: Define schemas and validation utilities
2. **Week 2**: Implement Note context validation
3. **Week 3**: Implement Profile context validation
4. **Week 4**: Roll out to remaining contexts
5. **Week 5**: Documentation and final testing