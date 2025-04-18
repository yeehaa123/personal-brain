/**
 * Logging utility using Winston for consistent logging across the application
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * 
 * TODO: This class will be updated as part of the CLI/logger separation initiative
 * See planning/cli-logger-separation.md for the detailed plan
 */
import winston from 'winston';

import { logConfig } from '@/config';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Logging level for console output */
  consoleLevel?: string;
  /** Logging level for file output */
  fileLevel?: string;
  /** Path to error log file */
  errorLogPath?: string;
  /** Path to combined log file */
  combinedLogPath?: string;
  /** Path to debug log file */
  debugLogPath?: string;
  /** Whether to disable all logging (useful for tests) */
  silent?: boolean;
}

/**
 * Define standard log levels
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5,
};

/**
 * Logger implementation using Winston
 */
export class Logger {
  /** The singleton instance */
  private static instance: Logger | null = null;
  
  /** The underlying Winston logger */
  private winstonLogger: winston.Logger;

  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   * 
   * @param config Optional configuration to override default settings
   */
  private constructor(config?: LoggerConfig) {
    // Check for silent mode first
    if (config?.silent) {
      // Create a silent logger with no transports
      this.winstonLogger = winston.createLogger({
        silent: true,
        transports: [],
      });
      return;
    }
    
    // Merge provided config with defaults
    const mergedConfig = {
      consoleLevel: config?.consoleLevel || logConfig.consoleLevel,
      fileLevel: config?.fileLevel || logConfig.fileLevel,
      errorLogPath: config?.errorLogPath || logConfig.errorLogPath,
      combinedLogPath: config?.combinedLogPath || logConfig.combinedLogPath,
      debugLogPath: config?.debugLogPath || logConfig.debugLogPath,
    };

    // Create a custom format for console output
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
        const contextStr = context ? `[${context}] ` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${contextStr}${message}${metaStr}`;
      }),
    );
    
    // Create a custom format for file output
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    );
    
    // Filter to exclude debug messages from console
    const excludeDebug = winston.format((info) => {
      if (info.level.includes('debug')) {
        return false;
      }
      return info;
    })();
    
    // Create the Winston logger
    this.winstonLogger = winston.createLogger({
      levels: logLevels,
      level: mergedConfig.fileLevel, // Default to debug to capture all logs in files
      format: winston.format.json(),
      transports: [
        // Console transport (excluding debug messages)
        new winston.transports.Console({
          format: winston.format.combine(
            excludeDebug,
            consoleFormat,
          ),
        }),
        // File transport for errors
        new winston.transports.File({
          filename: mergedConfig.errorLogPath,
          level: 'error',
          format: fileFormat,
        }),
        // File transport for combined logs
        new winston.transports.File({
          filename: mergedConfig.combinedLogPath,
          format: fileFormat,
        }),
        // File transport specifically for debug logs
        new winston.transports.File({
          filename: mergedConfig.debugLogPath,
          level: 'debug',
          format: fileFormat,
        }),
      ],
    });
    
    // Set console log level based on configuration
    this.winstonLogger.level = mergedConfig.consoleLevel;
  }

  /**
   * Get the singleton instance of Logger
   * 
   * @param config Optional configuration (only used when creating a new instance)
   * @returns The shared Logger instance
   */
  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    } else if (config) {
      // Silent mode - only log this at debug level instead of warning
      Logger.instance.debug('getInstance called with config but instance already exists. Config ignored.');
    }
    return Logger.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    // Cleanup not necessary for logger as Winston handles its own cleanup
    Logger.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param config Optional configuration
   * @returns A new Logger instance
   */
  public static createFresh(config?: LoggerConfig): Logger {
    return new Logger(config);
  }
  
  /**
   * Log a message at the 'info' level
   */
  public info(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.winstonLogger.info(message, args[0]);
    } else {
      this.winstonLogger.info(message, ...args);
    }
  }
  
  /**
   * Log a message at the 'warn' level
   */
  public warn(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.winstonLogger.warn(message, args[0]);
    } else {
      this.winstonLogger.warn(message, ...args);
    }
  }
  
  /**
   * Log a message at the 'error' level
   */
  public error(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.winstonLogger.error(message, args[0]);
    } else {
      this.winstonLogger.error(message, ...args);
    }
  }
  
  /**
   * Log a message at the 'debug' level
   */
  public debug(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.winstonLogger.debug(message, args[0]);
    } else {
      this.winstonLogger.debug(message, ...args);
    }
  }
  
  /**
   * Log a message at the 'verbose' level
   */
  public verbose(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.winstonLogger.verbose(message, args[0]);
    } else {
      this.winstonLogger.verbose(message, ...args);
    }
  }
  
  /**
   * Log a message at the 'silly' level
   */
  public silly(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object') {
      this.winstonLogger.silly(message, args[0]);
    } else {
      this.winstonLogger.silly(message, ...args);
    }
  }
  
  /**
   * Create a child logger with additional metadata
   */
  public child(options: Record<string, unknown>): Logger {
    const childLogger = Logger.createFresh();
    childLogger.winstonLogger = this.winstonLogger.child(options);
    return childLogger;
  }
}

// Create and export the default logger instance
export default Logger.getInstance();
