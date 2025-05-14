/**
 * Mock Profile Model Implementation
 * 
 * This file provides standardized mock implementations of the Profile model
 * for use in tests across the codebase.
 */

import type {
  ContactInfo,
  Education,
  Experience,
  Language,
  LocationInfo,
  Profile,
  Project,
  Publication,
} from '@/models/profile';

/**
 * Create a mock experience entry
 */
export function createMockExperience(options: Partial<Experience> = {}): Experience {
  const defaults: Experience = {
    title: 'Software Engineer',
    organization: 'Tech Solutions Inc.',
    description: 'Building scalable software systems',
    startDate: new Date('2020-01-01'),
    endDate: undefined, // Current position
    location: 'San Francisco, CA',
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock education entry
 */
export function createMockEducation(options: Partial<Education> = {}): Education {
  const defaults: Education = {
    institution: 'University of Technology',
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    startDate: new Date('2015-01-01'),
    endDate: new Date('2019-01-01'),
    description: 'Studied computer science with focus on software engineering',
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock language entry
 */
export function createMockLanguage(options: Partial<Language> = {}): Language {
  const defaults: Language = {
    name: 'English',
    proficiency: 'fluent',
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock project entry
 */
export function createMockProject(options: Partial<Project> = {}): Project {
  const defaults: Project = {
    title: 'Personal Brain',
    description: 'A knowledge management system',
    url: 'https://github.com/user/personal-brain',
    startDate: new Date('2023-01-01'),
    endDate: undefined,
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock publication entry
 */
export function createMockPublication(options: Partial<Publication> = {}): Publication {
  const defaults: Publication = {
    title: 'The Future of Knowledge Management',
    publisher: 'Tech Journal',
    date: new Date('2023-06-01'),
    url: 'https://techjournal.com/articles/knowledge-management',
    description: 'A paper on modern knowledge management approaches',
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock location
 */
export function createMockLocation(options: Partial<LocationInfo> = {}): LocationInfo {
  const defaults: LocationInfo = {
    city: 'Innovation City',
    state: 'Creative State',
    country: 'Futureland',
  };

  return { ...defaults, ...options };
}

/**
 * Create a mock contact info
 */
export function createMockContactInfo(options: Partial<ContactInfo> = {}): ContactInfo {
  const defaults: ContactInfo = {
    phone: '+1 (555) 123-4567',
    website: 'https://johndoe.com',
    social: [
      { platform: 'Twitter', url: 'https://twitter.com/johndoe' },
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
    ],
  };

  return { ...defaults, ...options };
}

/**
 * MockProfile class with factory methods
 */
export class MockProfile {
  static async createDefault(id: string = 'mock-profile-id'): Promise<Profile> {
    // Profile no longer contains embeddings
    
    return {
      id,
      displayName: 'John Doe',
      email: 'john.doe@example.com',
      avatar: 'https://example.com/johndoe.jpg',
      headline: 'Innovator | Thinker | Community Builder',
      summary: 'I build ecosystems that foster innovation and collaboration.',
      location: createMockLocation(),
      contact: createMockContactInfo(),
      experiences: [
        createMockExperience({
          title: 'Ecosystem Architect',
          organization: 'Ecosystem Corp',
          description: 'Building regenerative ecosystem architectures',
          startDate: new Date('2020-01-01'),
        }),
      ],
      education: [
        createMockEducation({
          degree: 'PhD in Systemic Design',
          institution: 'University of Innovation',
          startDate: new Date('2010-01-01'),
          endDate: new Date('2014-01-01'),
        }),
      ],
      languages: [
        createMockLanguage({ name: 'English', proficiency: 'native' }),
        createMockLanguage({ name: 'JavaScript', proficiency: 'fluent' }),
        createMockLanguage({ name: 'Python', proficiency: 'intermediate' }),
      ],
      projects: [
        createMockProject({
          title: 'Ecosystem Mapping Tool',
          description: 'A tool for mapping complex ecosystems',
        }),
      ],
      publications: [
        createMockPublication({
          title: 'Regenerative Ecosystem Design',
          publisher: 'Journal of Systems Thinking',
        }),
      ],
      skills: ['Ecosystem Design', 'Systems Thinking', 'Facilitation', 'Community Building'],
      tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
      fields: {
        customField1: 'Custom value 1',
        customField2: 'Custom value 2',
      },
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
      displayName: 'Jane Smith',
      email: 'jane.smith@example.com',
      headline: 'Senior Developer | Open Source Contributor',
      summary: 'Experienced software engineer with a focus on TypeScript and React.',
      location: {
        city: 'San Francisco',
        state: 'California',
        country: 'United States',
      },
      experiences: [
        createMockExperience({
          title: 'Senior Software Engineer',
          organization: 'TechCorp',
          description: 'Leading development of cloud-based solutions',
          startDate: new Date('2020-05-01'),
        }),
        createMockExperience({
          title: 'Software Engineer',
          organization: 'StartupInc',
          description: 'Full-stack development with React and Node.js',
          startDate: new Date('2018-02-01'),
          endDate: new Date('2020-04-30'),
        }),
      ],
      languages: [
        createMockLanguage({ name: 'TypeScript', proficiency: 'fluent' }),
        createMockLanguage({ name: 'JavaScript', proficiency: 'fluent' }),
        createMockLanguage({ name: 'Python', proficiency: 'intermediate' }),
        createMockLanguage({ name: 'Rust', proficiency: 'basic' }),
      ],
      skills: ['React', 'TypeScript', 'Node.js', 'Cloud Computing'],
      tags: ['react', 'typescript', 'frontend', 'cloud-computing'],
    });
  }

  static async createMinimalProfile(id: string = 'minimal-profile-id'): Promise<Profile> {
    return {
      id,
      displayName: 'Min User',
      email: 'min.user@example.com',
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
        displayName: `User${i} Test${i}`,
        email: `user${i}@example.com`,
        headline: `Test Occupation ${i}`,
      }),
    );
  }

  return profiles;
}