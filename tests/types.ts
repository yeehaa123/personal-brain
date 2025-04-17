/**
 * Common type definitions for tests
 */


import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';


// Mock function types
export type MockFunction<T extends (...args: unknown[]) => unknown> = {
  (...args: Parameters<T>): ReturnType<T>;
  calls: unknown[][];
  mock: {
    calls: unknown[][];
    results: unknown[];
  };
};

// Test data types
export interface MockNote extends Partial<Note> {
  id: string;
  title: string;
}

export interface MockProfile extends Partial<Profile> {
  id: string;
  fullName: string;
}

// Mock response types
export interface MockCommandResponse {
  type: string;
  data: unknown;
}

export interface MockServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Test fixture types
export interface TestFixture {
  notes: MockNote[];
  profiles: MockProfile[];
  externalSources: ExternalSourceResult[];
}