import { describe, expect, test } from 'bun:test';

import { ExternalSourceContext, NoteContext, ProfileContextV2 } from '@/contexts';
// Import directly from the implementation files for testing

describe('MCP SDK', () => {
  test('NoteContext can be imported and instantiated', () => {
    const noteContext = NoteContext.createFresh({ apiKey: 'mock-api-key' });
    expect(noteContext).toBeDefined();
    expect(noteContext).toBeInstanceOf(NoteContext);
  });
  
  test('ProfileContextV2 can be imported and instantiated', () => {
    const profileContext = ProfileContextV2.createFresh();
    expect(profileContext).toBeDefined();
    expect(profileContext).toBeInstanceOf(ProfileContextV2);
  });
  
  test('ExternalSourceContext can be imported and instantiated', () => {
    const externalSourceContext = ExternalSourceContext.createFresh({ 
      apiKey: 'mock-api-key', 
      newsApiKey: 'mock-newsapi-key',
    });
    expect(externalSourceContext).toBeDefined();
    expect(externalSourceContext).toBeInstanceOf(ExternalSourceContext);
  });
  
  test('All contexts return MCP servers', () => {
    const noteContext = NoteContext.createFresh({ apiKey: 'mock-api-key' });
    const profileContext = ProfileContextV2.createFresh();
    const externalSourceContext = ExternalSourceContext.createFresh({ 
      apiKey: 'mock-api-key', 
      newsApiKey: 'mock-newsapi-key',
    });
    
    const noteMcpServer = noteContext.getMcpServer();
    const profileMcpServer = profileContext.getMcpServer();
    const externalSourceMcpServer = externalSourceContext.getMcpServer();
    
    expect(noteMcpServer).toBeDefined();
    expect(profileMcpServer).toBeDefined();
    expect(externalSourceMcpServer).toBeDefined();
  });
});