/**
 * Tests for CLIInterface
 * 
 * These tests verify that CLIInterface implements the Component Interface Standardization pattern
 * and that its instance methods work correctly.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { CLIInterface } from '@/utils/cliInterface';
import type { CLIInterfaceOptions } from '@/utils/cliInterface';
import { MockLogger } from '@test/__mocks__/core/logger';

describe('CLIInterface', () => {
  // Mock for stdout.write to verify output without capturing it directly
  const mockWrite = mock((_: string | Uint8Array) => true);
  let originalStdoutWrite: typeof process.stdout.write;
  let mockLogger: ReturnType<typeof MockLogger.createFresh>;
  
  // Before each test, set up mocks
  beforeEach(() => {
    // Reset singletons before each test for isolation
    CLIInterface.resetInstance();
    MockLogger.resetInstance();
    
    // Create a fresh mock logger
    mockLogger = MockLogger.createFresh();
    
    // Store original stdout.write and replace with mock
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = mockWrite;
  });
  
  // After each test, restore stdout
  afterEach(() => {
    // Restore original stdout.write
    process.stdout.write = originalStdoutWrite;
  });
  
  test('should implement Component Interface Standardization pattern', () => {
    // Test cases for the Component Interface Standardization pattern
    const cisPatternCases = [
      {
        name: 'singleton pattern',
        test: () => {
          const instance1 = CLIInterface.getInstance();
          const instance2 = CLIInterface.getInstance();
          expect(instance1).toBe(instance2);
        },
      },
      {
        name: 'resetInstance method',
        test: () => {
          const instance1 = CLIInterface.getInstance();
          CLIInterface.resetInstance();
          const instance3 = CLIInterface.getInstance();
          expect(instance3).not.toBe(instance1);
        },
      },
      {
        name: 'createFresh method',
        test: () => {
          const instance = CLIInterface.getInstance();
          const freshInstance = CLIInterface.createFresh();
          expect(freshInstance).not.toBe(instance);
        },
      },
      {
        name: 'custom options',
        test: () => {
          // Reset mock for this specific test
          mockWrite.mockClear();
          
          const options: CLIInterfaceOptions = { silent: true };
          const silentInstance = CLIInterface.createFresh(options);
          
          // Test silent mode by outputting something - should not call write
          silentInstance.print('This should not be output');
          expect(mockWrite).not.toHaveBeenCalled();
        },
      },
    ];
    
    // Run all test cases
    cisPatternCases.forEach(({ test: testFn }) => {
      testFn();
    });
  });
  
  test('should have correct style functionality', () => {
    const cli = CLIInterface.getInstance();
    
    // Test cases for styles
    const styleCases = [
      {
        name: 'styles object defined',
        property: cli.styles,
        expectation: (styles: unknown) => expect(styles).toBeDefined(),
      },
      {
        name: 'title style function',
        property: cli.styles.title,
        expectation: (style: unknown) => expect(typeof style).toBe('function'),
      },
      {
        name: 'tag style function',
        property: cli.styles.tag,
        expectation: (style: unknown) => expect(typeof style).toBe('function'),
      },
      {
        name: 'error style function',
        property: cli.styles.error,
        expectation: (style: unknown) => expect(typeof style).toBe('function'),
      },
      {
        name: 'success icon string',
        property: cli.styles.successIcon,
        expectation: (icon: unknown) => expect(typeof icon).toBe('string'),
      },
      {
        name: 'error icon string',
        property: cli.styles.errorIcon,
        expectation: (icon: unknown) => expect(typeof icon).toBe('string'),
      },
    ];
    
    // Run all test cases
    styleCases.forEach(({ property, expectation }) => {
      expectation(property);
    });
  });
  
  test('should output formatted messages correctly', () => {
    // Cast the mockLogger to access its internal properties
    const mockLoggerImpl = mockLogger as unknown as MockLogger;
    
    // Create CLI instance with our mock logger
    const cli = CLIInterface.createFresh({
      customLogger: mockLogger,
    });
    
    // Test cases for formatted output methods
    const outputCases = [
      {
        name: 'title formatting',
        method: () => cli.displayTitle('Test Title'),
        checkOutput: () => expect(mockWrite).toHaveBeenCalled(),
        checkLog: () => expect(mockLoggerImpl.messages.debug).toContain('Displayed title: Test Title'),
      },
      {
        name: 'subtitle formatting',
        method: () => cli.displaySubtitle('Test Subtitle'),
        checkOutput: () => expect(mockWrite).toHaveBeenCalled(),
        checkLog: () => expect(mockLoggerImpl.messages.debug).toContain('Displayed subtitle: Test Subtitle'),
      },
      {
        name: 'success message',
        method: () => cli.success('Success Message'),
        checkOutput: () => expect(mockWrite).toHaveBeenCalled(),
        checkLog: () => expect(mockLoggerImpl.messages.info).toContain('[SUCCESS] Success Message'),
      },
      {
        name: 'error message',
        method: () => cli.error('Error Message'),
        checkOutput: () => expect(mockWrite).toHaveBeenCalled(),
        checkLog: () => expect(mockLoggerImpl.messages.error).toContain('Error Message'),
      },
    ];
    
    // Run all test cases
    outputCases.forEach(({ method, checkOutput, checkLog }) => {
      // Reset mocks before each case
      mockWrite.mockClear();
      mockLoggerImpl.clear();
      
      // Run the method
      method();
      
      // Check expectations
      checkOutput();
      checkLog();
    });
  });
  
  test('should format values correctly', () => {
    const cli = CLIInterface.getInstance();
    
    // Test cases for value formatting methods
    const formatCases = [
      {
        name: 'ID formatting',
        input: 'test-id-123',
        method: (input: string) => cli.formatId(input),
        check: (result: string) => expect(result).toContain('test-id-123'),
      },
      {
        name: 'tag formatting with tags',
        input: ['tag1', 'tag2'],
        method: (input: string[]) => cli.formatTags(input),
        check: (result: string) => {
          expect(result).toContain('#tag1');
          expect(result).toContain('#tag2');
        },
      },
      {
        name: 'empty tag handling',
        input: [],
        method: (input: string[]) => cli.formatTags(input),
        check: (result: string) => expect(result).toContain('No tags'),
      },
      {
        name: 'null tag handling',
        input: null,
        method: (input: string[] | null) => cli.formatTags(input),
        check: (result: string) => expect(result).toContain('No tags'),
      },
      {
        name: 'command formatting basic',
        input: { command: 'test', description: 'Test command' },
        method: (input: { command: string, description: string }) => 
          cli.formatCommand(input.command, input.description),
        check: (result: string) => {
          expect(result).toContain('test');
          expect(result).toContain('Test command');
        },
      },
      {
        name: 'command formatting with examples',
        input: { command: 'cmd', description: 'Command', examples: ['Example 1'] },
        method: (input: { command: string, description: string, examples: string[] }) => 
          cli.formatCommand(input.command, input.description, input.examples),
        check: (result: string) => expect(result).toContain('Example 1'),
      },
    ];
    
    // Run all test cases
    formatCases.forEach((testCase) => {
      // Call the method with the input using type-specific handling
      // @ts-expect-error - We know these combinations are valid at runtime
      const result = testCase.method(testCase.input);
      testCase.check(result);
    });
  });
  
  test('should display lists and label-value pairs', () => {
    // Cast the mockLogger to access its internal properties
    const mockLoggerImpl = mockLogger as unknown as MockLogger;
    
    // Create a fresh instance with our mock logger
    const cli = CLIInterface.createFresh({
      customLogger: mockLogger,
    });
    
    // Test cases for display methods
    const displayCases = [
      {
        name: 'printLabelValue with string',
        method: () => cli.printLabelValue('Name', 'Test Name'),
        check: () => expect(mockWrite).toHaveBeenCalled(),
      },
      {
        name: 'printLabelValue with array',
        method: () => cli.printLabelValue('Tags', ['tag1', 'tag2']),
        check: () => expect(mockWrite).toHaveBeenCalled(),
      },
      {
        name: 'displayList',
        method: () => cli.displayList(['Item 1', 'Item 2', 'Item 3']),
        check: () => {
          expect(mockWrite).toHaveBeenCalled();
          expect(mockLoggerImpl.messages.info).toContain('Displaying list of 3 items');
        },
      },
    ];
    
    // Run all test cases
    displayCases.forEach(({ method, check }) => {
      // Reset mocks before each case
      mockWrite.mockClear();
      mockLoggerImpl.clear();
      
      // Run the method
      method();
      
      // Check expectations
      check();
    });
  });
});