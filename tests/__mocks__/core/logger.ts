/**
 * Mock Logger Implementation
 * 
 * This file provides a standardized mock implementation of the logger
 * for use in tests across the codebase.
 */

import type { Logger } from '@/utils/logger';

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
    // Store config - default to silent true for tests
    this.config = {
      // Force silent mode by default in tests
      silent: config.silent !== undefined ? config.silent : true,
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
  public static getInstance(config?: MockLoggerConfig): Logger {
    if (!MockLogger.instance) {
      // Ensure silent mode is enabled by default for tests
      const silentConfig = {
        ...config,
        silent: config?.silent !== undefined ? config.silent : true,
      };
      MockLogger.instance = new MockLogger(silentConfig);
    } else if (config && Object.keys(config).length > 0) {
      // Update existing instance config
      MockLogger.instance.updateConfig(config);
    }
    return MockLogger.instance as unknown as Logger;
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
  public static createFresh(config?: MockLoggerConfig): Logger {
    // Ensure silent mode is enabled by default for tests
    const silentConfig = {
      ...config,
      silent: config?.silent !== undefined ? config.silent : true,
    };
    return new MockLogger(silentConfig) as unknown as Logger;
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
   * 
   * Always store messages for testing purposes even when in silent mode,
   * but don't output to console when silent is true
   */
  info(message: string, ..._args: unknown[]): void {
    // Always store the message for testing assertions
    this.messages.info.push(message);
    
    // Only log to console if not in silent mode
    if (!this.config.silent) {
      console.info(`[info]: ${message}`);
    }
  }

  debug(message: string, ..._args: unknown[]): void {
    // Always store the message for testing assertions
    this.messages.debug.push(message);
    
    // Only log to console if not in silent mode
    if (!this.config.silent) {
      console.debug(`[debug]: ${message}`);
    }
  }

  warn(message: string, ..._args: unknown[]): void {
    // Always store the message for testing assertions
    this.messages.warn.push(message);
    
    // Only log to console if not in silent mode
    if (!this.config.silent) {
      console.warn(`[warn]: ${message}`);
    }
  }

  error(message: string, ..._args: unknown[]): void {
    // Always store the message for testing assertions
    this.messages.error.push(message);
    
    // Only log to console if not in silent mode
    if (!this.config.silent) {
      console.error(`[error]: ${message}`);
    }
  }

  verbose(message: string, ..._args: unknown[]): void {
    // Always store the message for testing assertions
    this.messages.verbose.push(message);
    
    // Only log to console if not in silent mode
    if (!this.config.silent) {
      console.log(`[verbose]: ${message}`);
    }
  }

  silly(message: string, ..._args: unknown[]): void {
    // Always store the message for testing assertions
    this.messages.silly.push(message);
    
    // Only log to console if not in silent mode
    if (!this.config.silent) {
      console.log(`[silly]: ${message}`);
    }
  }

  /**
   * Support for child loggers
   */
  child(_options: Record<string, unknown>): Logger {
    return this as unknown as Logger;
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
export function createMockLogger(config?: MockLoggerConfig): Logger {
  return MockLogger.createFresh(config);
}
