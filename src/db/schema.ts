import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// Table for note chunks (for longer notes that need to be split)
export const noteChunks = sqliteTable('note_chunks', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
  chunkIndex: integer('chunk_index').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
