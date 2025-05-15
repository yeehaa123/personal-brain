# Message Schema System

This document describes the schema validation system for cross-context messaging in the Personal Brain application.

## Overview

The Message Schema System provides a standardized way to validate messages exchanged between contexts. It follows a domain-driven design approach, where each context defines its own schemas, while a central registry collects and organizes all schemas for easy access.

Currently implemented in these contexts:
- Notes Context: For note-related operations and notifications
- Profiles Context: For profile-related operations and notifications 
- Website Context: For website status, generation, and deployment operations
- Conversation Context: For chat history, tiered memory, and conversation persistence

## Key Components

### 1. Context-Specific Schema Files

Each context defines its own schemas in a dedicated file:

```
src/contexts/[context-name]/schemas/messageSchemas.ts
```

These files contain:
- Zod schemas for request parameters
- Zod schemas for notification payloads
- TypeScript types derived from schemas
- A schema map that links message types to schemas

Example for Notes Context:
```typescript
// src/contexts/notes/schemas/messageSchemas.ts
import { z } from 'zod';
import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';

// Schema for NOTE_BY_ID request parameters
export const NoteByIdParamsSchema = z.object({
  id: z.string().min(1, 'Note ID is required'),
});

// Map of message types to schemas
export const NoteSchemaMap = {
  [DataRequestType.NOTE_BY_ID]: NoteByIdParamsSchema,
  // Other schemas...
};

// Export derived types
export type NoteByIdParams = z.infer<typeof NoteByIdParamsSchema>;
```

Example for Profiles Context:
```typescript
// src/contexts/profiles/schemas/messageSchemas.ts
import { z } from 'zod';
import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';
import { profileSchema } from '@/models/profile';

// Schema for PROFILE_DATA request parameters
export const ProfileDataParamsSchema = z.object({}).optional();

// Schema for profile update tool parameters
export const ProfileUpdateParamsSchema = z.object({
  profile: profileSchema,
});

// Map of message types to schemas
export const ProfileSchemaMap = {
  [DataRequestType.PROFILE_DATA]: ProfileDataParamsSchema,
  'profile.update': ProfileUpdateParamsSchema,
  // Other schemas...
};

// Export derived types
export type ProfileDataParams = z.infer<typeof ProfileDataParamsSchema>;
export type ProfileUpdateParams = z.infer<typeof ProfileUpdateParamsSchema>;
```

Example for Website Context:
```typescript
// src/contexts/website/schemas/messageSchemas.ts
import { z } from 'zod';
import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';

// Schema for WEBSITE_STATUS request parameters
export const WebsiteStatusParamsSchema = z.object({
  environment: z.enum(['preview', 'live']).optional().default('preview'),
}).optional();

// Schema for WEBSITE_GENERATED notification payload
export const WebsiteGeneratedPayloadSchema = z.object({
  id: z.string().min(1, 'Website ID is required'),
  timestamp: z.date(),
  // Other fields...
});

// Map of message types to schemas
export const WebsiteSchemaMap = {
  [DataRequestType.WEBSITE_STATUS]: WebsiteStatusParamsSchema,
  [NotificationType.WEBSITE_GENERATED]: WebsiteGeneratedPayloadSchema,
  // Other schemas...
};

// Export derived types
export type WebsiteStatusParams = z.infer<typeof WebsiteStatusParamsSchema>;
export type WebsiteGeneratedPayload = z.infer<typeof WebsiteGeneratedPayloadSchema>;
```

