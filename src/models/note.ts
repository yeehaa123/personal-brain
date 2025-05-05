import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { notes } from '../db/schema';

// Create Zod schemas from Drizzle schema
const baseInsertNoteSchema = createInsertSchema(notes);
const baseSelectNoteSchema = createSelectSchema(notes);

// Fix JSON field types by explicitly defining the correct types
export const insertNoteSchema = baseInsertNoteSchema.extend({
  tags: z.array(z.string()).nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
  // New fields for conversation-to-notes feature and landing page
  source: z.enum(['import', 'conversation', 'user-created', 'landing-page']).default('import'),
  conversationMetadata: z.object({
    conversationId: z.string(),
    timestamp: z.date(),
    userName: z.string().optional(),
    promptSegment: z.string().optional(),
  }).optional(),
  confidence: z.number().min(0).max(100).optional(),
  verified: z.boolean().default(false),
});

export const selectNoteSchema = baseSelectNoteSchema.extend({
  tags: z.array(z.string()).nullable(),
  embedding: z.array(z.number()).nullable(),
  // New fields for conversation-to-notes feature and landing page
  source: z.enum(['import', 'conversation', 'user-created', 'landing-page']).default('import'),
  conversationMetadata: z.object({
    conversationId: z.string(),
    timestamp: z.date(),
    userName: z.string().optional(),
    promptSegment: z.string().optional(),
  }).nullable(),
  confidence: z.number().min(0).max(100).nullable(),
  verified: z.boolean().nullable(),
});

// Type definitions based on the schemas
export type Note = z.infer<typeof selectNoteSchema>;
export type NewNote = z.infer<typeof insertNoteSchema>;

// Validation function for note creation
export function validateNote(data: unknown): NewNote {
  return insertNoteSchema.parse(data);
}

// Validation function for searching notes
export const noteSearchSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type NoteSearchParams = z.infer<typeof noteSearchSchema>;
