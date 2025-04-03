/**
 * CLI interface utilities for tests
 */

// Define tracker interfaces
interface DisplayListCall {
  items: unknown[];
  formatter?: (item: unknown, index: number) => string;
}

interface DisplayNotesCall {
  notes: unknown[];
  options?: Record<string, unknown>;
}

// Using array for backward compatibility with existing tests
export type PrintLabelValueCall = [string, unknown, Record<string, unknown>?];

// Create tracking objects for CLI interface call monitoring
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