/**
 * Tests for the contexts index exports
 * 
 * These tests verify that all expected interfaces are properly exported
 * from the contexts module after moving them from the core submodule.
 */
import { describe, expect, test } from 'bun:test';
// Import the base interfaces directly to verify they can be imported
import { BaseContext } from '@/contexts/baseContext';

// Also verify we can import them via the barrel file
import { 
  BaseContext as BaseContextBarrel,
} from '@/contexts';

describe('Context Interfaces Exports', () => {
  test('should be able to import the interfaces directly', () => {
    // If the imports succeed, the test passes
    expect(BaseContext).toBeDefined();
    expect(typeof BaseContext).toBe('function');
  });
  
  test('should be able to import via barrel file', () => {
    // Verify barrel imports work too
    expect(BaseContextBarrel).toBe(BaseContext);
  });
});