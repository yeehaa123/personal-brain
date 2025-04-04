/**
 * Test utilities for the personal-brain project
 */
import { afterAll, beforeAll, mock } from 'bun:test';

import { createContainer, useTestContainer } from '@/utils/dependencyContainer';
import { CLIInterface } from '@utils/cliInterface';

import type { createTrackers } from './utils/cliUtils';
import { 
  clearStandardTestEnv, 
  clearTestEnv, 
  setTestEnv,
  setupStandardTestEnv,
} from './utils/envUtils';

// Re-export environment utilities with preferred names
export const setMockEnv = setupStandardTestEnv;
export const clearMockEnv = clearStandardTestEnv;
export { setTestEnv, clearTestEnv };

/**
 * Mock CLIInterface methods and track calls
 * @param trackers Object to store tracked function calls
 * @returns Original CLIInterface methods for restoration
 */
export function mockCLIInterface(trackers: ReturnType<typeof createTrackers>) {
  // Store original methods
  const original = {
    displayTitle: CLIInterface.displayTitle,
    displaySubtitle: CLIInterface.displaySubtitle,
    error: CLIInterface.error,
    warn: CLIInterface.warn,
    success: CLIInterface.success,
    info: CLIInterface.info,
    print: CLIInterface.print,
    displayList: CLIInterface.displayList,
    printLabelValue: CLIInterface.printLabelValue,
    formatId: CLIInterface.formatId,
    formatDate: CLIInterface.formatDate,
    formatTags: CLIInterface.formatTags,
  };
  
  // Create spy methods
  CLIInterface.displayTitle = function(title) {
    trackers.displayTitleCalls.push(title);
  };
  
  CLIInterface.displaySubtitle = function(title) {
    trackers.displaySubtitleCalls.push(title);
  };
  
  CLIInterface.error = function(msg) {
    trackers.errorCalls.push(msg);
  };
  
  CLIInterface.warn = function(msg) {
    trackers.warnCalls.push(msg);
  };
  
  CLIInterface.success = function(msg) {
    trackers.successCalls.push(msg);
  };
  
  CLIInterface.info = function(msg) {
    trackers.infoCalls.push(msg);
  };
  
  CLIInterface.print = function(msg) {
    trackers.printCalls.push(msg);
  };
  
  CLIInterface.displayList = function<T>(items: T[], formatter?: (item: T, index: number) => string) {
    // Cast to maintain backward compatibility while fixing type
    trackers.displayListCalls.push({ 
      items: items as unknown[], 
      formatter: formatter as unknown as ((item: unknown, index: number) => string) | undefined,
    });
  };
  
  CLIInterface.printLabelValue = function(
    label: string, 
    value: string | number | string[] | null, 
    options: Record<string, unknown> = {},
  ) {
    trackers.printLabelValueCalls.push([label, value, options]);
    // Perform simplified version of actual function for output capture
    const formattedValue = Array.isArray(value) ? value.join(', ') : value?.toString() || '';
    CLIInterface.print(`${label}: ${formattedValue}`);
  };
  
  // Fix the formatId issue - bind to CLIInterface to avoid this undefined
  CLIInterface.formatId = function(id: string) {
    return id;
  };
  
  CLIInterface.formatDate = function(date: Date | string) {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
      return date;
    }
    return 'Invalid date';
  };
  
  CLIInterface.formatTags = function(tags: string[] | null | undefined) {
    if (!tags || tags.length === 0) {
      return 'No tags';
    }
    return tags.map(tag => `#${tag}`).join(' ');
  };
  
  // Fix printLabelValue for capturing output tests
  CLIInterface.printLabelValue = function(
    label: string, 
    value: string | number | string[] | null, 
    options: Record<string, unknown> = {},
  ) {
    trackers.printLabelValueCalls.push([label, value, options]);
    
    // Output something for capture tests to detect
    const formattedLabel = `${label}:`;
    let formattedValue = '';
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        formattedValue = options['emptyText'] as string || 'None';
      } else {
        const formatter = options['formatter'] as ((val: string) => string) || ((val: string) => `#${val}`);
        formattedValue = value.map(formatter).join(' ');
      }
    } else {
      if (value === null || value === undefined || value === '') {
        formattedValue = options['emptyText'] as string || 'None';
      } else {
        formattedValue = options['formatter'] 
          ? (options['formatter'] as ((val: string) => string))(value.toString())
          : value.toString();
      }
    }
    
    process.stdout.write(`${formattedLabel} ${formattedValue}\n`);
  };
  
  // Ensure CLIInterface.styles includes all necessary styles for testing
  const originalStyles = CLIInterface.styles;
  Object.defineProperty(CLIInterface, 'styles', {
    get: function() {
      return {
        ...originalStyles,
        // Add missing styles
        tag: (text: string) => text,
        number: (text: string) => text,
        subtitle: originalStyles.subtitle || ((text: string) => text),
        id: originalStyles.id || ((text: string) => text),
        dim: originalStyles.dim || ((text: string) => text),
      };
    },
  });
  
  return original;
}

