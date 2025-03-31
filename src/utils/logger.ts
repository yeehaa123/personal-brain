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
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
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

// Export the logger instance
export default logger;