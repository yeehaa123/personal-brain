/**
 * Common test mocks for the personal-brain project
 */

import { clearTestEnv, setTestEnv } from './utils/envUtils';


// Note: These functions have been moved to @test/__mocks__/models/note.ts
// Please update your imports to use the new location

// Profile mock is now in @test/__mocks__/models/profile.ts

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

// Logger mock functions are now in @test/__mocks__/core/logger.ts

// Mock environment setup
export function mockEnv() {
  setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
}

// Mock reset
export function resetMocks() {
  clearTestEnv('ANTHROPIC_API_KEY');
}
