/**
 * Mock Logger Implementation
 * 
 * This file provides a standardized mock implementation of the logger
 * for use in tests across the codebase.
 */

// Logger interface
interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  child?: (options: Record<string, unknown>) => Logger;
}

/**
 * Mock Logger class with singleton pattern
 */
export class MockLogger implements Logger {
  static instance: MockLogger | null = null;
  
  // Tracking logged messages for assertions
  messages: {
    info: string[];
    debug: string[];
    warn: string[];
    error: string[];
  };
  
  constructor() {
    // Initialize empty message tracking
    this.messages = {
      info: [],
      debug: [],
      warn: [],
      error: [],
    };
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockLogger {
    if (!MockLogger.instance) {
      MockLogger.instance = new MockLogger();
    }
    return MockLogger.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockLogger.instance = null;
  }
  
  /**
   * Create a fresh instance for isolated testing
   */
  public static createFresh(): MockLogger {
    return new MockLogger();
  }
  
  /**
   * Mock logger methods
   */
  info(message: string, ..._args: unknown[]): void {
    this.messages.info.push(message);
  }
  
  debug(message: string, ..._args: unknown[]): void {
    this.messages.debug.push(message);
  }
  
  warn(message: string, ..._args: unknown[]): void {
    this.messages.warn.push(message);
  }
  
  error(message: string, ..._args: unknown[]): void {
    this.messages.error.push(message);
  }
  
  /**
   * Support for child loggers
   */
  child(_options: Record<string, unknown>): Logger {
    return this;
  }
  
  /**
   * Clear tracked messages
   */
  clear(): void {
    this.messages.info = [];
    this.messages.debug = [];
    this.messages.warn = [];
    this.messages.error = [];
  }
}

/**
 * Create a mock logger instance
 */
export function createMockLogger(): MockLogger {
  return MockLogger.createFresh();
}

/**
 * Setup global mock for logger
 */
export function setupLoggerMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  // Create a default mock logger
  const mockLogger = createMockLogger();
  
  // Mock the logger module
  mockFn.module('@/utils/logger', () => ({
    default: mockLogger,
    createLogger: () => mockLogger,
  }));
}

/**
 * Temporarily silence an existing logger instance
 * @returns Original logger methods for restoration
 */
export function silenceLogger(logger: Logger): Record<string, unknown> {
  const original = {
    info: logger.info,
    debug: logger.debug,
    warn: logger.warn,
    error: logger.error,
  };
  
  logger.info = () => {};
  logger.debug = () => {};
  logger.warn = () => {};
  logger.error = () => {};
  
  return original;
}

/**
 * Restore original logger methods
 */
export function restoreLogger(logger: Logger, original: Record<string, unknown>): void {
  logger.info = original['info'] as typeof logger.info;
  logger.debug = original['debug'] as typeof logger.debug;
  logger.warn = original['warn'] as typeof logger.warn;
  logger.error = original['error'] as typeof logger.error;
}