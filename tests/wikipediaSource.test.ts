import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { WikipediaSource } from '../src/mcp/context/sources/wikipediaSource';

// Save the original fetch
const originalFetch = globalThis.fetch;
let mockFetch: typeof fetch;

describe('Wikipedia Source Tests', () => {
  beforeEach(() => {
    // Create a new mock for each test
    mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }),
      }) as Response);
    
    // Replace global fetch with our mock
    globalThis.fetch = mockFetch;
  });
  
  afterEach(() => {
    // Restore original fetch after each test
    globalThis.fetch = originalFetch;
  });

  test('should properly handle Wikipedia API response format in checkAvailability', async () => {
    // Create the source
    const source = new WikipediaSource();
    
    // Mock different response formats that could come from Wikipedia
    
    // 1. Test with nested structure (data.query.general)
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          query: {
            general: {
              sitename: 'Wikipedia',
              mainpage: 'Main Page',
            },
          },
        }),
      }) as Response);
    
    let isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(true);
    
    // 2. Test with flat structure (direct general info)
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          sitename: 'Wikipedia',
          mainpage: 'Main Page',
          // ... other general properties
        }),
      }) as Response);
    
    isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(true);
    
    // 3. Test with unexpected structure
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          someOtherProperty: 'value',
        }),
      }) as Response);
    
    isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(false);
  });
  
  test('should properly search for quantum computing information', async () => {
    const source = new WikipediaSource();
    
    // Mock search results
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          query: {
            search: [
              {
                pageid: 123,
                title: 'Quantum computing',
                snippet: 'This is a test snippet about quantum computing',
              },
            ],
          },
        }),
      }) as Response);
    
    // Mock article content
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          query: {
            pages: {
              '123': {
                pageid: 123,
                title: 'Quantum computing',
                extract: 'A quantum computer is a computer that exploits quantum mechanical phenomena. On small scales, physical matter exhibits properties of both particles and waves, and quantum computing takes advantage of this behavior using specialized hardware.',
              },
            },
          },
        }),
      }) as Response);
    
    // Test the search
    const results = await source.search({ 
      query: 'What is quantum computing?',
      limit: 2,
    });
    
    // Verify the results
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Quantum computing');
    expect(results[0].content).toContain('quantum computer');
    expect(results[0].url).toContain('wikipedia.org/wiki/Quantum_computing');
    expect(results[0].source).toBe('Wikipedia');
  });
});