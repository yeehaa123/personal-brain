import { describe, test, expect, beforeEach } from 'bun:test';
import { ProfileRepository } from '@/services/profiles/profileRepository';
import type { Profile } from '@/models/profile';
import { profiles } from '@/db/schema';

// Define initial profile for testing
const initialProfile: Profile = {
  id: 'profile-1',
  publicIdentifier: null,
  profilePicUrl: null,
  backgroundCoverImageUrl: null,
  firstName: null,
  lastName: null,
  fullName: 'John Doe',
  occupation: 'Software Engineer',
  headline: 'Senior Developer | Open Source Contributor',
  summary: 'Experienced software engineer with a focus on TypeScript and React.',
  experiences: [
    {
      title: 'Senior Developer',
      company: 'Tech Corp',
      description: 'Leading development of web applications',
      starts_at: { day: 1, month: 1, year: 2020 },
      ends_at: null,
      company_linkedin_profile_url: null,
      company_facebook_profile_url: null,
      location: null,
      logo_url: null,
    },
  ],
  education: [
    {
      degree_name: 'Computer Science',
      school: 'University of Technology',
      starts_at: { day: 1, month: 9, year: 2012 },
      ends_at: { day: 30, month: 6, year: 2016 },
      field_of_study: null,
      school_linkedin_profile_url: null,
      school_facebook_profile_url: null,
      description: null,
      logo_url: null,
      grade: null,
      activities_and_societies: null,
    },
  ],
  languages: ['English', 'JavaScript', 'TypeScript'],
  languagesAndProficiencies: null,
  accomplishmentPublications: null,
  accomplishmentHonorsAwards: null,
  accomplishmentProjects: null,
  volunteerWork: null,
  city: 'Tech City',
  state: 'Tech State',
  country: null, // Added missing property
  countryFullName: 'Tech Country',
  followerCount: null, // Added missing property
  embedding: [0.1, 0.2, 0.3],
  tags: ['software-engineering', 'typescript', 'react'],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
};

// Create a mock repository class that extends the real one
export class MockProfileRepository extends ProfileRepository {
  private profile: Profile | null = null;
  
  constructor(initialProfile: Profile | null = null) {
    super();
    this.profile = initialProfile ? JSON.parse(JSON.stringify(initialProfile)) : null;
  }
  
  // Implement required abstract methods from BaseRepository
  protected override get table() {
    return profiles;
  }

  protected override get entityName() {
    return 'profile';
  }
  
  protected override getIdColumn() {
    return profiles.id;
  }
  
  // BaseRepository interface methods
  override async getById(id: string): Promise<Profile | undefined> {
    if (!this.profile || this.profile.id !== id) {
      return undefined;
    }
    return this.profile;
  }
  
  override async deleteById(id: string): Promise<boolean> {
    if (!this.profile || this.profile.id !== id) {
      return false;
    }
    this.profile = null;
    return true;
  }
  
  override async getCount(): Promise<number> {
    return this.profile ? 1 : 0;
  }
  
  // ProfileRepository specific methods
  override async getProfile(): Promise<Profile | undefined> {
    return this.profile || undefined;
  }
  
  override async insertProfile(profileData: Partial<Profile>): Promise<string> {
    const id = profileData.id || 'new-profile-id';
    this.profile = {
      // Default values for required fields
      publicIdentifier: null,
      profilePicUrl: null,
      backgroundCoverImageUrl: null,
      firstName: null,
      lastName: null,
      education: null,
      experiences: null,
      languages: null,
      languagesAndProficiencies: null,
      accomplishmentPublications: null,
      accomplishmentHonorsAwards: null,
      accomplishmentProjects: null,
      volunteerWork: null,
      city: null,
      state: null,
      countryFullName: null,
      embedding: null,
      
      // Spread partial profile data
      ...profileData,
      
      // Ensure required fields
      id,
      createdAt: profileData.createdAt || new Date(),
      updatedAt: profileData.updatedAt || new Date(),
      fullName: profileData.fullName || 'Unnamed User',
    } as Profile;
    
    return id;
  }
  
  override async updateProfile(id: string, updates: Partial<Profile>): Promise<boolean> {
    if (!this.profile || this.profile.id !== id) {
      return false;
    }
    
    this.profile = {
      ...this.profile,
      ...updates,
      updatedAt: new Date(),
    };
    
    return true;
  }
  
