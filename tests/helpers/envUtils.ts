/**
 * Environment utilities for testing
 * Provides a consistent way to set and reset environment variables for tests
 */

/**
 * Set an environment variable for testing
 * @param key - The environment variable key to set
 * @param value - The value to set
 */
export function setTestEnv(key: string, value: string): void {
  process.env[key] = value;
}

/**
 * Set multiple environment variables at once
 * @param values - Object mapping environment variables to their values
 */
export function setTestEnvs(values: Record<string, string>): void {
  Object.entries(values).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

/**
 * Clear a single environment variable
 * @param key - The environment variable key to clear
 */
export function clearTestEnv(key: string): void {
  delete process.env[key];
}

/**
 * Clear multiple environment variables at once
 * @param keys - Array of environment variable keys to clear
 */
export function clearTestEnvs(keys: string[]): void {
  keys.forEach(key => {
    delete process.env[key];
  });
}

/**
 * Set up standard mock environment variables for testing
 */
export function setupStandardTestEnv(): void {
  setTestEnvs({
    NODE_ENV: 'test',
    ANTHROPIC_API_KEY: 'mock-anthropic-key',
    OPENAI_API_KEY: 'mock-openai-key',
    NEWSAPI_KEY: 'mock-newsapi-key',
  });
}

/**
 * Clear standard mock environment variables
 */
export function clearStandardTestEnv(): void {
  clearTestEnvs([
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'NEWSAPI_KEY',
  ]);
}

// Aliases for better semantics
export const setMockEnv = setupStandardTestEnv;
export const clearMockEnv = clearStandardTestEnv;