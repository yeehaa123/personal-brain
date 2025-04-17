/**
 * Types and interfaces for the BrainProtocol system
 * All types are exported for use by components
 */
import type { 
  ConversationContext, 
  ExternalSourceContext, 
  NoteContext, 
  ProfileContext,
  WebsiteContext, 
} from '@/contexts';
import type { ConversationStorage } from '@/contexts/conversations';
import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { ProfileAnalyzer } from '@/protocol/components/profileAnalyzer';
import type { Conversation } from '@/protocol/schemas/conversationSchemas';
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';

/**
 * Common options for constructing BrainProtocol
 */
export interface BrainProtocolOptions {
  /** API key for AI services */
  apiKey?: string;
  /** API key for news services */
  newsApiKey?: string;
  /** Whether to enable external knowledge sources */
  useExternalSources?: boolean;
  /** Interface type (CLI or Matrix) */
  interfaceType?: 'cli' | 'matrix';
  /** Room ID for the conversation */
  roomId?: string;
  /** Memory storage implementation for conversation storage */
  memoryStorage?: ConversationStorage;
  /** Anchor name for conversation context (usually "Host") */
  anchorName?: string;
  /** Anchor ID for conversation context (user identifier) */
  anchorId?: string;
}

/**
 * Options for processing a query
 */
export interface QueryOptions {
  /** User ID for conversation attribution */
  userId?: string;
  /** User name for conversation attribution */
  userName?: string;
  /** Room ID for the conversation */
  roomId?: string;
}

/**
 * Result of a query processing operation
 */
export interface QueryResult {
  /** The answer text from the model */
  answer: string;
  /** Citations to notes used in the answer */
  citations: Citation[];
  /** Related notes for follow-up */
  relatedNotes: Note[];
  /** User profile if relevant to the query */
  profile?: Profile;
  /** External source citations */
  externalSources?: ExternalCitation[];
}

/**
 * Citation to a note used in an answer
 */
export interface Citation {
  /** ID of the cited note */
  noteId: string;
  /** Title of the cited note */
  noteTitle: string;
  /** Excerpt from the note */
  excerpt: string;
}

/**
 * Citation to an external source
 */
export interface ExternalCitation {
  /** Title of the external source */
  title: string;
  /** Source name (e.g., "Wikipedia") */
  source: string;
  /** URL of the source */
  url: string;
  /** Excerpt from the content */
  excerpt: string;
}

/**
 * Result of profile analysis
 */
export interface ProfileAnalysisResult {
  /** Whether this is a profile-related query */
  isProfileQuery: boolean;
  /** Relevance score between 0 and 1 */
  relevance: number;
}

/**
 * Result of context retrieval
 */
export interface ContextResult {
  /** Relevant notes for the query */
  relevantNotes: Note[];
  /** Citations to notes used in the answer */
  citations: Citation[];
}

/**
 * Response from a model
 * This imports the ModelResponse generic interface from the AI resources layer
 */
export type { ModelResponse, ModelUsage } from '@/resources/ai/interfaces';

/**
 * Metadata for conversation turns
 */
export interface TurnMetadata {
  /** Type of turn (user or assistant) */
  turnType?: 'user' | 'assistant';
  /** Whether profile was available */
  hasProfile?: boolean;
  /** Whether query was profile-related */
  isProfileQuery?: boolean;
  /** Profile relevance score */
  profileRelevance?: number;
  /** Number of notes used in response */
  notesUsed?: number;
  /** Number of external sources used */
  externalSourcesUsed?: number;
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Options for saving a conversation turn
 */
export interface TurnOptions {
  /** User ID for attribution */
  userId?: string;
  /** User name for display */
  userName?: string;
  /** Additional metadata */
  metadata?: TurnMetadata;
}

/**
 * Interface for ContextManager
 * Defines the contract for managing access to various contexts (notes, profile, external sources)
 */
export interface IContextManager {
  /** Get access to the note context for data operations */
  getNoteContext(): NoteContext;
  
  /** Get access to the profile context for user profile operations */
  getProfileContext(): ProfileContext;
  
  /** Get access to the external source context for external knowledge */
  getExternalSourceContext(): ExternalSourceContext;
  
  /** Get access to the conversation context for conversation management */
  getConversationContext(): ConversationContext;
  
  /** Get access to the website context for website management */
  getWebsiteContext(): WebsiteContext;
  
  /** Enable or disable external sources functionality */
  setExternalSourcesEnabled(enabled: boolean): void;
  
  /** Check if external sources are currently enabled */
  getExternalSourcesEnabled(): boolean;
  
  /** Check if all contexts are properly initialized and ready for use */
  areContextsReady(): boolean;
  
  /** Initialize links between contexts (if needed after initialization) */
  initializeContextLinks(): void;
}

/**
 * Interface for ConversationManager
 */
export interface IConversationManager {
  getConversationContext(): ConversationContext;
  setCurrentRoom(roomId: string): Promise<void>;
  initializeConversation(): Promise<void>;
  hasActiveConversation(): boolean;
  getCurrentConversationId(): string | null;
  getConversation(conversationId: string): Promise<Conversation | null>;
  saveTurn(query: string, response: string, options?: TurnOptions): Promise<void>;
  getConversationHistory(conversationId?: string): Promise<string>;
}

/**
 * Interface for ProfileManager
 */
export interface IProfileManager {
  getProfile(): Promise<Profile | undefined>;
  getProfileText(): Promise<string | null>;
  analyzeProfileRelevance(query: string): Promise<ProfileAnalysisResult>;
  getProfileAnalyzer(): ProfileAnalyzer;
}

/**
 * Interface for ExternalSourceManager
 */
export interface IExternalSourceManager {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  getExternalResults(query: string, relevantNotes: Note[]): Promise<ExternalSourceResult[] | null>;
}

/**
 * Interface for QueryProcessor
 */
export interface IQueryProcessor {
  processQuery(query: string, options?: QueryOptions): Promise<QueryResult>;
}

/**
 * Protocol response for backward compatibility
 */
export interface ProtocolResponse {
  /** The answer text */
  answer: string;
  /** Citations to notes used in the answer */
  citations: Array<{ noteId: string; noteTitle: string; excerpt: string }>;
  /** Related notes for follow-up */
  relatedNotes: Note[];
  /** User profile if relevant to the query */
  profile?: Profile;
  /** External source citations */
  externalSources?: Array<{ title: string; source: string; url: string; excerpt: string }>;
}