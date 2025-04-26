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
  
  test('getInstance returns singleton instance', () => {
    const instance1 = ConfigUtils.getInstance();
    const instance2 = ConfigUtils.getInstance();
    expect(instance1).toBe(instance2);
  });
  
  test('resetInstance clears the singleton', () => {
    const instance1 = ConfigUtils.getInstance();
    ConfigUtils.resetInstance();
    const instance2 = ConfigUtils.getInstance();
    expect(instance1).not.toBe(instance2);
  });
  
  test('createFresh creates new instance', () => {
    const instance1 = ConfigUtils.getInstance();
    const instance2 = ConfigUtils.createFresh();
    expect(instance1).not.toBe(instance2);
  });
  
  test('getEnv retrieves environment variable', () => {
    process.env['TEST_VAR'] = 'test-value';
    
    // Test the class method
    const utils = ConfigUtils.getInstance();
    expect(utils.getEnv('TEST_VAR')).toBe('test-value');
    
    // Test the exported function
    expect(getEnv('TEST_VAR')).toBe('test-value');
  });
  
  test('getEnv returns default value when variable not set', () => {
    delete process.env['TEST_VAR'];
    
    // Test the class method
    const utils = ConfigUtils.getInstance();
    expect(utils.getEnv('TEST_VAR', 'default')).toBe('default');
    
    // Test the exported function
    expect(getEnv('TEST_VAR', 'default')).toBe('default');
  });
  
  test('getEnvAsInt parses integer values', () => {
    process.env['TEST_INT'] = '42';
    
    // Test the class method
    const utils = ConfigUtils.getInstance();
    expect(utils.getEnvAsInt('TEST_INT', 0)).toBe(42);
    
    // Test the exported function
    expect(getEnvAsInt('TEST_INT', 0)).toBe(42);
  });
  
  test('getEnvAsInt returns default for invalid values', () => {
    process.env['TEST_INT'] = 'not-a-number';
    
    // Test the class method
    const utils = ConfigUtils.getInstance();
    expect(utils.getEnvAsInt('TEST_INT', 0)).toBe(0);
    
    // Test the exported function
    expect(getEnvAsInt('TEST_INT', 0)).toBe(0);
  });
  
  test('getEnvAsFloat parses float values', () => {
    process.env['TEST_FLOAT'] = '3.14';
    
    // Test the class method
    const utils = ConfigUtils.getInstance();
    expect(utils.getEnvAsFloat('TEST_FLOAT', 0)).toBe(3.14);
    
    // Test the exported function
    expect(getEnvAsFloat('TEST_FLOAT', 0)).toBe(3.14);
  });
  
  test('getEnvAsBool parses boolean values', () => {
    process.env['TEST_BOOL_TRUE'] = 'true';
    process.env['TEST_BOOL_YES'] = 'yes';
    process.env['TEST_BOOL_1'] = '1';
    process.env['TEST_BOOL_FALSE'] = 'false';
    
    // Test the class method
    const utils = ConfigUtils.getInstance();
    expect(utils.getEnvAsBool('TEST_BOOL_TRUE', false)).toBe(true);
    expect(utils.getEnvAsBool('TEST_BOOL_YES', false)).toBe(true);
    expect(utils.getEnvAsBool('TEST_BOOL_1', false)).toBe(true);
    expect(utils.getEnvAsBool('TEST_BOOL_FALSE', true)).toBe(false);
    
    // Test the exported function
    expect(getEnvAsBool('TEST_BOOL_TRUE', false)).toBe(true);
    expect(getEnvAsBool('TEST_BOOL_YES', false)).toBe(true);
    expect(getEnvAsBool('TEST_BOOL_1', false)).toBe(true);
    expect(getEnvAsBool('TEST_BOOL_FALSE', true)).toBe(false);
  });
});