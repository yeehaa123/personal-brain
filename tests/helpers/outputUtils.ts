/**
 * Output and mocking utilities for testing
 * 
 * This file provides utilities for capturing console output and mocking functions
 * for use in tests.
 */

/**
 * Helper to capture console output
 * @returns Object with getOutput and restore methods
 */
export function captureOutput() {
  let output = '';
  const originalWrite = process.stdout.write;
  
  process.stdout.write = function(str) {
    output += str.toString();
    return true;
  };
  
  return {
    getOutput: () => output,
    restore: () => {
      process.stdout.write = originalWrite;
    },
  };
}

/**
 * Mock a module function and track calls
 * @param module The module containing the function
 * @param functionName The name of the function to mock
 * @param mockImpl The mock implementation
 * @returns Original function for restoration
 */
export function mockFunction(
  module: Record<string, unknown>, 
  functionName: string, 
  mockImpl: (...args: unknown[]) => unknown,
): unknown {
  const originalFn = module[functionName];
  module[functionName] = mockImpl;
  return originalFn;
}