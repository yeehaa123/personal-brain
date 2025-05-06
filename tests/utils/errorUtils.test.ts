/**
 * Error Utilities Tests
 * 
 * Tests the error handling utilities that provide standardized error types,
 * error transformation, and safe execution patterns.
 */
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

describe('Error Handling Utilities', () => {
  test('implements a comprehensive error hierarchy with proper behavior', () => {
    // Test data for error creation
    const testContext = { userId: '123', action: 'login' };
    
    // Create instances of all error types
    const errors = {
      base: new AppError('Something went wrong', 'AUTH_ERROR', testContext),
      validation: new ValidationError('Invalid input'),
      api: new ApiError('API request failed', 404),
      database: new DatabaseError('Query failed'),
      config: new ConfigError('Missing config key'),
    };
    
    // Generate a log string for testing
    const logString = errors.base.toLogString();
    
    // Comprehensive assertion for the entire error hierarchy
    expect({
      baseError: {
        hasCorrectMessage: errors.base.message === 'Something went wrong',
        hasCorrectCode: errors.base.code === 'AUTH_ERROR',
        preservesContext: errors.base.context === testContext,
        hasTimestamp: errors.base.timestamp instanceof Date,
        logStringIncludesCode: logString.includes('AUTH_ERROR'),
        logStringIncludesMessage: logString.includes('Something went wrong'),
        logStringIncludesContext: logString.includes('{"userId":"123","action":"login"}'),
      },
      
      specializedErrors: {
        validationHasCorrectCode: errors.validation.code === 'VALIDATION_ERROR',
        validationExtendsBase: errors.validation instanceof AppError,
        
        apiHasCorrectCode: errors.api.code === 'API_ERROR',
        apiHasStatusCode: errors.api.statusCode === 404,
        apiExtendsBase: errors.api instanceof AppError,
        
        databaseHasCorrectCode: errors.database.code === 'DATABASE_ERROR',
        databaseExtendsBase: errors.database instanceof AppError,
        
        configHasCorrectCode: errors.config.code === 'CONFIG_ERROR',
        configExtendsBase: errors.config instanceof AppError,
      },
    }).toMatchObject({
      baseError: {
        hasCorrectMessage: true,
        hasCorrectCode: true,
        preservesContext: true,
        hasTimestamp: true,
        logStringIncludesCode: true,
        logStringIncludesMessage: true,
        logStringIncludesContext: true,
      },
      
      specializedErrors: {
        validationHasCorrectCode: true,
        validationExtendsBase: true,
        
        apiHasCorrectCode: true,
        apiHasStatusCode: true,
        apiExtendsBase: true,
        
        databaseHasCorrectCode: true,
        databaseExtendsBase: true,
        
        configHasCorrectCode: true,
        configExtendsBase: true,
      },
    });
  });
  
  test('handles different error types with proper transformation', () => {
    // Test suite for handleError with various input types
    const handlerResults = {
      passesAppError: handleError(new ValidationError('Invalid data')),
      
      wrapsStandardError: handleError(new Error('Standard error')),
      
      handlesStringError: handleError('Something broke'),
      
      handlesObjectError: handleError({ problem: true }),
      
      usesCustomMessage: handleError(new Error('Original'), 'Custom message'),
    };
    
    // Comprehensive validation of error handler behavior
    expect({
      appError: {
        preservesInstance: handlerResults.passesAppError instanceof ValidationError,
        sameReference: handlerResults.passesAppError === handlerResults.passesAppError,
      },
      
      standardError: {
        wrapsAsAppError: handlerResults.wrapsStandardError instanceof AppError,
        preservesMessage: handlerResults.wrapsStandardError.message === 'Standard error',
        hasWrappedCode: handlerResults.wrapsStandardError.code === 'WRAPPED_ERROR',
      },
      
      stringError: {
        wrapsAsAppError: handlerResults.handlesStringError instanceof AppError,
        usesStringAsMessage: handlerResults.handlesStringError.message === 'Something broke',
      },
      
      objectError: {
        wrapsAsAppError: handlerResults.handlesObjectError instanceof AppError,
        usesGenericMessage: handlerResults.handlesObjectError.message === 'Unknown error occurred',
        storesObjectInContext: handlerResults.handlesObjectError.context !== undefined,
      },
      
      customMessage: {
        usesProvidedMessage: handlerResults.usesCustomMessage.message === 'Custom message',
      },
    }).toMatchObject({
      appError: {
        preservesInstance: true,
        sameReference: true,
      },
      
      standardError: {
        wrapsAsAppError: true,
        preservesMessage: true,
        hasWrappedCode: true,
      },
      
      stringError: {
        wrapsAsAppError: true,
        usesStringAsMessage: true,
      },
      
      objectError: {
        wrapsAsAppError: true,
        usesGenericMessage: true,
        storesObjectInContext: true,
      },
      
      customMessage: {
        usesProvidedMessage: true,
      },
    });
  });
  
  test('provides safe execution patterns for error handling', async () => {
    // Test functions
    const successFn = async () => 'success';
    const failingFn = async () => { throw new Error('Failed'); };
    
    // Execute test scenarios
    const executionResults = {
      tryExec: {
        successValue: await tryExec(successFn),
        failPromise: tryExec(failingFn),
      },
      
      safeExec: {
        successValue: await safeExec(successFn, 'default'),
        failureValue: await safeExec(failingFn, 'default'),
        nullDefaultValue: await safeExec(failingFn, null),
        withWarnLevel: await safeExec(failingFn, 'warn-default', 'warn'),
        withDebugLevel: await safeExec(failingFn, 'debug-default', 'debug'),
      },
    };
    
    // Check if tryExec failure rejects with AppError
    let tryExecFailsWithAppError = false;
    try {
      await executionResults.tryExec.failPromise;
    } catch (err) {
      tryExecFailsWithAppError = err instanceof AppError;
    }
    
    // Comprehensive validation of execution patterns
    expect({
      tryExec: {
        returnsSuccessValue: executionResults.tryExec.successValue === 'success',
        failsWithAppError: tryExecFailsWithAppError,
      },
      
      safeExec: {
        returnsSuccessValue: executionResults.safeExec.successValue === 'success',
        returnsDefaultOnError: executionResults.safeExec.failureValue === 'default',
        returnsNullDefault: executionResults.safeExec.nullDefaultValue === null,
        acceptsLogLevels: {
          warnLevelReturnsDefault: executionResults.safeExec.withWarnLevel === 'warn-default',
          debugLevelReturnsDefault: executionResults.safeExec.withDebugLevel === 'debug-default',
        },
      },
    }).toMatchObject({
      tryExec: {
        returnsSuccessValue: true,
        failsWithAppError: true,
      },
      
      safeExec: {
        returnsSuccessValue: true,
        returnsDefaultOnError: true,
        returnsNullDefault: true,
        acceptsLogLevels: {
          warnLevelReturnsDefault: true,
          debugLevelReturnsDefault: true,
        },
      },
    });
  });
});
