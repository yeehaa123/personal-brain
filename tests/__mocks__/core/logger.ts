/**
 * Mock Logger Implementation
 * 
 * This file provides a standardized mock implementation of the logger
 * for use in tests across the codebase.
 */

// Import the real Logger type for proper interface matching
import type { Logger as RealLogger } from '@/utils/logger';

/**
 * Configuration options for MockLogger to match real Logger
 */
interface MockLoggerConfig {
  silent?: boolean;
  [key: string]: unknown;
}

/**
 * Mock Logger class with singleton pattern
 */
export class MockLogger {
  static instance: MockLogger | null = null;
  
  // Configuration options
  private config: MockLoggerConfig;
  
  // We don't need winstonLogger as we're using type assertions in our Registry implementation
  
  // Tracking logged messages for assertions
  messages: {
    info: string[];
    debug: string[];
    warn: string[];
    error: string[];
    verbose: string[];
    silly: string[];
  };
  
  constructor(config: MockLoggerConfig = {}) {
    // Store config
    this.config = {
      silent: config.silent || false,
      ...config,
    };
    
    // Initialize empty message tracking
    this.messages = {
      info: [],
      debug: [],
      warn: [],
      error: [],
      verbose: [],
      silly: [],
    };
  }
  
  /**
   * Get singleton instance
   * @param config Configuration options
   */
  public static getInstance(config?: MockLoggerConfig): MockLogger {
    if (!MockLogger.instance) {
      MockLogger.instance = new MockLogger(config);
    } else if (config && Object.keys(config).length > 0) {
      // Update existing instance config
      MockLogger.instance.updateConfig(config);
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
   * @param config Configuration options
   */
  public static createFresh(config?: MockLoggerConfig): MockLogger {
    return new MockLogger(config);
  }
  
  /**
   * Update the configuration
   * @param config New configuration options
   */
  private updateConfig(config: MockLoggerConfig): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
  
  /**
   * Mock logger methods
   */
  info(message: string, ..._args: unknown[]): void {
    if (!this.config.silent) {
      this.messages.info.push(message);
    }
  }
  
  debug(message: string, ..._args: unknown[]): void {
    if (!this.config.silent) {
      this.messages.debug.push(message);
    }
  }
  
  warn(message: string, ..._args: unknown[]): void {
    if (!this.config.silent) {
      this.messages.warn.push(message);
    }
  }
  
  error(message: string, ..._args: unknown[]): void {
    if (!this.config.silent) {
      this.messages.error.push(message);
    }
  }
  
  verbose(message: string, ..._args: unknown[]): void {
    if (!this.config.silent) {
      this.messages.verbose.push(message);
    }
  }
  
  silly(message: string, ..._args: unknown[]): void {
    if (!this.config.silent) {
      this.messages.silly.push(message);
    }
  }
  
  /**
   * Support for child loggers
   */
  child(_options: Record<string, unknown>): MockLogger {
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
    this.messages.verbose = [];
    this.messages.silly = [];
  }
}

/**
 * Create a mock logger instance
 * @param config Logger configuration
 */
export function createMockLogger(config?: MockLoggerConfig): MockLogger {
  return MockLogger.createFresh(config);
}

/**
 * Setup global mock for logger
 */
export function setupLoggerMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  // Create a default mock logger that's silent in test mode
  const mockLogger = createMockLogger({ silent: process.env.NODE_ENV === 'test' });
  
  // Mock the logger module for both implementations:
  // 1. Old logger (default export)
  // 2. New Logger class (named export)
  mockFn.module('@/utils/logger', () => ({
    default: mockLogger,
    createLogger: () => mockLogger,
    Logger: {
      getInstance: (config?: MockLoggerConfig) => MockLogger.getInstance(config),
      resetInstance: () => MockLogger.resetInstance(),
      createFresh: (config?: MockLoggerConfig) => MockLogger.createFresh(config),
    },
  }));
}

/**
 * Temporarily silence an existing logger instance
 * @returns Original logger methods for restoration
 */
export function silenceLogger(logger: RealLogger): Record<string, unknown> {
  const original = {
    info: logger.info,
    debug: logger.debug,
    warn: logger.warn,
    error: logger.error,
    verbose: logger.verbose,
    silly: logger.silly,
  };
  
  logger.info = () => {};
  logger.debug = () => {};
  logger.warn = () => {};
  logger.error = () => {};
  logger.verbose = () => {};
  logger.silly = () => {};
  
  return original;
}

/**
 * Restore original logger methods
 */
export function restoreLogger(logger: RealLogger, original: Record<string, unknown>): void {
  logger.info = original['info'] as typeof logger.info;
  logger.debug = original['debug'] as typeof logger.debug;
  logger.warn = original['warn'] as typeof logger.warn;
  logger.error = original['error'] as typeof logger.error;
  logger.verbose = original['verbose'] as typeof logger.verbose;
  logger.silly = original['silly'] as typeof logger.silly;
}