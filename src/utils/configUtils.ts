/**
 * Utility functions for configuration management with proper type safety
 */

/**
 * Safely access environment variables with proper typing
 * @param key - The environment variable key to access
 * @param defaultValue - Optional default value if environment variable is not set
 * @returns The environment variable value or the default value
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Parse an environment variable as an integer
 * @param key - The environment variable key to access
 * @param defaultValue - Default value to use if environment variable is not set or invalid
 * @returns The parsed integer value
 */
export function getEnvAsInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse an environment variable as a float
 * @param key - The environment variable key to access
 * @param defaultValue - Default value to use if environment variable is not set or invalid
 * @returns The parsed float value
 */
export function getEnvAsFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse an environment variable as a boolean
 * @param key - The environment variable key to access
 * @param defaultValue - Default value to use if environment variable is not set
 * @returns The parsed boolean value
 */
export function getEnvAsBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]?.toLowerCase();
  
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}