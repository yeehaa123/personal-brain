import { describe, test, expect } from 'bun:test';
import { WikipediaSource } from '@mcp/context/sources/wikipediaSource';

// These tests perform real API calls to Wikipedia for functional testing
// They are disabled by default to avoid rate limits and network dependencies
// Set to 'true' to enable them when needed
const ENABLE_FUNCTIONAL_TESTS = false;

describe('Wikipedia Source Functional Tests', () => {
  // Skip all tests if not enabled
  (ENABLE_FUNCTIONAL_TESTS ? test : test.skip)('should retrieve quantum computing information from Wikipedia', async () => {
    const source = new WikipediaSource();
    
    // First check if Wikipedia is available
    const isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(true);
    
    // If available, search for quantum computing
    const results = await source.search({ 
      query: 'What is quantum computing?',
      limit: 2,
    });
    
    // Should return at least one result
    expect(results.length).toBeGreaterThan(0);
    
    // Check the first result
    const firstResult = results[0];
    expect(firstResult.title.toLowerCase()).toContain('quantum');
    expect(firstResult.content.length).toBeGreaterThan(100);
    expect(firstResult.url).toContain('wikipedia.org/wiki/');
    
    // Log the content for inspection
    console.log('Wikipedia result for "quantum computing":');
    console.log(`Title: ${firstResult.title}`);
    console.log(`Content excerpt: ${firstResult.content.substring(0, 300)}...`);
    console.log(`URL: ${firstResult.url}`);
  });
});