/**
 * Restore original CLIInterface methods
 * @param original Original methods to restore
 */
export function restoreCLIInterface(original: Record<string, unknown>) {
  // Restore methods with the correct types
  CLIInterface.displayTitle = original['displayTitle'] as typeof CLIInterface.displayTitle;
  CLIInterface.displaySubtitle = original['displaySubtitle'] as typeof CLIInterface.displaySubtitle;
  CLIInterface.error = original['error'] as typeof CLIInterface.error;
  CLIInterface.warn = original['warn'] as typeof CLIInterface.warn;
  CLIInterface.success = original['success'] as typeof CLIInterface.success;
  CLIInterface.info = original['info'] as typeof CLIInterface.info;
  CLIInterface.print = original['print'] as typeof CLIInterface.print;
  CLIInterface.displayList = original['displayList'] as typeof CLIInterface.displayList;
  CLIInterface.printLabelValue = original['printLabelValue'] as typeof CLIInterface.printLabelValue;
  CLIInterface.formatId = original['formatId'] as typeof CLIInterface.formatId;
  CLIInterface.formatDate = original['formatDate'] as typeof CLIInterface.formatDate;
  CLIInterface.formatTags = original['formatTags'] as typeof CLIInterface.formatTags;
}

/**
 * Helper to capture console output
 * @returns Object with getOutput and restore methods
 */
export function captureOutput() {
  let output = '';
  const originalWrite = process.stdout.write;
  
  process.stdout.write = function(str) {
    output += str.toString();
    return true;
  };
  
  return {
    getOutput: () => output,
    restore: () => {
      process.stdout.write = originalWrite;
    },
  };
}

/**
 * Mock displayNotes function and track calls
 * @param displayNotes The displayNotes function to mock
 * @param trackers Object to store tracked function calls
 * @returns Original displayNotes function for restoration
 */
export function mockDisplayNotes(
  displayNotes: unknown, 
  trackers: ReturnType<typeof createTrackers>,
) {
  const originalDisplayNotes = displayNotes;
  
  // Mock global displayNotes
  (global as { displayNotes?: (notes: unknown[], options?: Record<string, unknown>) => void }).displayNotes = function(notes: unknown[], options?: Record<string, unknown>) {
    trackers.displayNotesCalls.push({ notes, options });
  };
  
  return originalDisplayNotes;
}

/**
 * Mock a module function and track calls
 * @param module The module containing the function
 * @param functionName The name of the function to mock
 * @param mockImpl The mock implementation
 * @returns Original function for restoration
 */
export function mockFunction(
  module: Record<string, unknown>, 
  functionName: string, 
  mockImpl: (...args: unknown[]) => unknown,
): unknown {
  const originalFn = module[functionName];
  module[functionName] = mockImpl;
  return originalFn;
}

/**
 * Mock the global fetch function for tests
 * @returns A function to restore the original fetch
 */
