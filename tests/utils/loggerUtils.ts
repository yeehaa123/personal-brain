/**
 * Logger utilities for tests
 */

// Logger interface
interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Mock logger functions
export function mockLogger(logger: Logger): Record<string, unknown> {
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

// Restore logger functions
export function restoreLogger(logger: Logger, original: Record<string, unknown>): void {
  logger.info = original['info'] as typeof logger.info;
  logger.debug = original['debug'] as typeof logger.debug;
  logger.warn = original['warn'] as typeof logger.warn;
  logger.error = original['error'] as typeof logger.error;
}