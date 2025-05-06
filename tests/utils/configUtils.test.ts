/**
 * Tests for ConfigUtils
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { 
  ConfigUtils, 
  getEnv, 
  getEnvAsBool, 
  getEnvAsFloat, 
  getEnvAsInt,
  isProductionEnvironment,
  isTestEnvironment,
} from '@/utils/configUtils';

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
  
  test('should provide comprehensive environment variable utilities', () => {
    // Setup a variety of test environment variables
    process.env['TEST_VAR'] = 'test-value';
    process.env['TEST_INT'] = '42';
    process.env['TEST_FLOAT'] = '3.14';
    process.env['TEST_BOOL_TRUE'] = 'true';
    process.env['TEST_BOOL_FALSE'] = 'false';
    process.env['INVALID_INT'] = 'not-a-number';
    process.env['NODE_ENV'] = 'test';
    
    // Get utils instance for testing instance methods
    const utils = ConfigUtils.getInstance();
    
    // Perform comprehensive validation across all utility features
    const configCapabilities = {
      // Component Interface Standardization pattern
      hasCorrectSingletonImplementation: (() => {
        const instance1 = ConfigUtils.getInstance();
        const instance2 = ConfigUtils.getInstance();
        ConfigUtils.resetInstance();
        const instance3 = ConfigUtils.getInstance();
        const freshInstance = ConfigUtils.createFresh();
        
        return {
          sameInstancesReturned: instance1 === instance2,
          resetCreatesNewInstance: instance3 !== instance1,
          freshInstanceIsDifferent: freshInstance !== instance3,
        };
      })(),
      
      // String environment variables
      stringEnvVars: {
        instanceMethodGetsValue: utils.getEnv('TEST_VAR') === 'test-value',
        staticMethodGetsValue: getEnv('TEST_VAR') === 'test-value',
        missingVarReturnsDefault: getEnv('MISSING_VAR', 'default') === 'default',
      },
      
      // Integer environment variables
      integerEnvVars: {
        instanceMethodParsesInt: utils.getEnvAsInt('TEST_INT', 0) === 42,
        staticMethodParsesInt: getEnvAsInt('TEST_INT', 0) === 42,
        invalidIntReturnsDefault: getEnvAsInt('INVALID_INT', 99) === 99,
      },
      
      // Float environment variables
      floatEnvVars: {
        instanceMethodParsesFloat: utils.getEnvAsFloat('TEST_FLOAT', 0) === 3.14,
        staticMethodParsesFloat: getEnvAsFloat('TEST_FLOAT', 0) === 3.14,
      },
      
      // Boolean environment variables
      booleanEnvVars: {
        instanceMethodParsesTrueValue: utils.getEnvAsBool('TEST_BOOL_TRUE', false) === true,
        instanceMethodParsesFalseValue: utils.getEnvAsBool('TEST_BOOL_FALSE', true) === false,
        staticMethodParsesTrueValue: getEnvAsBool('TEST_BOOL_TRUE', false) === true,
      },
      
      // Environment detection
      environmentDetection: {
        detectsTestEnvironment: isTestEnvironment() === true,
        detectsNonProductionEnvironment: isProductionEnvironment() === false,
      },
    };
    
    // Assert all capabilities at once
    expect(configCapabilities).toMatchObject({
      hasCorrectSingletonImplementation: {
        sameInstancesReturned: true,
        resetCreatesNewInstance: true,
        freshInstanceIsDifferent: true,
      },
      stringEnvVars: {
        instanceMethodGetsValue: true,
        staticMethodGetsValue: true,
        missingVarReturnsDefault: true,
      },
      integerEnvVars: {
        instanceMethodParsesInt: true,
        staticMethodParsesInt: true,
        invalidIntReturnsDefault: true,
      },
      floatEnvVars: {
        instanceMethodParsesFloat: true,
        staticMethodParsesFloat: true,
      },
      booleanEnvVars: {
        instanceMethodParsesTrueValue: true,
        instanceMethodParsesFalseValue: true,
        staticMethodParsesTrueValue: true,
      },
      environmentDetection: {
        detectsTestEnvironment: true,
        detectsNonProductionEnvironment: true,
      },
    });
  });
});