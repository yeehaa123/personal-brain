/**
 * Profile services index
 * 
 * PUBLIC API: These exports are intended for use by upstream consumers
 * Based on analysis of imports, these services are the ones directly used
 * by the ProfileContext implementation.
 */
export { ProfileRepository } from './profileRepository';
export { ProfileEmbeddingService } from './profileEmbeddingService';
export { ProfileTagService } from './profileTagService';
export { ProfileSearchService } from './profileSearchService';