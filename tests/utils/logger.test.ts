/**
 * Tests for Logger utility
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { Logger } from '@/utils/logger';
import type { LoggerConfig } from '@/utils/logger';

describe('Logger', () => {
  // Reset the Logger singleton instance before each test
  beforeEach(() => {
    Logger.resetInstance();
  });

  test('should implement the Component Interface Standardization pattern correctly', () => {
    // Define a custom config for testing
    const customConfig: LoggerConfig = {
      consoleLevel: 'debug',
      fileLevel: 'silly',
      errorLogPath: 'custom-error.log',
      combinedLogPath: 'custom-combined.log',
      debugLogPath: 'custom-debug.log',
    };
    
    // Execute multiple operations that exercise the component's behavior
    const patterns = (() => {
      // Get first instance and compare with second instance
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      
      // Reset and get new instance
      Logger.resetInstance();
      const logger3 = Logger.getInstance();
      
      // Create fresh instances
      const fresh1 = Logger.createFresh();
      const fresh2 = Logger.createFresh();
      
      // Create with custom config
      const customLogger = Logger.createFresh(customConfig);
      
      return {
        // Singleton pattern verification
        singletonImplemented: logger1 === logger2,
        
        // Reset functionality
        resetCreatesNewInstance: logger3 !== logger1,
        
        // Fresh instance behavior
        freshInstancesAreDifferent: fresh1 !== fresh2,
        freshInstancesDifferFromSingleton: fresh1 !== logger3 && fresh2 !== logger3,
        
        // Custom configuration handling
        acceptsCustomConfig: customLogger instanceof Logger,
      };
    })();
    
    // Assert all pattern implementations at once
    expect(patterns).toMatchObject({
      singletonImplemented: true,
      resetCreatesNewInstance: true,
      freshInstancesAreDifferent: true,
      freshInstancesDifferFromSingleton: true,
      acceptsCustomConfig: true,
    });
  });

  test('should provide complete logging functionality', () => {
    const logger = Logger.getInstance();
    const childLogger = logger.child({ module: 'TestModule' });
    
    // Verify logger interface and behavior
    const loggerCapabilities = {
      // Method existence and types
      hasInfoMethod: typeof logger.info === 'function',
      hasWarnMethod: typeof logger.warn === 'function',
      hasErrorMethod: typeof logger.error === 'function',
      hasDebugMethod: typeof logger.debug === 'function',
      hasVerboseMethod: typeof logger.verbose === 'function',
      hasSillyMethod: typeof logger.silly === 'function',
      hasChildMethod: typeof logger.child === 'function',
      
      // Child logger behavior
      childLoggerIsInstance: childLogger instanceof Logger,
      childLoggerIsDifferentInstance: childLogger !== logger,
    };
    
    // Assert all capabilities at once
    expect(loggerCapabilities).toMatchObject({
      hasInfoMethod: true,
      hasWarnMethod: true,
      hasErrorMethod: true,
      hasDebugMethod: true,
      hasVerboseMethod: true,
      hasSillyMethod: true,
      hasChildMethod: true,
      childLoggerIsInstance: true,
      childLoggerIsDifferentInstance: true,
    });
  });
});