/**
 * Schema definitions for conversation memory using Zod
 */
import { z } from 'zod';

/**
 * Schema for a single turn in a conversation (query and response)
 */
export const ConversationTurnSchema = z.object({
  // Unique identifier for this turn
  id: z.string(),
  
  // Timestamp when this turn was created
  timestamp: z.date(),
  
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
});

/**
 * Schema for a complete conversation with multiple turns
 */
export const ConversationSchema = z.object({
  // Unique identifier for this conversation
  id: z.string(),
  
  // Timestamp when this conversation started
  createdAt: z.date(),
  
  // Timestamp when this conversation was last updated
  updatedAt: z.date(),
  
  // Array of conversation turns, ordered by time
  turns: z.array(ConversationTurnSchema),
  
  // Room identifier (for Matrix) or interface identifier (for CLI)
  roomId: z.string().optional(),
  
  // Interface type ('cli' or 'matrix')
  interfaceType: z.enum(['cli', 'matrix']),
  
  // Optional metadata for the conversation (topic, summary, etc.)
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for configuration options for the conversation memory
 */
export const ConversationMemoryOptionsSchema = z.object({
  // Maximum number of turns to keep in memory
  maxTurns: z.number().int().positive().default(10),
  
  // Maximum token count to include in context
  maxTokens: z.number().int().positive().default(2000),
  
  // Whether to include system messages in history
  includeSystemMessages: z.boolean().default(false),
  
  // Decay factor for older messages (1.0 = no decay)
  relevanceDecay: z.number().min(0).max(1).default(0.9),
  
  // Default user ID for CLI if not specified
  defaultUserId: z.string().default('cli-user'),
  
  // Default user name for CLI if not specified
  defaultUserName: z.string().default('User'),
  
  // Anchor user ID (defaults to MATRIX_USER_ID from environment if available)
  anchorId: z.string().optional(),
  
  // Anchor display name
  anchorName: z.string().default('Anchor'),
});

/**
 * Derived TypeScript types from the Zod schemas
 */
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationMemoryOptions = z.infer<typeof ConversationMemoryOptionsSchema>;