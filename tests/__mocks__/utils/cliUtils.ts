/**
 * CLI Mock Utilities
 * 
 * This file provides standardized mock implementations for CLI-related functions
 * to be used across tests.
 * 
 * Usage:
 * ```typescript
 * import { mockCLIInterface, createTrackers } from '@test/__mocks__/utils/cliUtils';
 * 
 * // Create trackers to monitor function calls
 * const trackers = createTrackers();
 * 
 * // Mock the CLI interface
 * const original = mockCLIInterface(trackers);
 * 
 * // Run your test code...
 * 
 * // Check what was output
 * expect(trackers.displayTitleCalls).toContain('Expected Title');
 * 
 * // Restore original functions
 * restoreCLIInterface(original);
 * ```
 */

import { CLIInterface } from '@utils/cliInterface';

// Define tracker interfaces
export interface DisplayListCall {
  items: unknown[];
  formatter?: (item: unknown, index: number) => string;
}

export interface DisplayNotesCall {
  notes: unknown[];
  options?: Record<string, unknown>;
}

// Using array for backward compatibility with existing tests
export type PrintLabelValueCall = [string, unknown, Record<string, unknown>?];

/**
 * Create tracking objects for CLI interface call monitoring
 */
export function createTrackers() {
  return {
    displayTitleCalls: [] as string[],
    displaySubtitleCalls: [] as string[],
    errorCalls: [] as string[],
    warnCalls: [] as string[],
    successCalls: [] as string[],
    infoCalls: [] as string[],
    printCalls: [] as string[],
    displayListCalls: [] as DisplayListCall[],
    displayNotesCalls: [] as DisplayNotesCall[],
    printLabelValueCalls: [] as PrintLabelValueCall[],
  };
}

/**
 * Mock CLIInterface methods and track calls
 * 
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
 * 
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
 * Mock displayNotes function and track calls
 * 
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