Example for Conversation Context:
```typescript
// src/contexts/conversations/schemas/messageSchemas.ts
import { z } from 'zod';
import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';
import { ConversationTurnSchema } from '@/protocol/schemas/conversationSchemas';

// Schema for CONVERSATION_HISTORY request parameters
export const ConversationHistoryParamsSchema = z.object({
  /** ID of the conversation to retrieve history for */
  conversationId: z.string().min(1, 'Conversation ID is required'),
  /** Maximum number of turns to retrieve */
  limit: z.number().int().positive().optional(),
});

// Schema for CONVERSATION_STARTED notification payload
export const ConversationStartedPayloadSchema = z.object({
  /** ID of the conversation */
  id: z.string().min(1, 'Conversation ID is required'),
  /** Room ID the conversation is associated with */
  roomId: z.string(),
  /** Type of interface (cli or matrix) */
  interfaceType: z.enum(['cli', 'matrix']),
  /** Timestamp when the conversation was created */
  createdAt: z.date(),
});

// Schema for CONVERSATION_CLEARED notification payload
export const ConversationClearedPayloadSchema = z.object({
  /** ID of the conversation that was cleared */
  id: z.string().min(1, 'Conversation ID is required'),
});

// Schema for CONVERSATION_TURN_ADDED notification payload
export const ConversationTurnAddedPayloadSchema = z.object({
  /** ID of the conversation the turn was added to */
  conversationId: z.string().min(1, 'Conversation ID is required'),
  /** ID of the turn that was added */
  turnId: z.string(),
  /** Timestamp when the turn was added */
  timestamp: z.date(),
  /** ID of the user who added the turn */
  userId: z.string().optional(),
});

// Schema for conversation creation
export const CreateConversationParamsSchema = z.object({
  /** ID of the room to associate the conversation with */
  roomId: z.string().min(1, 'Room ID is required'),
  /** Type of interface (cli or matrix) */
  interfaceType: z.enum(['cli', 'matrix']),
  /** First turn of the conversation (optional) */
  initialTurn: ConversationTurnSchema.optional(),
});

// Schema for creating a new conversation turn
export const CreateConversationTurnParamsSchema = z.object({
  /** ID of the conversation to add the turn to */
  conversationId: z.string().min(1, 'Conversation ID is required'),
  /** The turn to add */
  turn: ConversationTurnSchema,
});

// Map of message types to schemas for this context
export const ConversationSchemaMap = {
  // Request parameter schemas
  [DataRequestType.CONVERSATION_HISTORY]: ConversationHistoryParamsSchema,
  
  // Notification payload schemas
  [NotificationType.CONVERSATION_STARTED]: ConversationStartedPayloadSchema,
  [NotificationType.CONVERSATION_CLEARED]: ConversationClearedPayloadSchema,
  [NotificationType.CONVERSATION_TURN_ADDED]: ConversationTurnAddedPayloadSchema,
  
  // Tool parameter schemas
  'conversation.create': CreateConversationParamsSchema,
  'conversation.addTurn': CreateConversationTurnParamsSchema,
};

// Export derived types for use in type-safe code
export type ConversationHistoryParams = z.infer<typeof ConversationHistoryParamsSchema>;
export type ConversationStartedPayload = z.infer<typeof ConversationStartedPayloadSchema>;
export type ConversationClearedPayload = z.infer<typeof ConversationClearedPayloadSchema>;
export type ConversationTurnAddedPayload = z.infer<typeof ConversationTurnAddedPayloadSchema>;
export type CreateConversationTurnParams = z.infer<typeof CreateConversationTurnParamsSchema>;
export type CreateConversationParams = z.infer<typeof CreateConversationParamsSchema>;
```

In addition, the conversation model itself is defined in the protocol schemas:

```typescript
// src/protocol/schemas/conversationSchemas.ts
import { z } from 'zod';

// Schema for a single conversation turn (query and response)
export const ConversationTurnSchema = z.object({
  // Unique identifier for this turn
  id: z.string().optional(),
  
  // Timestamp when this turn was created
  timestamp: z.date().optional(),
  
  // User's query
  query: z.string().min(1),
  
  // AI's response
  response: z.string(),
  
  // User identifier (optional in CLI, required in Matrix)
  userId: z.string().optional(),
  
  // User display name (if available)
  userName: z.string().optional(),
  
  // Optional metadata for this turn (citations, context used, etc.)
  metadata: z.record(z.unknown()).optional(),
  
  // Fields for conversation-to-notes feature
  linkedNoteIds: z.array(z.string()).optional(),
  highlightedSegments: z.array(
    z.object({
      text: z.string(),
      startPos: z.number(),
      endPos: z.number(),
    }),
  ).optional(),
  savedAsNoteId: z.string().optional(),
});

// Schema for a complete conversation with tiered memory
export const ConversationSchema = z.object({
  // Unique identifier for this conversation
  id: z.string(),
  
  // Timestamps for creation and updates
  createdAt: z.date(),
  updatedAt: z.date(),
  
  // Active tier: Recent conversation turns in full detail
  activeTurns: z.array(ConversationTurnSchema),
  
  // Summary tier: Summarized segments of older conversations
  summaries: z.array(ConversationSummarySchema).default([]),
  
  // Archive tier: Older conversation turns kept for reference
  archivedTurns: z.array(ConversationTurnSchema).default([]),
  
  // Room identifier (required for both CLI and Matrix)
  roomId: z.string(),
  
  // Interface type ('cli' or 'matrix')
  interfaceType: z.enum(['cli', 'matrix']),
  
  // Optional metadata for the conversation
  metadata: z.record(z.unknown()).optional(),
});

// Derived TypeScript types
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
```

### 2. Central Schema Registry

