import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { CommandHandler } from '@/commands';
import type { CLIInterface } from '@/utils/cliInterface';
import type { CLIRenderer } from '@/commands/cli-renderer';
import { CLIApp } from '@/interfaces/cli-app';
import { MockLogger } from '@test/__mocks__/core/logger';
import { MockCLIInterface } from '@test/__mocks__/utils/cliInterface';

// Mock inquirer for user input
mock.module('inquirer', () => ({
  prompt: mock(() => Promise.resolve({ action: 'test command' })),
}));

const originalProcess = { argv: process.argv, exit: process.exit };

describe('CLIApp', () => {
  let cliApp: CLIApp;
  let mockCommandHandler: CommandHandler;
  let mockRenderer: CLIRenderer;
  let mockCLI: MockCLIInterface;
  let mockLogger: ReturnType<typeof MockLogger.getInstance>;

  beforeAll(() => {
    process.exit = mock(() => { throw new Error('Process exit called'); }) as typeof process.exit;
  });

  afterAll(() => {
    process.argv = originalProcess.argv;
    process.exit = originalProcess.exit;
    MockCLIInterface.resetInstance();
    MockLogger.resetInstance();
  });

  beforeEach(() => {
    // Reset and create fresh mock instances
    MockCLIInterface.resetInstance();
    MockLogger.resetInstance();
    mockCLI = MockCLIInterface.createFresh();
    mockLogger = MockLogger.createFresh();
    
    // Create mock dependencies
    mockCommandHandler = {
      processCommand: () => Promise.resolve({ type: 'error', message: 'Command executed' }),
      getCommands: () => [{ command: 'test', description: 'Test command', usage: 'test' }],
    } as unknown as CommandHandler;

    mockRenderer = {
      render: () => {},
      renderHelp: () => {},
      setCommandHandler: () => {},
    } as unknown as CLIRenderer;
    
    cliApp = CLIApp.createFresh({
      commandHandler: mockCommandHandler,
      renderer: mockRenderer,
      cliInterface: mockCLI as unknown as CLIInterface,
      logger: mockLogger,
    });
  });

  test('should expose public API methods', () => {
    expect({
      hasRequiredMethods: typeof cliApp.start === 'function' && typeof cliApp.stop === 'function',
    }).toEqual({ hasRequiredMethods: true });
  });

  test('should process command line arguments and execute commands', async () => {
    // For this test, use mocks with tracking capabilities
    const processCommand = mock(() => Promise.resolve({ type: 'success', message: 'Command executed' }));
    const render = mock(() => {});
    
    // Create a test-specific app
    const mockHandler = { 
      processCommand, 
      getCommands: () => [], 
    } as unknown as CommandHandler;
    
    const mockRender = { 
      render, 
      renderHelp: () => {}, 
      setCommandHandler: () => {}, 
    } as unknown as CLIRenderer;
    
    const testApp = CLIApp.createFresh({
      commandHandler: mockHandler,
      renderer: mockRender,
      cliInterface: mockCLI as unknown as CLIInterface,
      logger: mockLogger,
    });
    
    process.argv = ['node', 'cli.js', 'test', 'arg1', 'arg2'];
    await testApp.start();
    
    // Check just the call counts - this avoids TypeScript errors with mock call arguments
    expect(processCommand.mock.calls.length).toBe(1);
    expect(render.mock.calls.length).toBe(1);
    
    // Verify mock was called with expected arguments using a custom approach that's typesafe
    if (processCommand.mock.calls.length > 0) {
      // Get the args that were passed (this avoids direct array access that TypeScript complains about)
      const args = processCommand.mock.calls.map((call: unknown[]) => call).flat();
      expect(args).toContain('test');
      expect(args).toContain('arg1 arg2');
    }
  });
  
  test('should handle help command with special routing', async () => {
    // For this test, use mocks with tracking capabilities
    const processCommand = mock(() => Promise.resolve({ type: 'success', message: 'Processed' }));
    const renderHelp = mock(() => {});
    
    // Create a test-specific app
    const mockHandler = { 
      processCommand, 
      getCommands: () => [], 
    } as unknown as CommandHandler;
    
    const mockRender = { 
      render: () => {}, 
      renderHelp, 
      setCommandHandler: () => {}, 
    } as unknown as CLIRenderer;
    
    const testApp = CLIApp.createFresh({
      commandHandler: mockHandler,
      renderer: mockRender,
      cliInterface: mockCLI as unknown as CLIInterface,
      logger: mockLogger,
    });
    
    process.argv = ['node', 'cli.js', 'help'];
    await testApp.start();
    
    expect({
      helpCalled: renderHelp.mock.calls.length,
      commandCalled: processCommand.mock.calls.length,
    }).toEqual({
      helpCalled: 1,
      commandCalled: 0,
    });
  });
  
  test('should handle and log errors during command execution', async () => {
    // For this test, use mocks with tracking capabilities
    const processCommand = mock(() => {
      throw new Error('Command failed');
    });
    const errorLog = mock((_message: string) => {});
    const errorMsg = mock((_message: string) => {});
    
    // Create our standardized MockLogger
    MockLogger.resetInstance();
    const testLogger = MockLogger.createFresh();
    
    // Override the logger error method
    testLogger.error = errorLog;
    
    // Create a mock CLI that we can track
    const testCLI = MockCLIInterface.createFresh();
    
    // Override the mock error method
    testCLI.error = errorMsg;
    
    // Create a test-specific app
    const mockHandler = { 
      processCommand, 
      getCommands: () => [], 
    } as unknown as CommandHandler;
    
    const mockRender = { 
      render: () => {}, 
      renderHelp: () => {}, 
      setCommandHandler: () => {}, 
    } as unknown as CLIRenderer;
    
    const testApp = CLIApp.createFresh({
      commandHandler: mockHandler,
      renderer: mockRender,
      cliInterface: testCLI as unknown as CLIInterface,
      logger: testLogger,
    });
    
    process.argv = ['node', 'cli.js', 'test'];
    await testApp.start();
    
    expect({
      cliErrorCalled: errorMsg.mock.calls.length,
      logErrorCalled: errorLog.mock.calls.length,
      errorMessageContains: errorMsg.mock.calls[0]?.[0].includes('Command failed'),
      logMessageContains: errorLog.mock.calls[0]?.[0].includes('Command error:'),
    }).toEqual({
      cliErrorCalled: 1,
      logErrorCalled: 1,
      errorMessageContains: true,
      logMessageContains: true,
    });
  });
});
