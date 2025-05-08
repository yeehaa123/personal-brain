/**
 * Mock implementation of CLIInterface
 * 
 * This mock follows the Component Interface Standardization pattern 
 * to provide a consistent testing approach for CLI interfaces.
 */

import { mock } from 'bun:test';
import chalk from 'chalk';

import type { CLIInterfaceOptions, CLIStyles } from '@/utils/cliInterface';
import type { CLIInterface } from '@/utils/cliInterface';
import Logger from '@/utils/logger';

// Use a type instead of interface to avoid lint error about empty interface
type MockableCLIInterface = Omit<CLIInterface, 'spinner'>;

/**
 * MockCLIInterface provides a standardized mock for the CLIInterface class.
 * 
 * This class follows the Component Interface Standardization pattern with singleton
 * management via getInstance(), resetInstance(), and createFresh().
 */
export class MockCLIInterface implements MockableCLIInterface {
  /** The singleton instance */
  private static instance: MockCLIInterface | null = null;
  
  /** Required properties from CLIInterface */
  public readonly silent: boolean = false;
  public readonly logger: typeof Logger = Logger;
  
  /** Mock methods with sensible default implementations */
  public displayTitle = mock(() => {});
  public displaySubtitle = mock(() => {});
  public success = mock(() => {});
  public error = mock((_message: string) => {});
  public warn = mock(() => {});
  public info = mock(() => {});
  public print = mock((_message: string, _options?: { renderMarkdown?: boolean }) => {});
  public printLabelValue = mock((_label: string, _value: string | number | string[] | null, _options?: {
    emptyText?: string;
    formatter?: (val: string) => string;
  }) => {
    // Implementation intentionally left empty for mock
  });
  public displayList = mock(() => {});
  public formatCommand = mock((cmd: string, desc: string) => `${cmd} - ${desc}`);
  public formatId = mock((id: string) => id);
  public formatTags = mock((tags: string[] | null | undefined) => tags && tags.length > 0 ? tags.join(' ') : 'No tags');
  public formatDate = mock((date: Date | string | number) => date.toString());
  public renderMarkdown = mock((markdown: string) => markdown);
  
  // We need to use 'any' for select to match the CLIInterface's generic definition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public select<T = any>(_message: string, choices: Array<{ name: string, value: T }>): Promise<T> {
    return Promise.resolve(choices.length > 0 ? choices[0].value : ({} as T));
  }
  public input = mock(async (_message: string) => '');
  public confirm = mock(async (_message: string) => true);
  
  /** Spinner-related methods */
  public startSpinner = mock((_text: string) => {});
  public updateSpinner = mock((_text: string) => {});
  public stopSpinner = mock((_type?: 'success' | 'error' | 'info', _text?: string) => {});
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public withSpinner<T = any>(_message: string, callback: () => Promise<T>): Promise<T> {
    return callback();
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public withProgressSpinner<T = any>(
    _steps: string[], 
    task: (updateStep: (stepIndex: number) => void) => Promise<T>,
  ): Promise<T> {
    return task((_stepIndex: number) => {});
  }
  
  // Static methods
  public static error = mock((_message: string) => {});

  /** Simple style implementation for tests */
  public get styles(): CLIStyles {
    // Use chalk directly to ensure type compatibility
    return {
      title: chalk.cyan.bold,
      subtitle: chalk.magenta.bold,
      separator: chalk.cyan,
      label: chalk.dim,
      value: chalk.white,
      highlight: chalk.cyan,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,
      dim: chalk.dim,
      id: chalk.gray,
      tag: chalk.cyan,
      date: chalk.white,
      number: chalk.cyan,
      command: chalk.cyan,
      example: chalk.italic,
      url: chalk.blue.underline,
      warn: chalk.yellow,
      successIcon: '✓',
      errorIcon: '✖',
      warningIcon: '⚠',
      infoIcon: 'ℹ',
    };
  }

  /**
   * Private constructor to enforce the use of getInstance/createFresh
   * 
   * @param options Optional configuration options
   */
  private constructor(options?: CLIInterfaceOptions) {
    if (options?.silent !== undefined) {
      this.silent = options.silent;
    }
    if (options?.customLogger) {
      this.logger = options.customLogger;
    }
  }

  /**
   * Get the singleton instance 
   * 
   * @param options Optional configuration options
   * @returns The shared MockCLIInterface instance
   */
  public static getInstance(options?: CLIInterfaceOptions): MockCLIInterface {
    if (!MockCLIInterface.instance) {
      MockCLIInterface.instance = new MockCLIInterface(options);
    }
    return MockCLIInterface.instance;
  }
  
  /**
   * Reset the singleton instance
   * This clears the instance and resets all mock call history
   */
  public static resetInstance(): void {
    if (MockCLIInterface.instance) {
      // Reset all mock methods
      Object.entries(MockCLIInterface.instance)
        .filter(([_, val]) => typeof val === 'function' && 'mock' in val)
        .forEach(([_, mockFn]) => (mockFn as ReturnType<typeof mock>).mockClear());
    }
    MockCLIInterface.instance = null;
  }
  
  /**
   * Create a fresh instance
   * 
   * @param options Optional configuration options
   * @returns A new MockCLIInterface instance
   */
  public static createFresh(options?: CLIInterfaceOptions): MockCLIInterface {
    return new MockCLIInterface(options);
  }
}