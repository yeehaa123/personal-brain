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

  test('should implement the singleton pattern correctly', () => {
    // Get first instance
    const logger1 = Logger.getInstance();
    
    // Get second instance - should be the same object
    const logger2 = Logger.getInstance();
    
    // Verify singleton behavior
    expect(logger1).toBe(logger2);
    
    // Reset the instance
    Logger.resetInstance();
    
    // Get new instance - should be a different object
    const logger3 = Logger.getInstance();
    expect(logger3).not.toBe(logger1);
  });
  
  test('should create fresh instances with createFresh', () => {
    // Create multiple fresh instances
    const fresh1 = Logger.createFresh();
    const fresh2 = Logger.createFresh();
    
    // Verify they are different instances
    expect(fresh1).not.toBe(fresh2);
    
    // Verify they are different from the singleton
    const singleton = Logger.getInstance();
    expect(fresh1).not.toBe(singleton);
    expect(fresh2).not.toBe(singleton);
  });
  
  test('should initialize with custom config when provided', () => {
    // Define custom config
    const config: LoggerConfig = {
      consoleLevel: 'debug',
      fileLevel: 'silly',
      errorLogPath: 'custom-error.log',
      combinedLogPath: 'custom-combined.log',
      debugLogPath: 'custom-debug.log',
    };
    
    // Create logger with custom config
    const logger = Logger.createFresh(config);
    
    // Just verify logger was created
    expect(logger).toBeInstanceOf(Logger);
  });
  
  test('should expose logging methods', () => {
    const logger = Logger.getInstance();
    
    // Verify logger has expected methods (non-functional test)
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.verbose).toBe('function');
    expect(typeof logger.silly).toBe('function');
    expect(typeof logger.child).toBe('function');
  });
  
  test('should support child loggers', () => {
    const logger = Logger.getInstance();
    
    // Create a child logger
    const childLogger = logger.child({ module: 'TestModule' });
    
    // Child logger should be a new Logger instance
    expect(childLogger).toBeInstanceOf(Logger);
    expect(childLogger).not.toBe(logger);
  });
});