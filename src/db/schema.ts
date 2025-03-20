import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
