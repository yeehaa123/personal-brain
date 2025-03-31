/**
 * Utility functions for safe access to arrays and objects with proper type safety
 * 
 * These utilities help prevent TypeScript errors when using the noUncheckedIndexedAccess flag
 * and provide a safer way to access array elements and object properties.
 * 
 * USAGE GUIDANCE:
 * - Use these utilities when accessing array elements by index: safeArrayAccess(array, index, defaultValue)
 * - Use for object property access with dynamic keys: safeIndexAccess(obj, key, defaultValue)
 * - Use for nested property access: safeNestedAccess(obj, 'path.to.property', defaultValue)
 * - Use type narrowing with isDefined() to safely work with possibly undefined values
 * 
 * These utilities will become even more important when the noUncheckedIndexedAccess flag is enabled
 * in tsconfig.json, which is planned for a future update.
 */
import logger from '@/utils/logger';

/**
 * Safely get an element from an array, returning a default value if index is out of bounds
 * @param array - The array to access
 * @param index - The index to access
 * @param defaultValue - The default value to return if index is out of bounds
 * @returns The array element or the default value
 */
export function safeArrayAccess<T>(
  array: T[] | undefined | null, 
  index: number, 
  defaultValue: T,
): T {
  if (!array || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
}

/**
 * Safely get a property from an object, returning a default value if property doesn't exist
 * @param obj - The object to access
 * @param key - The key to access
 * @param defaultValue - The default value to return if key doesn't exist
 * @returns The property value or the default value
 */
export function safeObjectAccess<T, K extends keyof T>(
  obj: T | undefined | null,
  key: K,
  defaultValue: T[K],
): T[K] {
  if (!obj) {
    return defaultValue;
  }
  const value = (obj as T)[key];
  return (value === undefined || value === null) ? defaultValue : value;
}

/**
 * Safely get a property from an object with index signature, returning a default value if property doesn't exist
 * @param obj - The object to access
 * @param key - The key to access
 * @param defaultValue - The default value to return if key doesn't exist
 * @returns The property value or the default value
 */
export function safeIndexAccess<T>(
  obj: Record<string, T> | undefined | null,
  key: string,
  defaultValue: T,
): T {
  if (!obj) {
    return defaultValue;
  }
  return obj[key] ?? defaultValue;
}

/**
 * Safely get a nested property from an object, returning a default value if any part of the path doesn't exist
 * @param obj - The object to access
 * @param path - The path to access, e.g. "user.profile.name"
 * @param defaultValue - The default value to return if path doesn't exist
 * @returns The property value or the default value
 */
export function safeNestedAccess<T>(
  obj: Record<string, unknown> | undefined | null,
  path: string,
  defaultValue: T,
): T {
  if (!obj) {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return (current === undefined || current === null) ? defaultValue : current as T;
}

/**
 * Type assertion function to ensure a value is defined (not undefined or null)
 * Throws an error if the value is undefined or null
 * 
 * @param value - The value to check
 * @param errorMessage - Optional error message
 * @returns The value, guaranteed to be non-null
 */
export function assertDefined<T>(
  value: T | undefined | null, 
  errorMessage = 'Value is undefined or null',
): T {
  if (value === undefined || value === null) {
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * Function to check if a value exists (not undefined or null)
 * 
 * @param value - The value to check
 * @returns True if the value is defined, false otherwise
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard for checking if a value is a non-empty string
 * 
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}