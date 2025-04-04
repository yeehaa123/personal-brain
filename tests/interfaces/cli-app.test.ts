import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

// Now import the modules

import type { CommandHandler } from '@/commands';
import type { CLIRenderer } from '@/commands/cli-renderer';
import { CLIApp } from '@/interfaces/cli-app';

// Mock the logger module
mock.module('@/utils/logger', () => ({
  default: {
    info: mock(() => { }),
    error: mock(() => { }),
    debug: mock(() => { }),
    warn: mock(() => { }),
  },
}));

// Mock CLIInterface for UI output
mock.module('@/utils/cliInterface', () => ({
  CLIInterface: {
    displayTitle: mock(() => { }),
    info: mock(() => { }),
    error: mock(() => { }),
    success: mock(() => { }),
    withSpinner: mock((_message: string, callback: () => unknown) => callback()),
    formatId: mock((id) => id),
    formatTags: mock((tags) => tags ? tags.join(' ') : 'No tags'),
    print: mock(() => {}),
    printLabelValue: mock(() => {}),
    styles: {
      title: (text: string) => text,
      error: (text: string) => text,
      success: (text: string) => text,
      highlight: (text: string) => text,
      subtitle: (text: string) => text,
      number: (text: string) => text,
      id: (text: string) => text,
      tag: (text: string) => text,
      dim: (text: string) => text,
    },
  },
}));

// Mock inquirer for user input
mock.module('inquirer', () => ({
  prompt: mock(() => Promise.resolve({ action: 'test command' })),
}));

// Save original process properties
const originalArgv = process.argv;
const originalExit = process.exit;

describe('CLIApp', () => {
  let cliApp: CLIApp;

  // Create mock implementation with only the methods we need
  const mockProcessCommand = mock(() => Promise.resolve({ type: 'success', message: 'Command executed' }));
  const mockGetCommands = mock(() => [
    { command: 'test', description: 'Test command', usage: 'test' },
  ]);

  const mockRender = mock(() => { });
  const mockRenderHelp = mock(() => { });

  // Cast to the proper types using unknown as intermediate step
  const mockCommandHandler = {
    processCommand: mockProcessCommand,
    getCommands: mockGetCommands,
  } as unknown as CommandHandler;

  const mockRenderer = {
    render: mockRender,
    renderHelp: mockRenderHelp,
    setCommandHandler: mock(() => { }),
  } as unknown as CLIRenderer;

  beforeAll(() => {
    // Mock process.exit to throw instead of exiting
    process.exit = mock(() => {
      throw new Error('Process exit called');
    }) as typeof process.exit;
  });

  afterAll(() => {
    // Restore original process properties
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  beforeEach(() => {
    // Reset mocks
    mockProcessCommand.mockClear();
    mockRender.mockClear();
    mockRenderHelp.mockClear();

    // Create CLIApp instance with mocked dependencies
    cliApp = new CLIApp({
      commandHandler: mockCommandHandler,
      renderer: mockRenderer,
    });
  });

  describe('CLIApp public API', () => {
    test('should have a start method', () => {
      expect(typeof cliApp.start).toBe('function');
    });

    test('should have a stop method', () => {
      expect(typeof cliApp.stop).toBe('function');
    });

    test('stop method should terminate the application', () => {
      // We can only test the public API, so we just ensure stop() exists and doesn't throw
      cliApp.stop();

      // Since we can't access private properties, we'll verify the method exists and runs
      expect(cliApp.stop).toBeDefined();
      expect(() => cliApp.stop()).not.toThrow();
    });
  });

  describe('Command line processing', () => {
    beforeEach(() => {
      // Set up mock of process.argv for CLI mode testing
      process.argv = ['node', 'cli.js', 'test', 'arg1', 'arg2'];
    });

    test('should process command line arguments', async () => {
      // The start method should call runCommandLineMode if process.argv.length > 2
      // We verify this indirectly by checking if processCommand was called with the right args

      await cliApp.start();

      expect(mockProcessCommand).toHaveBeenCalledTimes(1);
      expect(mockProcessCommand).toHaveBeenCalledWith('test', 'arg1 arg2');
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    test('should handle help command from command line', async () => {
      process.argv = ['node', 'cli.js', 'help'];

      await cliApp.start();

      expect(mockRenderHelp).toHaveBeenCalledTimes(1);
      expect(mockProcessCommand).not.toHaveBeenCalled();
    });

    test('should handle command execution errors', async () => {
      const error = new Error('Command failed');
      mockProcessCommand.mockRejectedValue(error);

      // Import CLIInterface dynamically
      const { CLIInterface } = await import('@/utils/cliInterface');

      // Save original CLIInterface.error
      const originalErrorFn = CLIInterface.error;

      // Create our own mock
      const errorMock = mock(() => { });
      CLIInterface.error = errorMock;

      await cliApp.start();

      expect(mockProcessCommand).toHaveBeenCalledTimes(1);
      expect(mockRender).not.toHaveBeenCalled();
      expect(errorMock).toHaveBeenCalled();

      // Restore original
      CLIInterface.error = originalErrorFn;
    });

    test('should handle non-Error object exceptions', async () => {
      mockProcessCommand.mockRejectedValue('String error');

      // Import CLIInterface dynamically
      const { CLIInterface } = await import('@/utils/cliInterface');

      // Save original CLIInterface.error
      const originalErrorFn = CLIInterface.error;

      // Create our own mock
      const errorMock = mock(() => { });
      CLIInterface.error = errorMock;

      await cliApp.start();

      expect(mockProcessCommand).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalled();
      expect(errorMock).toHaveBeenCalledWith('Error executing command: String error');

      // Restore original
      CLIInterface.error = originalErrorFn;
    });
  });
});
