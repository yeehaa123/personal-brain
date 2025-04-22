/**
 * Protocol Message Formats
 * 
 * This module exports message format definitions and schemas
 * for protocol communication.
 * 
 * PUBLIC API: These exports are intended for use by upstream consumers
 */

// Export public message format types
export type { 
  BaseMessage,
  QueryMessage,
  CommandMessage,
  EventMessage,
  ResponseMessage,
  ProtocolMessage,
} from './messageFormats';

// Export only the converter interfaces used by public API
export { 
  JsonConverter,
  TextConverter,
} from './converters';

// Export standardized response schema (public API)
export type { StandardResponse } from './schemas/standardResponseSchema';
export { 
  StandardResponseSchema,
  generateStandardSystemPrompt,
} from './schemas/standardResponseSchema';

// Export conversation schemas (public API)
export type {
  ConversationTurn,
  ConversationSummary,
  Conversation,
  ConversationOptions,
  MemoryTier,
} from './schemas/conversationSchemas';
export {
  ConversationTurnSchema,
  ConversationSummarySchema,
  ConversationSchema,
  ConversationOptionsSchema,
  MemoryTierEnum,
} from './schemas/conversationSchemas';

// Export conversation context configuration (public API)
export type { ConversationContextConfig } from './schemas/conversationContextConfig';