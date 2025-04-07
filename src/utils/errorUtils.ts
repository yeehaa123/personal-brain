/**
 * Utility functions for error handling and type-safe error processing
 */
import logger from './logger';

/**
 * Base application error class with enhanced context information
 */
export class AppError extends Error {
  /** Error code for categorization */
  public code: string;
  /** Timestamp when the error occurred */
  public timestamp: Date;
  /** Additional context information */
  public context?: Record<string, unknown>;

  /**
   * Create a new AppError
   * @param message - Error message
   * @param code - Error code
   * @param context - Additional context information
   */
  constructor(message: string, code = 'GENERAL_ERROR', context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a formatted representation of the error for logging
   */
  toLogString(): string {
    return `${this.code}: ${this.message}${this.context ? ` | Context: ${JSON.stringify(this.context)}` : ''}`;
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Error for API-related issues
 */
export class ApiError extends AppError {
  /** HTTP status code (for API errors) */
  public statusCode?: number;

  constructor(message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message, 'API_ERROR', context);
    this.statusCode = statusCode;
  }
}

/**
 * Error for database-related issues
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', context);
  }
}

/**
 * Error for configuration-related issues
 */
export class ConfigError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
  }
}

/**
 * Safely handle and log an error
 * @param error - The caught error
 * @param errorMessage - Optional custom error message
 * @returns AppError instance with normalized information
 */
export function handleError(error: unknown, errorMessage?: string): AppError {
  // If it's already an AppError, use it directly
  if (error instanceof AppError) {
    logger.error(error.toLogString());
    return error;
  }

  // For Error objects, convert to AppError
  if (error instanceof Error) {
    const appError = new AppError(
      errorMessage || error.message,
      'WRAPPED_ERROR',
      { originalError: error.name, stack: error.stack },
    );
    logger.error(appError.toLogString());
    return appError;
  }

  // For other values (string, number, object, etc.)
  const message = errorMessage || (typeof error === 'string' ? error : 'Unknown error occurred');
  const context = typeof error === 'object' && error ? { originalError: error } : undefined;

  const appError = new AppError(message, 'UNKNOWN_ERROR', context);
  logger.error(appError.toLogString());
  return appError;
}

/**
 * Attempt to execute a function with proper error handling
 * @param fn - Function to execute
 * @param errorMessage - Optional custom error message
 * @returns Result of the function or throws AppError
 */
export async function tryExec<T>(
  fn: () => Promise<T>,
  errorMessage?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw handleError(error, errorMessage);
  }
}

/**
 * Execute a function with proper error handling, returning result or default value
 * @param fn - Function to execute
 * @param defaultValue - Default value to return if function fails
 * @param logLevel - Log level for errors (default: 'error')
 * @returns Result of the function or default value
 */
export async function safeExec<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  logLevel: 'error' | 'warn' | 'debug' = 'error',
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = handleError(error);

    // Use the appropriate log level
    if (logLevel === 'warn') {
      logger.warn(appError.toLogString());
    } else if (logLevel === 'debug') {
      logger.debug(appError.toLogString());
    }

    return defaultValue;
  }
}
