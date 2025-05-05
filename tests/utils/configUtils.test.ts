/**
 * Tests for ConfigUtils
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { ConfigUtils, getEnv, getEnvAsBool, getEnvAsFloat, getEnvAsInt } from '@/utils/configUtils';

describe('ConfigUtils', () => {
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Reset the environment for each test
    process.env = { ...originalEnv };
    // Reset the singleton
    ConfigUtils.resetInstance();
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('environment variable access methods work correctly', () => {
    // Setup test environment variables
    process.env['TEST_VAR'] = 'test-value';
    process.env['TEST_INT'] = '42';
    process.env['TEST_FLOAT'] = '3.14';
    process.env['TEST_BOOL_TRUE'] = 'true';
    process.env['TEST_BOOL_FALSE'] = 'false';
    
    const utils = ConfigUtils.getInstance();
    
    // Test string values
    expect(utils.getEnv('TEST_VAR')).toBe('test-value');
    expect(getEnv('TEST_VAR')).toBe('test-value');
    expect(getEnv('MISSING_VAR', 'default')).toBe('default');
    
    // Test integer values
    expect(utils.getEnvAsInt('TEST_INT', 0)).toBe(42);
    expect(getEnvAsInt('TEST_INT', 0)).toBe(42);
    
    // Test invalid integers
    process.env['INVALID_INT'] = 'not-a-number';
    expect(getEnvAsInt('INVALID_INT', 99)).toBe(99);
    
    // Test float values
    expect(utils.getEnvAsFloat('TEST_FLOAT', 0)).toBe(3.14);
    expect(getEnvAsFloat('TEST_FLOAT', 0)).toBe(3.14);
    
    // Test boolean values
    expect(utils.getEnvAsBool('TEST_BOOL_TRUE', false)).toBe(true);
    expect(utils.getEnvAsBool('TEST_BOOL_FALSE', true)).toBe(false);
    expect(getEnvAsBool('TEST_BOOL_TRUE', false)).toBe(true);
  });
});