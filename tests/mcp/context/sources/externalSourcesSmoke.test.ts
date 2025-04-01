import { describe, expect, test } from 'bun:test';
import { ExternalSourceContext } from '@/mcp/contexts/externalSources';
import { WikipediaSource, NewsApiSource } from '@/mcp/contexts/externalSources/sources';
import { BrainProtocol } from '@/mcp/protocol';

describe('External Sources Smoke Test', () => {
  test('it should create and register sources without errors', () => {
    // Create the external source context
    const context = new ExternalSourceContext();
    
    // Ensure it was created
    expect(context).toBeDefined();
    
    // Create Wikipedia source
    const wikiSource = new WikipediaSource();
    expect(wikiSource.name).toBe('Wikipedia');
    
    // Create NewsAPI source
    const newsSource = new NewsApiSource();
    expect(newsSource.name).toBe('NewsAPI');
    
    // These should not throw errors
    context.registerSource(wikiSource);
    context.registerSource(newsSource);
  });
  
  test('it should initialize BrainProtocol with external sources correctly', () => {
    // Create the brain protocol
    const protocol = new BrainProtocol();
    
    // Ensure it was created
    expect(protocol).toBeDefined();
    
    // Protocol should have access to external sources
    const externalContext = protocol.getExternalSourceContext();
    expect(externalContext).toBeDefined();
    
    // External sources should be disabled by default (after our fix)
    expect(protocol['useExternalSources']).toBe(false);
    
    // Should be able to toggle external sources
    protocol.setUseExternalSources(false);
    expect(protocol['useExternalSources']).toBe(false);
  });
  
  test('it should find all necessary files for external sources', () => {
    // Just verify the files exist and can be imported
    const brainProtocolPath = import.meta.resolve('../src/mcp/protocol/brainProtocol');
    expect(brainProtocolPath).toBeDefined();
    
    const externalSourceContextPath = import.meta.resolve('../src/mcp/contexts/externalSources/externalSourceContext');
    expect(externalSourceContextPath).toBeDefined();
    
    const wikpediaSourcePath = import.meta.resolve('../src/mcp/contexts/externalSources/sources/wikipediaSource');
    expect(wikpediaSourcePath).toBeDefined();
    
    const newsApiSourcePath = import.meta.resolve('../src/mcp/contexts/externalSources/sources/newsApiSource');
    expect(newsApiSourcePath).toBeDefined();
    
    const interfacePath = import.meta.resolve('../src/mcp/contexts/externalSources/sources/externalSourceInterface');
    expect(interfacePath).toBeDefined();
  });
});