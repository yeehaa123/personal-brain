/**
 * Mock Profile Model Implementation
 * 
 * This file provides standardized mock implementations of the Profile model
 * for use in tests across the codebase.
 */

import type {
  Profile,
  ProfileDateInfo,
  ProfileEducation,
  ProfileExperience,
} from '@models/profile';
import { EmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

/**
 * Create a date info object for profile dates
 */
export function createDateInfo(year: number, month: number = 1, day: number = 1): ProfileDateInfo {
  return { year, month, day };
}

/**
 * Create a mock experience entry
 */
export function createMockExperience(options: Partial<ProfileExperience> = {}): ProfileExperience {
  const defaults: ProfileExperience = {
    title: 'Software Engineer',
    company: 'Tech Solutions Inc.',
    description: 'Building scalable software systems',
    starts_at: createDateInfo(2020),
    ends_at: null,
    company_linkedin_profile_url: null,
    company_facebook_profile_url: null,
    location: 'San Francisco, CA',
    logo_url: null,
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock education entry
 */
export function createMockEducation(options: Partial<ProfileEducation> = {}): ProfileEducation {
  const defaults: ProfileEducation = {
    school: 'University of Technology',
    degree_name: 'Bachelor of Science',
    field_of_study: 'Computer Science',
    starts_at: createDateInfo(2015),
    ends_at: createDateInfo(2019),
    school_linkedin_profile_url: null,
    school_facebook_profile_url: null,
    description: null,
    logo_url: null,
    grade: null,
    activities_and_societies: null,
  };

  return { ...defaults, ...options };
}

/**
 * MockProfile class with factory methods
 */
export class MockProfile {
  static async createDefault(id: string = 'mock-profile-id'): Promise<Profile> {
    // Use the standard API method for generating embeddings
    const mockService = EmbeddingService.createFresh();
    const embedding = await mockService.getEmbedding('John Doe profile');
    
    return {
      id,
      publicIdentifier: null,
      profilePicUrl: null,
      backgroundCoverImageUrl: null,
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      followerCount: null,
      headline: 'Innovator | Thinker | Community Builder',
      summary: 'I build ecosystems that foster innovation and collaboration.',
      occupation: 'Ecosystem Architect',
      country: null,
      countryFullName: 'Futureland',
      city: 'Innovation City',
      state: 'Creative State',
      experiences: [
        createMockExperience({
          title: 'Ecosystem Architect',
          company: 'Ecosystem Corp',
          description: 'Building regenerative ecosystem architectures',
          starts_at: { day: 1, month: 1, year: 2020 },
          ends_at: null,
        }),
      ],
      education: [
        createMockEducation({
          degree_name: 'PhD in Systemic Design',
          school: 'University of Innovation',
          starts_at: { day: 1, month: 1, year: 2010 },
          ends_at: { day: 1, month: 1, year: 2014 },
        }),
      ],
      languages: ['English', 'JavaScript', 'Python'],
      languagesAndProficiencies: null,
      accomplishmentPublications: null,
      accomplishmentHonorsAwards: null,
      accomplishmentProjects: null,
      volunteerWork: null,
      embedding,
      tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static async createWithCustomData(
    id: string = 'mock-profile-id',
    options: Partial<Profile> = {},
  ): Promise<Profile> {
    const baseProfile = await this.createDefault(id);
    return {
      ...baseProfile,
      ...options,
    };
  }

  static async createDeveloperProfile(id: string = 'dev-profile-id'): Promise<Profile> {
    return this.createWithCustomData(id, {
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      headline: 'Senior Developer | Open Source Contributor',
      summary: 'Experienced software engineer with a focus on TypeScript and React.',
      occupation: 'Senior Software Engineer',
      city: 'San Francisco',
      state: 'California',
      countryFullName: 'United States',
      experiences: [
        createMockExperience({
          title: 'Senior Software Engineer',
          company: 'TechCorp',
          description: 'Leading development of cloud-based solutions',
          starts_at: { day: 1, month: 5, year: 2020 },
          ends_at: null,
        }),
        createMockExperience({
          title: 'Software Engineer',
          company: 'StartupInc',
          description: 'Full-stack development with React and Node.js',
          starts_at: { day: 1, month: 2, year: 2018 },
          ends_at: { day: 30, month: 4, year: 2020 },
        }),
      ],
      languages: ['TypeScript', 'JavaScript', 'Python', 'Rust'],
      tags: ['react', 'typescript', 'frontend', 'cloud-computing'],
    });
  }

  static async createMinimalProfile(id: string = 'minimal-profile-id'): Promise<Profile> {
    return {
      id,
      publicIdentifier: null,
      profilePicUrl: null,
      backgroundCoverImageUrl: null,
      firstName: 'Min',
      lastName: 'User',
      fullName: 'Min User',
      followerCount: null,
      headline: null,
      summary: null,
      occupation: null,
      country: null,
      countryFullName: null,
      city: null,
      state: null,
      experiences: null,
      education: null,
      languages: null,
      languagesAndProficiencies: null,
      accomplishmentPublications: null,
      accomplishmentHonorsAwards: null,
      accomplishmentProjects: null,
      volunteerWork: null,
      embedding: null,
      tags: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Create a mock profile for testing
 * For backward compatibility with existing tests
 */
export async function createMockProfile(id: string = 'mock-profile-id'): Promise<Profile> {
  return MockProfile.createDefault(id);
}

/**
 * Create multiple mock profiles for testing
 */
export async function createMockProfiles(count: number = 3): Promise<Profile[]> {
  const profiles: Profile[] = [];

  profiles.push(await MockProfile.createDefault('profile-1'));
  profiles.push(await MockProfile.createDeveloperProfile('profile-2'));

  // Add additional profiles if needed
  for (let i = 3; i <= count; i++) {
    profiles.push(
      await MockProfile.createWithCustomData(`profile-${i}`, {
        firstName: `User${i}`,
        lastName: `Test${i}`,
        fullName: `User${i} Test${i}`,
        occupation: `Test Occupation ${i}`,
      }),
    );
  }

  return profiles;
}
