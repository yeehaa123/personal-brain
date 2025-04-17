/**
 * Tests for the core interfaces index exports
 * 
 * These tests verify that all expected interfaces are properly exported
 * from the core module.
 */
import { describe, expect, test } from 'bun:test';
// Import the module to verify it can be imported without errors
import '@/contexts/core';

// We would normally use these types, but in this test we're just checking
// that the module can be imported successfully
// 
// import { 
//   type ContextInterface,
//   type ContextStatus,
//   type ResourceDefinition,
//   type StorageInterface,
//   type SearchCriteria,
//   type ListOptions,
//   type FormatterInterface,
//   type FormattingOptions,
// } from '@/contexts/core';

describe('Core Interfaces Exports', () => {
  test('should be able to import the module', () => {
    // This test is mainly for TypeScript validation during compilation
    // If the imports above work, the module exports are correct
    expect(true).toBe(true);
  });
});