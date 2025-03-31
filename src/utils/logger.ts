/**
 * Logging utility using Winston for consistent logging across the application
 */
import winston from 'winston';
import { logConfig } from '@/config';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5,
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
const logger = winston.createLogger({
  levels: logLevels,
  level: logConfig.fileLevel, // Setting default to debug to capture all logs
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
      filename: logConfig.errorLogPath, 
      level: 'error',
      format: fileFormat,
    }),
    // File transport for combined logs
    new winston.transports.File({ 
      filename: logConfig.combinedLogPath,
      format: fileFormat,
    }),
    // File transport specifically for debug logs
    new winston.transports.File({ 
      filename: logConfig.debugLogPath,
      level: 'debug',
      format: fileFormat,
    }),
  ],
});

// Set log level based on configuration
logger.level = logConfig.consoleLevel;

// Helper functions for consistent logging patterns
interface LogContext {
  context?: string;
  [key: string]: unknown;
}

/**
 * Log an error with operation context and error details
 */
function logError(message: string, error: unknown, context?: string | LogContext) {
  const meta = typeof context === 'string' ? { context } : context || {};
  const errorObj = error instanceof Error 
    ? { message: error.message, stack: error.stack } 
    : { message: String(error) };
  
  logger.error(message, { ...meta, error: errorObj });
}

/**
 * Log a warning with operation context
 */
function logWarn(message: string, context?: string | LogContext) {
  const meta = typeof context === 'string' ? { context } : context || {};
  logger.warn(message, meta);
}

/**
 * Log info with operation context
 */
function logInfo(message: string, context?: string | LogContext) {
  const meta = typeof context === 'string' ? { context } : context || {};
  logger.info(message, meta);
}

/**
 * Log debug info with operation context
 */
function logDebug(message: string, context?: string | LogContext) {
  const meta = typeof context === 'string' ? { context } : context || {};
  logger.debug(message, meta);
}

/**
 * Log a message intended for the console output
 * Use this for user-facing messages instead of console.log
 */
function logOutput(message: string) {
  // This bypasses the structured logging for cleaner user output
  console.log(message);
}

/**
 * Standard error handler that logs and optionally throws
 */
function handleError(message: string, error: unknown, context?: string | LogContext, shouldThrow = true): never | void {
  logError(message, error, context);
  if (shouldThrow) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Export the logger instance and helper functions
export default logger;
export { logError, logWarn, logInfo, logDebug, logOutput, handleError };