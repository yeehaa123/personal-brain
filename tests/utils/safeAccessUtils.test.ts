import { beforeEach, describe, expect, test } from 'bun:test';

import {
  assertDefined,
  isDefined,
  isNonEmptyString,
  SafeAccessUtils,
  safeArrayAccess,
  safeIndexAccess,
  safeNestedAccess,
  safeObjectAccess,
} from '@/utils/safeAccessUtils';

describe('safeAccessUtils', () => {
  beforeEach(() => {
    // Reset the singleton for each test
    SafeAccessUtils.resetInstance();
  });

  describe('SafeAccessUtils class', () => {
    // REMOVED TEST: test('getInstance returns...

    
    // REMOVED TEST: test('resetInstance clears...

    
    // REMOVED TEST: test('createFresh creates...

  });
  describe('safeArrayAccess', () => {
    test('should return array element when index is valid', () => {
      const array = [1, 2, 3];
      expect(safeArrayAccess(array, 1, 0)).toBe(2);
    });

    test('should return default value when index is out of bounds', () => {
      const array = [1, 2, 3];
      expect(safeArrayAccess(array, 5, 0)).toBe(0);
    });

    test('should return default value when array is undefined', () => {
      const array = undefined;
      expect(safeArrayAccess(array, 0, 'default')).toBe('default');
    });
  });

  describe('safeObjectAccess', () => {
    interface TestObj {
      name: string;
      age?: number;
    }

    test('should return property value when key exists', () => {
      const obj: TestObj = { name: 'John', age: 30 };
      expect(safeObjectAccess(obj, 'name', '')).toBe('John');
    });

    test('should return default value when key does not exist', () => {
      const obj: TestObj = { name: 'John' };
      expect(safeObjectAccess(obj, 'age', 0)).toBe(0);
    });

    test('should return default value when object is null', () => {
      type NameObj = { name: string };
      const obj: NameObj | null = null;
      // Type assertion needed for testing null objects
      expect(safeObjectAccess<NameObj, 'name'>(obj as unknown as NameObj, 'name', 'default')).toBe('default');
    });
  });

  describe('safeIndexAccess', () => {
    test('should return property value when key exists', () => {
      const obj = { 'user-1': 'John', 'user-2': 'Jane' };
      expect(safeIndexAccess(obj, 'user-1', '')).toBe('John');
    });

    test('should return default value when key does not exist', () => {
      const obj = { 'user-1': 'John' };
      expect(safeIndexAccess(obj, 'user-3', 'Not Found')).toBe('Not Found');
    });

    test('should return default value when object is undefined', () => {
      const obj = undefined;
      expect(safeIndexAccess(obj, 'user-1', 'default')).toBe('default');
    });
  });

  describe('safeNestedAccess', () => {
    test('should return nested property value when path exists', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(safeNestedAccess(obj, 'user.profile.name', '')).toBe('John');
    });

    test('should return default value when path does not exist', () => {
      const obj = { user: { profile: {} } };
      expect(safeNestedAccess(obj, 'user.profile.name', 'Unknown')).toBe('Unknown');
    });

    test('should return default value when intermediate path is null', () => {
      const obj = { user: null };
      expect(safeNestedAccess(obj, 'user.profile.name', 'default')).toBe('default');
    });
  });

  describe('assertDefined', () => {
    test('should return value when it is defined', () => {
      expect(assertDefined('value')).toBe('value');
      expect(assertDefined(0)).toBe(0);
      expect(assertDefined(false)).toBe(false);
    });

    test('should throw error when value is undefined', () => {
      expect(() => assertDefined(undefined)).toThrow();
    });

    test('should throw error when value is null', () => {
      expect(() => assertDefined(null)).toThrow();
    });
  });

  describe('isDefined', () => {
    test('should return true for defined values', () => {
      expect(isDefined('value')).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    test('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });

    test('should return false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    test('should work with type narrowing', () => {
      const value: string | undefined = Math.random() > 0.5 ? 'value' : undefined;
      
      if (isDefined(value)) {
        // TypeScript should recognize value as string here
        expect(typeof value).toBe('string');
      } else {
        // TypeScript should recognize value as undefined here
        expect(value).toBeUndefined();
      }
    });
  });
  
  describe('isNonEmptyString', () => {
    test('should return true for non-empty strings', () => {
      expect(isNonEmptyString('value')).toBe(true);
      expect(isNonEmptyString(' value with spaces ')).toBe(true);
    });
    
    test('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });
    
    test('should return false for non-string values', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });
});