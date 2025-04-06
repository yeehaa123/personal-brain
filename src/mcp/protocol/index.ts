/**
 * Export protocol module from MCP SDK
 * This barrel file simplifies imports from the protocol module
 */
export { BrainProtocol } from './brainProtocol';
export * from './types';
export * from './types/index';
export * from './components';

// For backward compatibility
export type { 
  ProtocolResponse, 
  ExternalCitation,
  BrainProtocolOptions,
  QueryOptions,
  QueryResult,
  Citation,
  ContextResult,
  ModelResponse,
  ProfileAnalysisResult,
  TurnMetadata,
  TurnOptions,
  IContextManager,
  IConversationManager,
  IProfileManager,
  IExternalSourceManager,
  IQueryProcessor,
} from './types/index';