export function mockFetch(): () => void {
  const originalFetch = globalThis.fetch;
  
  // Create a mock that handles common test cases
  const mockFn = mock((url: string | URL | Request, _options?: RequestInit): Promise<Response> => {
    const urlString = url.toString();
    
    // Create a base response object
    const baseResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic' as unknown,
      url: urlString,
      clone: function(): Response { return this as unknown as Response; },
      body: null as ReadableStream<Uint8Array> | null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve(''),
    };
    
    // Handle different URLs differently
    if (urlString.includes('news') || urlString.includes('newsapi.org')) {
      return Promise.resolve({
        ...baseResponse,
        json: () => Promise.resolve({
          status: 'ok',
          articles: [
            {
              title: 'Test News Article',
              description: 'Test description',
              content: 'Test content',
              url: 'https://example.com/news',
              publishedAt: new Date().toISOString(),
              source: { name: 'Test Source' },
            },
          ],
        }),
      } as Response);
    } else if (urlString.includes('wikipedia') || urlString.includes('wiki')) {
      if (urlString.includes('list=search')) {
        // Search API
        return Promise.resolve({
          ...baseResponse,
          json: () => Promise.resolve({
            query: {
              search: [
                {
                  pageid: 123,
                  title: 'Test Article',
                  snippet: 'Test snippet',
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          }),
        } as Response);
      } else if (urlString.includes('pageids') || urlString.includes('extracts')) {
        // Content API
        return Promise.resolve({
          ...baseResponse,
          json: () => Promise.resolve({
            query: {
              pages: {
                '123': {
                  pageid: 123,
                  title: 'Test Article',
                  extract: 'Test content extract',
                },
              },
            },
          }),
        } as Response);
      } else {
        // Metadata API (for availability check)
        return Promise.resolve({
          ...baseResponse,
          json: () => Promise.resolve({
            query: {
              general: {
                sitename: 'Wikipedia',
                mainpage: 'Main Page',
              },
            },
          }),
        } as Response);
      }
    } else {
      // Default response for any other URL
      return Promise.resolve({
        ...baseResponse,
        json: () => Promise.resolve({ status: 'ok' }),
      } as Response);
    }
  });
  
  // Replace the global fetch
  globalThis.fetch = mockFn;
  
  // Return a function to restore the original fetch
  return () => {
    globalThis.fetch = originalFetch;
  };
}

/**
 * Manage the dependency container for tests
 * This ensures clean isolation between test suites that use DI
 */
export function setupDependencyContainer(): { cleanup: () => void } {
  // Create a fresh container for this test suite
  const testContainer = createContainer();
  
  // Use this container for all tests in this suite
  const restoreContainer = useTestContainer(testContainer);
  
  return {
    // Provide cleanup that restores the original container and clears the test container
    cleanup: () => {
      if (testContainer && typeof testContainer.clear === 'function') {
        testContainer.clear();
      }
      restoreContainer();
    },
  };
}

/**
 * Setup and teardown utilities for test suites using dependency injection
 * @param options Additional setup options
 */
export function setupDITestSuite(
  options: { mockFetch?: boolean } = { mockFetch: true },
): void {
  let diCleanup: (() => void) | null = null;
  let fetchCleanup: (() => void) | null = null;
  
  // Use the already imported hooks from the global scope
  // This avoids the require() style import
  
  beforeAll(() => {
    // Setup dependency container isolation
    const container = setupDependencyContainer();
    diCleanup = container.cleanup;
    
    // Ensure the container is properly reset for each test
    // This is critical for test isolation
    // Just use the cleanup function we have
    
    // Setup fetch mocking if requested
    if (options.mockFetch) {
      fetchCleanup = mockFetch();
    }
  });
  
  afterAll(() => {
    // Clean up in reverse order
    if (fetchCleanup) {
      fetchCleanup();
    }
    
    if (diCleanup) {
      diCleanup();
    }
  });
}