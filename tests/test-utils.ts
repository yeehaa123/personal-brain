/**
 * Test utilities for the personal-brain project
 */
import { CLIInterface } from '@utils/cliInterface';
import { createTrackers } from '@test/mocks';

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
  
  return original;
}

/**
 * Restore original CLIInterface methods
 * @param original Original methods to restore
 */
export function restoreCLIInterface(original: Record<string, unknown>) {
  // Restore methods with the correct types
  CLIInterface.displayTitle = original.displayTitle as typeof CLIInterface.displayTitle;
  CLIInterface.displaySubtitle = original.displaySubtitle as typeof CLIInterface.displaySubtitle;
  CLIInterface.error = original.error as typeof CLIInterface.error;
  CLIInterface.warn = original.warn as typeof CLIInterface.warn;
  CLIInterface.success = original.success as typeof CLIInterface.success;
  CLIInterface.info = original.info as typeof CLIInterface.info;
  CLIInterface.print = original.print as typeof CLIInterface.print;
  CLIInterface.displayList = original.displayList as typeof CLIInterface.displayList;
  CLIInterface.printLabelValue = original.printLabelValue as typeof CLIInterface.printLabelValue;
  CLIInterface.formatId = original.formatId as typeof CLIInterface.formatId;
  CLIInterface.formatDate = original.formatDate as typeof CLIInterface.formatDate;
  CLIInterface.formatTags = original.formatTags as typeof CLIInterface.formatTags;
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