  override async deleteProfile(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}

describe('ProfileRepository', () => {
  let repository: MockProfileRepository;
  
  beforeEach(() => {
    // Create a fresh repository with the initial profile
    repository = new MockProfileRepository(initialProfile);
  });
  
  test('should initialize correctly', () => {
    expect(repository).toBeDefined();
  });
  
  test('should get the user profile', async () => {
    const profile = await repository.getProfile();
    
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('profile-1');
    expect(profile?.fullName).toBe('John Doe');
  });
  
  test('should insert a new profile', async () => {
    // First clear the existing profile for this test
    await repository.deleteProfile('profile-1');
    
    const newProfile: Partial<Profile> = {
      fullName: 'Jane Smith',
      occupation: 'Data Scientist',
      headline: 'AI Researcher | ML Engineer',
      summary: 'Experienced data scientist specializing in machine learning.',
      publicIdentifier: null,
      profilePicUrl: null,
      backgroundCoverImageUrl: null,
      firstName: null,
      lastName: null,
      education: null,
      experiences: null,
      languages: null,
      languagesAndProficiencies: null,
      accomplishmentPublications: null,
      accomplishmentHonorsAwards: null,
      accomplishmentProjects: null,
      volunteerWork: null,
      city: null,
      state: null,
      country: null,
      countryFullName: null,
      followerCount: null,
      embedding: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['data-science', 'machine-learning', 'ai'],
    };
    
    const profileId = await repository.insertProfile(newProfile);
    
    expect(profileId).toBeDefined();
    expect(typeof profileId).toBe('string');
    
    // Verify it was inserted
    const insertedProfile = await repository.getProfile();
    expect(insertedProfile).toBeDefined();
    expect(insertedProfile?.fullName).toBe('Jane Smith');
  });
  
  test('should update an existing profile', async () => {
    const updates = {
      occupation: 'Senior Software Engineer',
      headline: 'Tech Lead | Architecture Expert',
    };
    
    const success = await repository.updateProfile('profile-1', updates);
    
    expect(success).toBe(true);
    
    // Verify the update
    const updatedProfile = await repository.getProfile();
    expect(updatedProfile?.occupation).toBe('Senior Software Engineer');
    expect(updatedProfile?.headline).toBe('Tech Lead | Architecture Expert');
  });
  
  test('should delete a profile', async () => {
    const success = await repository.deleteProfile('profile-1');
    
    expect(success).toBe(true);
    
    // Verify the deletion
    const deletedProfile = await repository.getProfile();
    expect(deletedProfile).toBeUndefined();
  });
  
  test('should handle updating a non-existent profile', async () => {
    // First delete the profile
    await repository.deleteProfile('profile-1');
    
    // Then try to update it
    const success = await repository.updateProfile('profile-1', { occupation: 'New Occupation' });
    
    expect(success).toBe(false);
  });
  
  test('should handle complex profile data', async () => {
    const complexProfile: Partial<Profile> = {
      fullName: 'Alex Johnson',
      occupation: 'Full Stack Developer',
      headline: 'Web & Mobile Developer',
      summary: 'Building scalable applications.',
      publicIdentifier: null,
      profilePicUrl: null,
      backgroundCoverImageUrl: null,
      firstName: null,
      lastName: null,
      city: null,
      state: null,
      country: null,
      countryFullName: null,
      followerCount: null,
      experiences: [
        {
          title: 'Senior Developer',
          company: 'Tech Corp',
          description: 'Leading development of web applications',
          starts_at: { day: 1, month: 1, year: 2020 },
          ends_at: null,
          company_linkedin_profile_url: null,
          company_facebook_profile_url: null,
          location: null,
          logo_url: null,
        },
        {
          title: 'Developer',
          company: 'Startup Inc',
          description: 'Full stack development',
          starts_at: { day: 1, month: 1, year: 2018 },
          ends_at: { day: 31, month: 12, year: 2019 },
          company_linkedin_profile_url: null,
          company_facebook_profile_url: null,
          location: null,
          logo_url: null,
        },
      ],
      education: [
        {
          degree_name: 'Computer Science',
          school: 'Tech University',
          starts_at: { day: 1, month: 9, year: 2014 },
          ends_at: { day: 30, month: 6, year: 2018 },
          field_of_study: null,
          school_linkedin_profile_url: null,
          school_facebook_profile_url: null,
          description: null,
          logo_url: null,
          grade: null,
          activities_and_societies: null,
        },
      ],
      languages: ['English', 'JavaScript', 'Python'],
      languagesAndProficiencies: [
        { name: 'English', proficiency: 'Native' },
        { name: 'Spanish', proficiency: 'Intermediate' },
      ],
      accomplishmentPublications: [
        {
          name: 'Modern Web Development',
          publisher: 'Tech Publishing',
          published_on: { day: 15, month: 6, year: 2022 },
          description: null,
          url: null,
        },
      ],
      accomplishmentHonorsAwards: null,
      accomplishmentProjects: null,
      volunteerWork: null,
      embedding: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['web-development', 'full-stack', 'javascript'],
    };
    
    // First clear the existing profile for this test
    await repository.deleteProfile('profile-1');
    
    const profileId = await repository.insertProfile(complexProfile);
    
    expect(profileId).toBeDefined();
    
    // Verify complex data was saved correctly
    const savedProfile = await repository.getProfile();
    expect(savedProfile).toBeDefined();
    expect(savedProfile?.experiences?.length).toBe(2);
    expect(savedProfile?.education?.length).toBe(1);
    expect(savedProfile?.accomplishmentPublications?.length).toBe(1);
  });
});