/**
 * JSON Converter
 * 
 * This converter handles conversion between structured message formats
 * and JSON string representations.
 */

import type { ProtocolMessage } from '../messageFormats';

/**
 * Converter for JSON message formats
 */
export class JsonConverter {
  /**
   * Convert a message object to a JSON string
   * 
   * @param message The message object to convert
   * @returns JSON string representation
   */
  static toJson<T extends ProtocolMessage>(message: T): string {
    return JSON.stringify(message);
  }
  
  /**
   * Parse a JSON string into a message object
   * 
   * @param json JSON string to parse
   * @returns Parsed message object
   */
  static fromJson<T extends ProtocolMessage>(json: string): T {
    const parsed = JSON.parse(json) as T;
    
    // Fix dates since JSON.parse doesn't automatically convert date strings
    if (parsed.timestamp && typeof parsed.timestamp === 'string') {
      parsed.timestamp = new Date(parsed.timestamp);
    }
    
    return parsed;
  }
  
  /**
   * Safely attempt to parse a string as JSON, returning null if invalid
   * 
   * @param input String to parse as JSON
   * @returns Parsed object or null if invalid
   */
  static safeParse<T>(input: string): T | null {
    try {
      return JSON.parse(input) as T;
    } catch (_error) {
      return null;
    }
  }
}
