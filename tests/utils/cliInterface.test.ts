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
    // Verify singleton pattern
    const instance1 = CLIInterface.getInstance();
    const instance2 = CLIInterface.getInstance();
    expect(instance1).toBe(instance2);
    
    // Verify resetInstance
    CLIInterface.resetInstance();
    const instance3 = CLIInterface.getInstance();
    expect(instance3).not.toBe(instance1);
    
    // Verify createFresh
    const freshInstance = CLIInterface.createFresh();
    expect(freshInstance).not.toBe(instance3);
    
    // Verify options are passed correctly
    const options: CLIInterfaceOptions = { silent: true };
    const silentInstance = CLIInterface.createFresh(options);
    
    // Reset mock for this specific test
    mockWrite.mockClear();
    
    // Test silent mode by outputting something - should not call write
    silentInstance.print('This should not be output');
    expect(mockWrite).not.toHaveBeenCalled();
  });
  
  test('should have accessible styles via instance', () => {
    const cli = CLIInterface.getInstance();
    
    // Verify styles are accessible
    expect(cli.styles).toBeDefined();
    
    // Check a few representative style functions
    expect(typeof cli.styles.title).toBe('function');
    expect(typeof cli.styles.tag).toBe('function');
    expect(typeof cli.styles.error).toBe('function');
    
    // Check a few icon strings
    expect(typeof cli.styles.successIcon).toBe('string');
    expect(typeof cli.styles.errorIcon).toBe('string');
  });
  
  test('should output formatted messages', () => {
    // Cast the mockLogger to access its internal properties
    const mockLoggerImpl = mockLogger as unknown as MockLogger;
    
    // Create CLI instance with our mock logger
    const cli = CLIInterface.createFresh({
      customLogger: mockLogger,
    });
    
    // Test title formatting
    cli.displayTitle('Test Title');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockLoggerImpl.messages.debug).toContain('Displayed title: Test Title');
    
    // Reset mocks
    mockWrite.mockClear();
    mockLoggerImpl.clear();
    
    // Test subtitle formatting
    cli.displaySubtitle('Test Subtitle');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockLoggerImpl.messages.debug).toContain('Displayed subtitle: Test Subtitle');
    
    // Reset mocks
    mockWrite.mockClear();
    mockLoggerImpl.clear();
    
    // Test success message
    cli.success('Success Message');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockLoggerImpl.messages.info).toContain('[SUCCESS] Success Message');
    
    // Reset mocks
    mockWrite.mockClear();
    mockLoggerImpl.clear();
    
    // Test error message
    cli.error('Error Message');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockLoggerImpl.messages.error).toContain('Error Message');
  });
  
  test('should format values correctly', () => {
    const cli = CLIInterface.getInstance();
    
    // Test ID formatting
    const formattedId = cli.formatId('test-id-123');
    expect(formattedId).toContain('test-id-123');
    
    // Test tag formatting
    const formattedTags = cli.formatTags(['tag1', 'tag2']);
    expect(formattedTags).toContain('#tag1');
    expect(formattedTags).toContain('#tag2'); // This is different from printLabelValue's default behavior
    
    // Test empty tag handling
    expect(cli.formatTags([])).toContain('No tags');
    expect(cli.formatTags(null)).toContain('No tags');
    
    // Test command formatting
    const formattedCommand = cli.formatCommand('test', 'Test command');
    expect(formattedCommand).toContain('test');
    expect(formattedCommand).toContain('Test command');
    
    // Test command with examples
    const withExamples = cli.formatCommand('cmd', 'Command', ['Example 1']);
    expect(withExamples).toContain('Example 1');
  });
  
  test('should display lists and label-value pairs', () => {
    // Cast the mockLogger to access its internal properties
    const mockLoggerImpl = mockLogger as unknown as MockLogger;
    
    // Create a fresh instance with our mock logger
    const cli = CLIInterface.createFresh({
      customLogger: mockLogger,
    });
    
    // Test printLabelValue with string
    mockWrite.mockClear();
    cli.printLabelValue('Name', 'Test Name');
    expect(mockWrite).toHaveBeenCalled();
    
    // Test printLabelValue with array
    mockWrite.mockClear();
    cli.printLabelValue('Tags', ['tag1', 'tag2']);
    expect(mockWrite).toHaveBeenCalled();
    
    // Test displayList
    mockWrite.mockClear();
    mockLoggerImpl.clear();
    cli.displayList(['Item 1', 'Item 2', 'Item 3']);
    expect(mockWrite).toHaveBeenCalled();
    expect(mockLoggerImpl.messages.info).toContain('Displaying list of 3 items');
  });
});
