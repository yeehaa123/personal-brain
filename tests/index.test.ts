import { describe, expect, test } from 'bun:test';

import { ExternalSourceContext } from '@/contexts/externalSources/core/externalSourceContext';
import { NoteContext } from '@/contexts/notes/core/noteContext';
import { ProfileContext } from '@/contexts/profiles/core/profileContext';
// Import directly from the implementation files for testing

describe('MCP SDK', () => {
  test('NoteContext can be imported and instantiated', () => {
    const noteContext = new NoteContext('mock-api-key');
    expect(noteContext).toBeDefined();
    expect(noteContext).toBeInstanceOf(NoteContext);
  });
  
  test('ProfileContext can be imported and instantiated', () => {
    const profileContext = new ProfileContext({ apiKey: 'mock-api-key' });
    expect(profileContext).toBeDefined();
    expect(profileContext).toBeInstanceOf(ProfileContext);
  });
  
  test('ExternalSourceContext can be imported and instantiated', () => {
    const externalSourceContext = new ExternalSourceContext({ apiKey: 'mock-api-key', newsApiKey: 'mock-newsapi-key' });
    expect(externalSourceContext).toBeDefined();
    expect(externalSourceContext).toBeInstanceOf(ExternalSourceContext);
  });
  
  test('All contexts return MCP servers', () => {
    const noteContext = new NoteContext('mock-api-key');
    const profileContext = new ProfileContext({ apiKey: 'mock-api-key' });
    const externalSourceContext = new ExternalSourceContext({ apiKey: 'mock-api-key', newsApiKey: 'mock-newsapi-key' });
    
    const noteMcpServer = noteContext.getMcpServer();
    const profileMcpServer = profileContext.getMcpServer();
    const externalSourceMcpServer = externalSourceContext.getMcpServer();
    
    expect(noteMcpServer).toBeDefined();
    expect(profileMcpServer).toBeDefined();
    expect(externalSourceMcpServer).toBeDefined();
  });
});