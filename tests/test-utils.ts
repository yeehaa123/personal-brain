/**
 * Test utilities for the personal-brain project
 */
import { CLIInterface } from '../src/utils/cliInterface';
import logger from '../src/utils/logger';

/**
 * Mock CLIInterface methods and track calls
 * @param trackers Object to store tracked function calls
 * @returns Original CLIInterface methods for restoration
 */
export function mockCLIInterface(trackers: any) {
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
  
  CLIInterface.displayList = function(items, formatter) {
    trackers.displayListCalls.push({ items, formatter });
  };
  
  CLIInterface.printLabelValue = function(label, value, options = {}) {
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
export function restoreCLIInterface(original: any) {
  // Restore methods
  CLIInterface.displayTitle = original.displayTitle;
  CLIInterface.displaySubtitle = original.displaySubtitle;
  CLIInterface.error = original.error;
  CLIInterface.warn = original.warn;
  CLIInterface.success = original.success;
  CLIInterface.info = original.info;
  CLIInterface.print = original.print;
  CLIInterface.displayList = original.displayList;
  CLIInterface.printLabelValue = original.printLabelValue;
  CLIInterface.formatId = original.formatId;
  CLIInterface.formatDate = original.formatDate;
  CLIInterface.formatTags = original.formatTags;
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
export function mockDisplayNotes(displayNotes: any, trackers: any) {
  const originalDisplayNotes = displayNotes;
  
  // Cast to any to allow property assignment
  (global as any).displayNotes = function(notes: any) {
    trackers.displayNotesCalls.push(notes);
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
export function mockFunction(module: any, functionName: string, mockImpl: (...args: unknown[]) => unknown) {
  const originalFn = module[functionName];
  module[functionName] = mockImpl;
  return originalFn;
}