The schema registry imports and re-exports all schemas from each context:

```typescript
// src/protocol/messaging/schemaRegistry.ts
// Import schemas from Notes context
import {
  NoteByIdParamsSchema,
  // Other note schemas...
  NoteSchemaMap,
} from '@/contexts/notes/schemas/messageSchemas';

// Import schemas from Profiles context
import {
  ProfileDataParamsSchema,
  ProfileUpdatedPayloadSchema,
  ProfileSchemaMap,
} from '@/contexts/profiles/schemas/messageSchemas';

// Import schemas from Website context
import {
  WebsiteStatusParamsSchema,
  WebsiteGeneratedPayloadSchema,
  WebsiteSchemaMap,
} from '@/contexts/website/schemas/messageSchemas';

// Re-export all schemas
export {
  // Notes context schemas
  NoteByIdParamsSchema,
  // Other note schemas...
  
  // Profiles context schemas
  ProfileDataParamsSchema,
  ProfileUpdatedPayloadSchema,
  // Other profile schemas...
  
  // Website context schemas
  WebsiteStatusParamsSchema,
  WebsiteGeneratedPayloadSchema,
  // Other website schemas...
  
  // Conversation context schemas
  ConversationTurnSchema,
  ConversationSchema,
  ConversationOptionsSchema,
  // Other conversation schemas...
};

// Re-export all types
export type {
  // Notes context types
  NoteByIdParams,
  // Other note types...
};

export type {
  // Profiles context types
  ProfileDataParams,
  ProfileUpdatedPayload,
  // Other profile types...
};

export type {
  // Website context types
  WebsiteStatusParams,
  WebsiteGeneratedPayload,
  // Other website types...
};

export type {
  // Conversation context types
  ConversationTurn,
  Conversation,
  ConversationOptions,
  // Other conversation types...
};

// Combine all schema maps
export const MessageSchemaRegistry = {
  // Notes schemas
  ...NoteSchemaMap,
  // Profiles schemas
  ...ProfileSchemaMap,
  // Website schemas
  ...WebsiteSchemaMap,
  // Conversation schemas
  ...ConversationSchemaMap,
  // Other context schemas...
};
```

### 3. Validation Utilities

The validation utilities provide functions for validating messages:

```typescript
// src/protocol/messaging/validation.ts
import { z } from 'zod';
import { MessageSchemaRegistry } from './schemaRegistry';

export function validateRequestParams<T>(message: DataRequestMessage): ValidationResult<T> {
  // Implementation...
}

export function validateNotificationPayload<T>(message: NotificationMessage): ValidationResult<T> {
  // Implementation...
}
```

## How to Use

### 1. Defining New Schemas

To add schemas for a new context or message type:

