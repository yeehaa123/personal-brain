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
export { MockProfileContext } from './profileContext';
export { MockExternalSourceContext } from './externalSourceContext';

// Service mocks
export {
  MockMemoryService,
  MockQueryService,
  MockResourceService,
  MockToolService,
} from './services';