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
 * Schema for a summarized conversation segment
 */
export const ConversationSummarySchema = z.object({
  // Unique identifier for this summary
  id: z.string(),
  
  // Timestamp when this summary was created
  timestamp: z.date(),
  
  // Text summary of multiple conversation turns
  content: z.string(),
  
  // Start and end indices of the summarized turns
  startTurnIndex: z.number().int().min(0),
  endTurnIndex: z.number().int().min(0),
  
  // Start and end timestamps of the summarized period
  startTimestamp: z.date(),
  endTimestamp: z.date(),
  
  // Number of turns summarized
  turnCount: z.number().int().positive(),
  
  // Optional metadata for this summary
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Enum for the memory tier levels
 */
export const MemoryTierEnum = z.enum(['active', 'summary', 'archive']);

/**
 * Schema for a complete conversation with tiered memory
 */
export const ConversationSchema = z.object({
  // Unique identifier for this conversation
  id: z.string(),
  
  // Timestamp when this conversation started
  createdAt: z.date(),
  
  // Timestamp when this conversation was last updated
  updatedAt: z.date(),
  
  // Active tier: Recent conversation turns in full detail
  activeTurns: z.array(ConversationTurnSchema),
  
  // Summary tier: Summarized segments of older conversations
  summaries: z.array(ConversationSummarySchema).default([]),
  
  // Archive tier: Older conversation turns kept for reference but not used in context
  archivedTurns: z.array(ConversationTurnSchema).default([]),
  
  // Room identifier (for Matrix) or interface identifier (for CLI)
  roomId: z.string().optional(),
  
  // Interface type ('cli' or 'matrix')
  interfaceType: z.enum(['cli', 'matrix']),
  
  // Optional metadata for the conversation (topic, summary, etc.)
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for configuration options for the tiered conversation memory
 */
export const ConversationMemoryOptionsSchema = z.object({
  // Maximum number of turns to keep in active memory
  maxActiveTurns: z.number().int().positive().default(10),
  
  // Maximum number of summaries to keep in summary tier
  maxSummaries: z.number().int().positive().default(3),
  
  // Maximum token count to include in context
  maxTokens: z.number().int().positive().default(2000),
  
  // Whether to include system messages in history
  includeSystemMessages: z.boolean().default(false),
  
  // Decay factor for older messages (1.0 = no decay)
  relevanceDecay: z.number().min(0).max(1).default(0.9),
  
  // Number of turns to summarize in each summary
  summaryTurnCount: z.number().int().positive().default(5),
  
  // Default user ID for CLI if not specified
  defaultUserId: z.string().default('cli-user'),
  
  // Default user name for CLI if not specified
  defaultUserName: z.string().default('User'),
  
  // Anchor user ID (defaults to MATRIX_USER_ID from environment if available)
  anchorId: z.string().optional(),
  
  // Anchor display name
  anchorName: z.string().default('Anchor'),
  
  // Maximum number of archived turns to keep
  maxArchivedTurns: z.number().int().positive().default(50),
});

/**
 * Derived TypeScript types from the Zod schemas
 */
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationMemoryOptions = z.infer<typeof ConversationMemoryOptionsSchema>;
export type MemoryTier = z.infer<typeof MemoryTierEnum>;