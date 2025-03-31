import { z } from 'zod';
import { createInsertSchema, createUpdateSchema, createSelectSchema } from 'drizzle-zod';
import { profiles } from '../db/schema';

// Create base Zod schemas from Drizzle schema
const baseInsertProfileSchema = createInsertSchema(profiles);
const baseUpdateProfileSchema = createUpdateSchema(profiles);
const baseSelectProfileSchema = createSelectSchema(profiles);

// Define schemas for complex JSON types
export const profileDateInfoSchema = z.object({
  day: z.number().nullable(),
  month: z.number().nullable(),
  year: z.number().nullable(),
});

export const profileExperienceSchema = z.object({
  starts_at: profileDateInfoSchema,
  ends_at: profileDateInfoSchema.nullable(),
  company: z.string(),
  company_linkedin_profile_url: z.string().nullable(),
  company_facebook_profile_url: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  logo_url: z.string().nullable(),
});

export const profileEducationSchema = z.object({
  starts_at: profileDateInfoSchema,
  ends_at: profileDateInfoSchema.nullable(),
  field_of_study: z.string().nullable(),
  degree_name: z.string().nullable(),
  school: z.string(),
  school_linkedin_profile_url: z.string().nullable(),
  school_facebook_profile_url: z.string().nullable(),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
  grade: z.string().nullable(),
  activities_and_societies: z.string().nullable(),
});

export const profileLanguageProficiencySchema = z.object({
  name: z.string(),
  proficiency: z.string(),
});

export const profilePublicationSchema = z.object({
  name: z.string(),
  publisher: z.string(),
  published_on: profileDateInfoSchema,
  description: z.string().nullable(),
  url: z.string().nullable(),
});

export const profileAwardSchema = z.object({
  title: z.string(),
  issuer: z.string(),
  issued_on: profileDateInfoSchema,
  description: z.string().nullable(),
});

export const profileProjectSchema = z.object({
  starts_at: profileDateInfoSchema,
  ends_at: profileDateInfoSchema.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().nullable(),
});

export const profileVolunteerWorkSchema = z.object({
  starts_at: profileDateInfoSchema,
  ends_at: profileDateInfoSchema.nullable(),
  title: z.string(),
  cause: z.string().nullable(),
  company: z.string().nullable(),
  company_linkedin_profile_url: z.string().nullable(),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
});

// Fix JSON field types by explicitly defining the correct types
export const insertProfileSchema = baseInsertProfileSchema.extend({
  experiences: z.array(profileExperienceSchema).nullable().optional(),
  education: z.array(profileEducationSchema).nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  languagesAndProficiencies: z.array(profileLanguageProficiencySchema).nullable().optional(),
  accomplishmentPublications: z.array(profilePublicationSchema).nullable().optional(),
  accomplishmentHonorsAwards: z.array(profileAwardSchema).nullable().optional(),
  accomplishmentProjects: z.array(profileProjectSchema).nullable().optional(),
  volunteerWork: z.array(profileVolunteerWorkSchema).nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export const updateProfileSchema = baseUpdateProfileSchema.extend({
  experiences: z.array(profileExperienceSchema).nullable().optional(),
  education: z.array(profileEducationSchema).nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  languagesAndProficiencies: z.array(profileLanguageProficiencySchema).nullable().optional(),
  accomplishmentPublications: z.array(profilePublicationSchema).nullable().optional(),
  accomplishmentHonorsAwards: z.array(profileAwardSchema).nullable().optional(),
  accomplishmentProjects: z.array(profileProjectSchema).nullable().optional(),
  volunteerWork: z.array(profileVolunteerWorkSchema).nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export const selectProfileSchema = baseSelectProfileSchema.extend({
  experiences: z.array(profileExperienceSchema).nullable(),
  education: z.array(profileEducationSchema).nullable(),
  languages: z.array(z.string()).nullable(),
  languagesAndProficiencies: z.array(profileLanguageProficiencySchema).nullable(),
  accomplishmentPublications: z.array(profilePublicationSchema).nullable(),
  accomplishmentHonorsAwards: z.array(profileAwardSchema).nullable(),
  accomplishmentProjects: z.array(profileProjectSchema).nullable(),
  volunteerWork: z.array(profileVolunteerWorkSchema).nullable(),
  embedding: z.array(z.number()).nullable(),
  tags: z.array(z.string()).nullable(),
});

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
