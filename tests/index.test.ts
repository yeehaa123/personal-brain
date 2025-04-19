import { describe, expect, test } from 'bun:test';

import { ExternalSourceContext, NoteContext, ProfileContext } from '@/contexts';
// Import directly from the implementation files for testing

describe('MCP SDK', () => {
  test('NoteContext can be imported and instantiated', () => {
    const noteContext = NoteContext.createWithDependencies({ apiKey: 'mock-api-key' });
    expect(noteContext).toBeDefined();
    expect(noteContext).toBeInstanceOf(NoteContext);
  });
  
  test('ProfileContext can be imported and instantiated', () => {
    const profileContext = ProfileContext.createWithDependencies({ apiKey: 'mock-api-key' });
    expect(profileContext).toBeDefined();
    expect(profileContext).toBeInstanceOf(ProfileContext);
  });
  
  test('ExternalSourceContext can be imported and instantiated', () => {
    const externalSourceContext = ExternalSourceContext.createWithDependencies({ 
      apiKey: 'mock-api-key', 
      newsApiKey: 'mock-newsapi-key',
    });
    expect(externalSourceContext).toBeDefined();
    expect(externalSourceContext).toBeInstanceOf(ExternalSourceContext);
  });
  
  test('All contexts return MCP servers', () => {
    const noteContext = NoteContext.createWithDependencies({ apiKey: 'mock-api-key' });
    const profileContext = ProfileContext.createWithDependencies({ apiKey: 'mock-api-key' });
    const externalSourceContext = ExternalSourceContext.createWithDependencies({ 
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