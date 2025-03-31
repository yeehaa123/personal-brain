/**
 * Type guard functions for domain-specific types
 * 
 * These functions help TypeScript narrow down types during runtime operations
 * and provide more type-safe code when working with potentially unknown objects.
 */
import type { Note } from '@/models/note';

/**
 * Type guard for Note objects
 * 
 * @param obj - The object to check
 * @returns True if the object is a valid Note
 */
export function isNote(obj: unknown): obj is Note {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  // Check for required note properties
  const requiredProps = ['id', 'content', 'createdAt', 'updatedAt', 'title'];
  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      return false;
    }
  }
  
  // Cast to access properties
  const note = obj as Record<string, unknown>;
  
  // Check types of key properties
  return (
    typeof note['id'] === 'string' && 
    typeof note['content'] === 'string' && 
    note['createdAt'] instanceof Date &&
    note['updatedAt'] instanceof Date &&
    typeof note['title'] === 'string' &&
    (note['tags'] === null || Array.isArray(note['tags']))
  );
}

/**
 * Check if an array contains only Note objects
 * 
 * @param arr - The array to check
 * @returns True if the array only contains valid Note objects
 */
export function isNoteArray(arr: unknown): arr is Note[] {
  return Array.isArray(arr) && arr.every(isNote);
}

/**
 * Type guard for checking if an object has a specific property
 * 
 * @param obj - The object to check
 * @param prop - The property name to check for
 * @returns True if the object has the property
 */
export function hasProperty<K extends string>(
  obj: unknown, 
  prop: K,
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

/**
 * Type guard for checking if an object has a string property
 * 
 * @param obj - The object to check
 * @param prop - The property name to check
 * @returns True if the object has a string property with the given name
 */
export function hasStringProperty<K extends string>(
  obj: unknown,
  prop: K,
): obj is Record<K, string> {
  return hasProperty(obj, prop) && typeof obj[prop] === 'string';
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

/**
 * Type guard for checking if a value is a valid ISO date string
 * 
 * @param value - The value to check
 * @returns True if the value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Attempt to parse the date and check if it's valid
  try {
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.includes('T');
  } catch {
    return false;
  }
}