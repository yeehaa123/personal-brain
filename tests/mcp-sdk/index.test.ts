import { test, expect, describe } from 'bun:test';
import { NoteContext, ProfileContext } from '@/mcp-sdk';

describe('MCP SDK', () => {
  test('NoteContext can be imported and instantiated', () => {
    const noteContext = new NoteContext('mock-api-key');
    expect(noteContext).toBeDefined();
    expect(noteContext).toBeInstanceOf(NoteContext);
  });
  
  test('ProfileContext can be imported and instantiated', () => {
    const profileContext = new ProfileContext('mock-api-key');
    expect(profileContext).toBeDefined();
    expect(profileContext).toBeInstanceOf(ProfileContext);
  });
  
  test('Both contexts return MCP servers', () => {
    const noteContext = new NoteContext('mock-api-key');
    const profileContext = new ProfileContext('mock-api-key');
    
    const noteMcpServer = noteContext.getMcpServer();
    const profileMcpServer = profileContext.getMcpServer();
    
    expect(noteMcpServer).toBeDefined();
    expect(profileMcpServer).toBeDefined();
  });
});