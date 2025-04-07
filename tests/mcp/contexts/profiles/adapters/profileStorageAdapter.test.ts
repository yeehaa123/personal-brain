/**
 * Tests for ProfileStorageAdapter
 */
import { describe, expect, mock, test } from 'bun:test';

import { ProfileStorageAdapter } from '@/mcp/contexts/profiles/adapters/profileStorageAdapter';
import type { Profile } from '@/models/profile';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import { silenceLogger } from '@test/__mocks__';
import logger from '@utils/logger';

// Mock profile for testing
const mockProfile: Profile = {
  id: 'profile-1',
  fullName: 'Test User',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  embedding: [0.1, 0.2, 0.3],
  tags: ['developer', 'typescript'],
  publicIdentifier: 'testuser',
  headline: 'Software Developer',
  summary: 'Experienced developer',
  // Other fields as null or defaults
  profilePicUrl: null,
  backgroundCoverImageUrl: null,
  firstName: null,
  lastName: null,
  followerCount: 0,
  occupation: null,
  city: null,
  state: null,
  country: null,
  countryFullName: null,
  experiences: null,
  education: null,
  languages: null,
  languagesAndProficiencies: null,
  accomplishmentPublications: null,
  accomplishmentHonorsAwards: null,
  accomplishmentProjects: null,
  volunteerWork: null,
};

// Create a mock repository
function createMockRepository() {
  return {
    getProfile: mock(() => Promise.resolve(mockProfile)),
    insertProfile: mock((profile: Profile) => Promise.resolve(profile.id || 'new-id')),
    updateProfile: mock(() => Promise.resolve(true)),
    deleteProfile: mock(() => Promise.resolve(true)),
    // Include other methods that might be called
    getById: mock(() => Promise.resolve(mockProfile)),
    deleteById: mock(() => Promise.resolve(true)),
  } as unknown as ProfileRepository;
}

describe('ProfileStorageAdapter', () => {
  // Mock the logger to prevent output in tests
  silenceLogger(logger);
  
  // In Bun we can't do automatic cleanup, but we could do manual cleanup in each test if needed
  
  // Create a fresh adapter for each test
  function createFreshAdapter() {
    const mockRepo = createMockRepository();
    return { 
      adapter: new ProfileStorageAdapter(mockRepo),
      mockRepo,
    };
  }

  test('create should call insertProfile on repository', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.create({ fullName: 'New User' });
    
    expect(mockRepo.insertProfile).toHaveBeenCalled();
    expect(result).toEqual('new-id');
  });

  test('read should retrieve profile by ID', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.read('profile-1');
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toEqual(mockProfile);
  });

  test('read should return null for non-matching ID', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    // Mock different behavior for this test
    mockRepo.getProfile = mock(() => Promise.resolve({...mockProfile, id: 'different-id'}));
    
    const result = await adapter.read('profile-1');
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('update should call updateProfile on repository', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.update('profile-1', { fullName: 'Updated Name' });
    
    expect(mockRepo.updateProfile).toHaveBeenCalledWith('profile-1', { fullName: 'Updated Name' });
    expect(result).toBe(true);
  });

  test('delete should call deleteProfile on repository', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.delete('profile-1');
    
    expect(mockRepo.deleteProfile).toHaveBeenCalledWith('profile-1');
    expect(result).toBe(true);
  });

  test('search should return matching profile', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.search({ fullName: 'Test User' });
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toEqual([mockProfile]);
  });

  test('search should return empty array for non-matching criteria', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.search({ fullName: 'Non-matching Name' });
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('list should return profile in array', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.list();
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toEqual([mockProfile]);
  });

  test('list should respect offset option', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.list({ offset: 1 });
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('count should return 1 for existing profile', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.count();
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toBe(1);
  });

  test('count should return 0 for non-matching criteria', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.count({ fullName: 'Non-matching Name' });
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toBe(0);
  });

  test('getProfile should pass through to repository', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    const result = await adapter.getProfile();
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toEqual(mockProfile);
  });

  test('adapter should handle repository errors gracefully', async () => {
    const { adapter, mockRepo } = createFreshAdapter();
    
    // Mock error for this test
    mockRepo.getProfile = mock(() => Promise.reject(new Error('Repository error')));
    
    const result = await adapter.read('profile-1');
    
    expect(mockRepo.getProfile).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});