/**
 * Protocol Layer
 * 
 * Coordinates interactions between contexts and resources using the brain protocol architecture.
 * This layer contains the main protocol implementation and its supporting components.
 * 
 * PUBLIC API: This barrel file only exports the public API components that should be used by external consumers.
 * Implementation details should be imported directly from their source files.
 */

// Export only the main protocol implementation
export { BrainProtocol } from './core/brainProtocol';
export type { BrainProtocolConfig } from './config/brainProtocolConfig';

// Export the primary types for public API usage
export type {
  IBrainProtocol,
  IContextManager,
  IConversationManager,
  QueryResult,
  QueryOptions,
  InterfaceType,
  BrainProtocolOptions,
} from './types';

// Export primary messaging interfaces needed by contexts
export { ContextMediator } from './messaging/contextMediator';
export type { MessageHandler } from './messaging/contextMediator';
export type { ContextMessage } from './messaging/messageTypes';
export { DataRequestType, NotificationType } from './messaging/messageTypes';

// Export format types needed by upstream components
export type { StandardResponse } from './formats/schemas/standardResponseSchema';
export type { ConversationContextConfig } from './formats/schemas/conversationContextConfig';

// Export public adapter interfaces
export type { ProtocolAdapter } from './adapters/protocolAdapter';