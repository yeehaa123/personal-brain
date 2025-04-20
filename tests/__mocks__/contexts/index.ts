/**
 * Context mocks for testing
 * 
 * This module exports standardized mock implementations of all context classes,
 * following the singleton pattern with getInstance(), resetInstance(), and createFresh().
 */

// Context mocks
export { MockBaseContext } from './baseContext';
export { MockConversationContext } from './conversationContext';
export { MockNoteContext } from './noteContext';
export { MockNoteStorageAdapter } from './noteStorageAdapter';
export { MockProfileContext } from './profileContext';
export { MockExternalSourceContext } from './externalSources';
export { MockWebsiteContext } from './websiteContext';

// Service mocks
export {
  MockMemoryService,
  MockQueryService,
  MockResourceService,
  MockToolService,
} from './services';