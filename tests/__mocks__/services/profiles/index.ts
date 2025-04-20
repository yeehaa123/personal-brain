/**
 * Mock Profiles Services Index
 * 
 * Exports all standardized mock implementations for profile-related services
 */

export { MockProfileEmbeddingService } from './profileEmbeddingService';
export { MockProfileTagService } from './profileTagService';
export { MockProfileSearchService } from './profileSearchService';

// For backward compatibility with existing tests, re-export from repositories
export { MockProfileRepository } from '../../repositories/profileRepository';