1. Create a schema file for your context (if it doesn't exist)
   ```
   src/contexts/[your-context]/schemas/messageSchemas.ts
   ```

2. Define schemas using Zod
   ```typescript
   import { z } from 'zod';
   
   export const YourRequestParamsSchema = z.object({
     requiredField: z.string().min(1, 'Required field cannot be empty'),
     optionalField: z.number().positive().optional(),
   });
   ```

3. Create a schema map for your context
   ```typescript
   export const YourContextSchemaMap = {
     [DataRequestType.YOUR_REQUEST_TYPE]: YourRequestParamsSchema,
     // Other mappings...
   };
   ```

4. Add your context's schemas to the registry
   ```typescript
   // In schemaRegistry.ts
   import {
     YourRequestParamsSchema,
     YourContextSchemaMap,
   } from '@/contexts/[your-context]/schemas/messageSchemas';
   
   export const MessageSchemaRegistry = {
     // Existing schemas...
     ...YourContextSchemaMap,
   };
   ```

### 2. Using Schemas in Message Handlers

In your message handlers, use the validation utilities:

```typescript
import { validateRequestParams } from '@/protocol/messaging/validation';
import type { YourRequestParams } from '@/protocol/messaging/schemaRegistry';

private async handleYourRequest(request: DataRequestMessage) {
  try {
    // Validate parameters
    const validation = validateRequestParams<YourRequestParams>(request);
    
    if (!validation.success) {
      return MessageFactory.createErrorResponse(
        request.id,
        YourContextId,
        request.sourceContext,
        validation.errorMessage || 'Invalid parameters',
        'VALIDATION_ERROR',
      );
    }
    
    // Now we have type-safe access to validated parameters
    const { requiredField, optionalField } = validation.data;
    
    // Process the request...
  } catch (error) {
    // Error handling...
  }
}
```

Example from WebsiteMessageHandler:
```typescript
private async handleWebsiteStatus(request: DataRequestMessage) {
  try {
    // Validate parameters using schema
    const validation = validateRequestParams<WebsiteStatusParams>(request);
    
    if (!validation.success) {
      return MessageFactory.createErrorResponse(
        request.id,
        ContextId.WEBSITE,
        request.sourceContext,
        validation.errorMessage || 'Invalid parameters',
        'VALIDATION_ERROR',
      );
    }
    
    // Extract parameters (if any)
    const { environment } = validation.data || {};
    
    // Get status from the context
    const status = await this.websiteContext.handleWebsiteStatus(environment);
    
    return MessageFactory.createSuccessResponse(
      ContextId.WEBSITE,
      request.sourceContext,
      request.id,
      { status: status.data || {} },
    );
  } catch (error) {
    // Error handling...
  }
}
```

### 3. Testing Schemas

Create tests for your schemas to ensure they validate correctly:

```typescript
// tests/contexts/[your-context]/schemas/messageSchemas.test.ts
import { YourRequestParamsSchema } from '@/contexts/[your-context]/schemas/messageSchemas';

describe('Your Context Message Schemas', () => {
  describe('YourRequestParamsSchema', () => {
    it('should validate valid parameters', () => {
      const result = YourRequestParamsSchema.safeParse({
        requiredField: 'value',
        optionalField: 42,
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid parameters', () => {
      const result = YourRequestParamsSchema.safeParse({
        // Missing requiredField
      });
      
      expect(result.success).toBe(false);
    });
  });
});
```

## Benefits

1. **Type Safety**: Both compile-time and runtime validation
2. **Domain Ownership**: Each context owns its schemas
3. **Consistent Validation**: Standardized error handling
4. **Reduced Boilerplate**: Clear, concise message handlers
5. **Better DX**: Improved code completion and documentation

## Design Decisions

1. **Hybrid Schema Location**: Context-specific schemas live with their contexts, but a central registry provides unified access
2. **Zod for Validation**: Zod provides both runtime validation and TypeScript type inference
3. **Clear Error Messages**: Validation failures provide detailed error messages
4. **Type-Safe Access**: Validated parameters are fully typed
5. **Independent Evolution**: Contexts can update their schemas without affecting other contexts

## Conversation Schema Validation

The conversation schema system provides structured validation for conversation data throughout the application. This validation ensures consistent conversation storage, retrieval, and processing.

### Key Components

1. **Core Conversation Schemas**:
   - `ConversationTurnSchema`: Validates individual conversation turns (query-response pairs)
   - `ConversationSummarySchema`: Validates summarized conversation segments
   - `ConversationSchema`: Validates complete conversations with tiered memory
   - `ConversationOptionsSchema`: Validates configuration options for conversation context

2. **Tiered Memory System**:
   - `MemoryTierEnum`: Defines the three memory tiers (active, summary, archive)
   - The schema enforces the tiered memory structure with distinct memory levels

3. **Type Safety**:
   - TypeScript types are derived from Zod schemas for compile-time type checking
   - Runtime validation ensures data integrity when loading from storage

### Usage in Conversation Storage

```typescript
// Example of validating a conversation before storage
import { ConversationSchema } from '@/protocol/schemas/conversationSchemas';

export class ConversationStorage {
  async saveConversation(conversationData: unknown): Promise<boolean> {
    try {
      // Validate the conversation data against the schema
      const validatedConversation = ConversationSchema.parse(conversationData);
      
      // Store the validated conversation
      await this.persistConversation(validatedConversation);
      return true;
    } catch (error) {
      console.error('Invalid conversation data:', error);
      return false;
    }
  }
}
```

### Benefits of Conversation Schema Validation

1. **Data Integrity**: Ensures all conversation data meets structural requirements
2. **Simplified Processing**: Standardized structure simplifies memory management and summarization
3. **Interface Compatibility**: Works across different interfaces (CLI and Matrix)
4. **Default Handling**: Provides sensible defaults for optional fields
5. **Extensibility**: Easily extended with new fields as requirements evolve
6. **Testing Support**: Schemas can be tested independently from implementation code

## Future Improvements

1. **Schema Versioning**: Add support for versioned schemas as the application evolves
2. **Schema Generation**: Automatic schema generation from OpenAPI or similar specifications
3. **Custom Validators**: Support for context-specific validation logic beyond Zod's capabilities
4. **Performance Optimization**: Optimize validation for high-volume messages
5. **Conversation Analytics**: Add schema support for conversation analytics and metrics
6. **Compatibility Layer**: Add schema transformation for migrating older conversation formats