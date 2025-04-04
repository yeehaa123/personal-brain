import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type {
  ProfileAward,
  ProfileEducation,
  ProfileExperience,
  ProfileLanguageProficiency,
  ProfileProject,
  ProfilePublication,
  ProfileVolunteerWork,

} from '../models/profile';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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

// Table for user profiles
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  publicIdentifier: text('public_identifier'),
  profilePicUrl: text('profile_pic_url'),
  backgroundCoverImageUrl: text('background_cover_image_url'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  fullName: text('full_name').notNull(),
  followerCount: integer('follower_count'),
  occupation: text('occupation'),
  headline: text('headline'),
  summary: text('summary'),
  country: text('country'),
  countryFullName: text('country_full_name'),
  city: text('city'),
  state: text('state'),
  experiences: text('experiences', { mode: 'json' }).$type<ProfileExperience[]>(),
  education: text('education', { mode: 'json' }).$type<ProfileEducation[]>(),
  languages: text('languages', { mode: 'json' }).$type<string[]>(),
  languagesAndProficiencies: text('languages_and_proficiencies', { mode: 'json' }).$type<ProfileLanguageProficiency[]>(),
  accomplishmentPublications: text('accomplishment_publications', { mode: 'json' }).$type<ProfilePublication[]>(),
  accomplishmentHonorsAwards: text('accomplishment_honors_awards', { mode: 'json' }).$type<ProfileAward[]>(),
  accomplishmentProjects: text('accomplishment_projects', { mode: 'json' }).$type<ProfileProject[]>(),
  volunteerWork: text('volunteer_work', { mode: 'json' }).$type<ProfileVolunteerWork[]>(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
