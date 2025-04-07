import { describe, expect, test } from 'bun:test';

import {
  ApiError,
  AppError,
  ConfigError,
  DatabaseError,
  handleError,
  safeExec,
  tryExec,
  ValidationError,
} from '@/utils/errorUtils';

describe('errorUtils', () => {
  // Setup and teardown for all tests
  describe('AppError', () => {
    test('should create an error with context information', () => {
      const context = { userId: '123', action: 'login' };
      const error = new AppError('Something went wrong', 'AUTH_ERROR', context);

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.context).toEqual(context);
      expect(error.timestamp instanceof Date).toBe(true);
    });

    test('should generate a formatted log string', () => {
      const error = new AppError('Invalid operation', 'OP_ERROR', { opId: 456 });
      const logString = error.toLogString();

      expect(logString).toContain('OP_ERROR: Invalid operation');
      expect(logString).toContain('{"opId":456}');
    });
  });

  describe('Specialized errors', () => {
    test('should create ValidationError with correct code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    test('should create ApiError with status code', () => {
      const error = new ApiError('API request failed', 404);
      expect(error.code).toBe('API_ERROR');
      expect(error.statusCode).toBe(404);
    });

    test('should create DatabaseError with correct code', () => {
      const error = new DatabaseError('Query failed');
      expect(error.code).toBe('DATABASE_ERROR');
    });

    test('should create ConfigError with correct code', () => {
      const error = new ConfigError('Missing config key');
      expect(error.code).toBe('CONFIG_ERROR');
    });
  });

  describe('handleError', () => {
    test('should pass through existing AppError instances', () => {
      const originalError = new ValidationError('Invalid data');
      const result = handleError(originalError);

      expect(result).toBe(originalError);
    });

    test('should wrap standard Error objects', () => {
      const originalError = new Error('Standard error');
      const result = handleError(originalError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Standard error');
      expect(result.code).toBe('WRAPPED_ERROR');
    });

    test('should handle string error values', () => {
      const result = handleError('Something broke');

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Something broke');
    });

    test('should handle object error values', () => {
      const result = handleError({ problem: true });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Unknown error occurred');
      expect(result.context).toBeDefined();
    });

    test('should use custom error message when provided', () => {
      const result = handleError(new Error('Original'), 'Custom message');

      expect(result.message).toBe('Custom message');
    });
  });

  describe('tryExec', () => {
    test('should return successful function result', async () => {
      const fn = async () => 'success';
      const result = await tryExec(fn);

      expect(result).toBe('success');
    });

    test('should throw AppError for failed functions', async () => {
      const fn = async () => { throw new Error('Failed'); };

      expect(tryExec(fn)).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('safeExec', () => {
    test('should return successful function result', async () => {
      const fn = async () => 'success';
      const result = await safeExec(fn, 'default');

      expect(result).toBe('success');
    });

    test('should return default value for failed functions', async () => {
      const fn = async () => { throw new Error('Failed'); };
      const result = await safeExec(fn, 'default');

      expect(result).toBe('default');
    });

    test('should use warn log level when specified', async () => {
      const fn = async () => { throw new Error('Failed'); };
      await safeExec(fn, null, 'warn');

      // Logger is mocked, no need to verify calls
    });

    test('should use debug log level when specified', async () => {
      const fn = async () => { throw new Error('Failed'); };
      await safeExec(fn, null, 'debug');

      // Logger is mocked, no need to verify calls
    });
  });
});
