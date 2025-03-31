import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { notes } from '../db/schema';

// Create Zod schemas from Drizzle schema
const baseInsertNoteSchema = createInsertSchema(notes);
const baseSelectNoteSchema = createSelectSchema(notes);

// Fix JSON field types by explicitly defining the correct types
export const insertNoteSchema = baseInsertNoteSchema.extend({
  tags: z.array(z.string()).nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
});

export const selectNoteSchema = baseSelectNoteSchema.extend({
  tags: z.array(z.string()).nullable(),
  embedding: z.array(z.number()).nullable(),
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