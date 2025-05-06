/**
 * Mock implementation of CLIRenderer
 * 
 * This mock follows the Component Interface Standardization pattern 
 * to provide a consistent testing approach for CLI rendering.
 */

import { mock } from 'bun:test';

import type { CommandHandler, CommandInfo, CommandResult } from '@/commands';
import type { CLIRendererOptions } from '@/commands/cli-renderer';
import { MockCLIInterface } from '@test/__mocks__/utils/cliInterface';

/**
 * Mock CLIRenderer provides a standardized mock for testing
 */
export class MockCLIRenderer {
  /** The singleton instance */
  private static instance: MockCLIRenderer | null = null;
  
  /** Mock methods with tracking */
  public renderHelp = mock((_commands: CommandInfo[]) => {});
  public render = mock((_result: CommandResult) => {});
  public setCommandHandler = mock((_handler: CommandHandler) => {});
  
  /** Injected dependencies for testing */
  public readonly cliInterface = MockCLIInterface.getInstance();

  /**
   * Get the singleton instance
   */
  public static getInstance(_options?: CLIRendererOptions): MockCLIRenderer {
    if (!MockCLIRenderer.instance) {
      MockCLIRenderer.instance = new MockCLIRenderer();
    }
    return MockCLIRenderer.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    if (MockCLIRenderer.instance) {
      // Reset all mock methods
      Object.entries(MockCLIRenderer.instance)
        .filter(([_, val]) => typeof val === 'function' && 'mock' in val)
        .forEach(([_, mockFn]) => (mockFn as ReturnType<typeof mock>).mockClear());
    }
    MockCLIRenderer.instance = null;
    
    // Also reset the CLI interface
    MockCLIInterface.resetInstance();
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(_options?: CLIRendererOptions): MockCLIRenderer {
    const renderer = new MockCLIRenderer();
    return renderer;
  }
}