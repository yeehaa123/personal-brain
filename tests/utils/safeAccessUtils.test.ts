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

  // Test all array access cases in a single test with table-driven approach
  test('safeArrayAccess handles various scenarios correctly', () => {
    // Test case 1: Valid index
    const array1 = [1, 2, 3];
    expect(safeArrayAccess(array1, 1, 0)).toBe(2);
    
    // Test case 2: Out of bounds index
    const array2 = [1, 2, 3];
    expect(safeArrayAccess(array2, 5, 0)).toBe(0);
    
    // Test case 3: Undefined array
    expect(safeArrayAccess(undefined, 0, 'default')).toBe('default');
  });

  // Test all object access cases in a single test
  test('safeObjectAccess handles various scenarios correctly', () => {
    // Test case 1: Existing key
    const obj1 = { name: 'John', age: 30 };
    expect(safeObjectAccess(obj1, 'name', '')).toBe('John');
    
    // Test case 2: Missing key using type assertions for test
    const obj2 = { name: 'John' } as { name: string; age?: number };
    expect(safeObjectAccess(obj2, 'age', 0)).toBe(0);
    
    // Test case 3: Null object using Record<string, unknown> for type safety
    expect(safeObjectAccess(null as unknown as Record<string, unknown>, 'name', 'default')).toBe('default');
  });

  // Test all index access cases in a single test
  test('safeIndexAccess handles various scenarios correctly', () => {
    // Test case 1: Existing index
    const obj1 = { 'user-1': 'John', 'user-2': 'Jane' };
    expect(safeIndexAccess(obj1, 'user-1', '')).toBe('John');
    
    // Test case 2: Missing index
    const obj2 = { 'user-1': 'John' };
    expect(safeIndexAccess(obj2, 'user-3', 'Not Found')).toBe('Not Found');
    
    // Test case 3: Undefined object
    const obj3 = undefined;
    expect(safeIndexAccess(obj3, 'user-1', 'default')).toBe('default');
  });

  // Test all nested access cases in a single test
  test('safeNestedAccess handles various scenarios correctly', () => {
    // Test case 1: Valid path
    const obj1 = { user: { profile: { name: 'John' } } };
    expect(safeNestedAccess(obj1, 'user.profile.name', '')).toBe('John');
    
    // Test case 2: Missing nested property
    const obj2 = { user: { profile: {} } };
    expect(safeNestedAccess(obj2, 'user.profile.name', 'Unknown')).toBe('Unknown');
    
    // Test case 3: Null intermediate path
    const obj3 = { user: null };
    expect(safeNestedAccess(obj3, 'user.profile.name', 'default')).toBe('default');
  });

  // Test assert defined cases
  test('assertDefined correctly validates defined values and throws for undefined', () => {
    // Valid cases
    expect(assertDefined('value')).toBe('value');
    expect(assertDefined(0)).toBe(0);
    expect(assertDefined(false)).toBe(false);
    
    // Invalid cases
    expect(() => assertDefined(undefined)).toThrow();
    expect(() => assertDefined(null)).toThrow();
  });

  // Test isDefined all cases
  test('isDefined correctly identifies defined and undefined values', () => {
    // True cases
    const definedValues = ['value', 0, false, {}];
    definedValues.forEach(value => {
      expect(isDefined(value)).toBe(true);
    });
    
    // False cases
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(null)).toBe(false);
    
    // Type narrowing
    const value: string | undefined = Math.random() > 0.5 ? 'value' : undefined;
    if (isDefined(value)) {
      expect(typeof value).toBe('string');
    } else {
      expect(value).toBeUndefined();
    }
  });
  
  // Test isNonEmptyString all cases
  test('isNonEmptyString correctly identifies valid and invalid strings', () => {
    // True cases
    const validStrings = ['value', ' value with spaces '];
    validStrings.forEach(str => {
      expect(isNonEmptyString(str)).toBe(true);
    });
    
    // False cases - empty strings
    const emptyStrings = ['', '   '];
    emptyStrings.forEach(str => {
      expect(isNonEmptyString(str)).toBe(false);
    });
    
    // False cases - non-strings
    const nonStrings = [123, null, undefined, {}, []];
    nonStrings.forEach(val => {
      expect(isNonEmptyString(val as unknown as string)).toBe(false);
    });
  });
});