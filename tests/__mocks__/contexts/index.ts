/**
 * Mock contexts for testing
 */

// Base context mocks
export { MockBaseContext } from './baseContext';

// Conversation context mocks
export { MockConversationContext } from './conversationContext';
export { MockConversationFormatter } from './conversationFormatter';
export { MockConversationStorageAdapter } from './conversationStorageAdapter';

// Note context mocks
export { MockNoteContext } from './noteContext';
export { MockNoteStorageAdapter } from './noteStorageAdapter';

// External source context mocks
export { MockExternalSourceContext } from './externalSourceContext';
export { MockExternalSourceStorageAdapter } from './externalSourceStorageAdapter';
export { MockNewsApiSource, MockWikipediaSource } from './externalSources';

// Profile context mocks
export { MockProfileContext } from './profileContext';
export { MockProfileStorageAdapter } from './profileStorageAdapter';

// Website context mocks
export { MockWebsiteContext } from './websiteContext';
export { MockWebsiteStorageAdapter } from './websiteStorageAdapter';
export { MockDeploymentAdapter } from './deploymentAdapter';