/**
 * Logging utility using Winston for consistent logging across the application
 */
import winston from 'winston';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
};

// Create a custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Create a custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
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
  level: process.env.LOG_LEVEL || 'debug', // Setting default to debug to capture all logs
  format: winston.format.json(),
  transports: [
    // Console transport (excluding debug messages)
    new winston.transports.Console({
      format: winston.format.combine(
        excludeDebug,
        consoleFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      format: fileFormat
    }),
    // File transport for combined logs
    new winston.transports.File({ 
      filename: 'combined.log',
      format: fileFormat
    }),
    // File transport specifically for debug logs
    new winston.transports.File({ 
      filename: 'debug.log',
      level: 'debug',
      format: fileFormat
    })
  ]
});

// Set log level based on environment
if (process.env.NODE_ENV === 'production') {
  logger.level = 'info';
} else {
  logger.level = 'debug';
}

// Export the logger instance
export default logger;