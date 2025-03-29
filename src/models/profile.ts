import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { profiles } from '../db/schema';

// Create Zod schemas from Drizzle schema
export const insertProfileSchema = createInsertSchema(profiles);
export const selectProfileSchema = createSelectSchema(profiles);

// Type definitions based on the schemas
export type Profile = z.infer<typeof selectProfileSchema>;
export type NewProfile = z.infer<typeof insertProfileSchema>;

// Enhanced profile with auto-generated tags and related notes
export interface EnhancedProfile extends Omit<Profile, 'tags'> {
  tags: string[] | null;
  relatedNotes?: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
}

// Define types for profile sub-elements
export interface ProfileDateInfo {
  day: number | null;
  month: number | null;
  year: number | null;
}

export interface ProfileExperience {
  starts_at: ProfileDateInfo;
  ends_at: ProfileDateInfo | null;
  company: string;
  company_linkedin_profile_url: string | null;
  company_facebook_profile_url: string | null;
  title: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
}

export interface ProfileEducation {
  starts_at: ProfileDateInfo;
  ends_at: ProfileDateInfo | null;
  field_of_study: string | null;
  degree_name: string | null;
  school: string;
  school_linkedin_profile_url: string | null;
  school_facebook_profile_url: string | null;
  description: string | null;
  logo_url: string | null;
  grade: string | null;
  activities_and_societies: string | null;
}

export interface ProfileLanguageProficiency {
  name: string;
  proficiency: string;
}

export interface ProfilePublication {
  name: string;
  publisher: string;
  published_on: ProfileDateInfo;
  description: string | null;
  url: string | null;
}

export interface ProfileAward {
  title: string;
  issuer: string;
  issued_on: ProfileDateInfo;
  description: string | null;
}

export interface ProfileProject {
  starts_at: ProfileDateInfo;
  ends_at: ProfileDateInfo | null;
  title: string;
  description: string | null;
  url: string | null;
}

export interface ProfileVolunteerWork {
  starts_at: ProfileDateInfo;
  ends_at: ProfileDateInfo | null;
  title: string;
  cause: string | null;
  company: string | null;
  company_linkedin_profile_url: string | null;
  description: string | null;
  logo_url: string | null;
}

// Validation function for profile creation
export function validateProfile(data: unknown): NewProfile {
  return insertProfileSchema.parse(data);
}