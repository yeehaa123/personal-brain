/**
 * Mock deployment adapter for testing
 */

import { mock } from 'bun:test';

import type { DeploymentAdapter } from '@/mcp/contexts/website/adapters/deploymentAdapter';

/**
 * Mock implementation of deployment adapter for testing
 */
export class MockDeploymentAdapter implements DeploymentAdapter {
  private static instance: MockDeploymentAdapter | null = null;

  // Mock methods
  initialize = mock<() => Promise<boolean>>(() => Promise.resolve(true));
  startServer = mock<(environment: 'preview' | 'production', port: number, directory: string, serverScript?: string) => Promise<boolean>>(
    () => Promise.resolve(true),
  );
  stopServer = mock<(environment: 'preview' | 'production') => Promise<boolean>>(
    () => Promise.resolve(true),
  );
  isServerRunning = mock<(environment: 'preview' | 'production') => Promise<boolean>>(
    () => Promise.resolve(true),
  );
  cleanup = mock<() => Promise<void>>(() => Promise.resolve());
  getDeploymentConfig = mock<() => {
    type: string;
    useReverseProxy: boolean;
    previewPort: number;
    productionPort: number;
    domain: string;
  }>(() => ({
      type: 'local-dev',
      useReverseProxy: false,
      previewPort: 4321,
      productionPort: 4322,
      domain: 'example.com',
    }));
    
  // Default server scripts for testing - keeping in sync with the real adapter
  // This is used for reference and documentation purposes
  readonly defaultScripts = {
    preview: 'website:preview',
    production: 'website:production',
  };

  // Server running status flags
  private previewRunning = true;
  private productionRunning = true;

  /**
   * Set server running status
   * @param environment The environment to set status for
   * @param isRunning Whether the server is running
   */
  setServerRunning(environment: 'preview' | 'production', isRunning: boolean): void {
    if (environment === 'preview') {
      this.previewRunning = isRunning;
    } else {
      this.productionRunning = isRunning;
    }

    // Update the isServerRunning mock
    this.isServerRunning = mock<(env: 'preview' | 'production') => Promise<boolean>>(
      (env) => Promise.resolve(env === 'preview' ? this.previewRunning : this.productionRunning),
    );
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MockDeploymentAdapter {
    if (!MockDeploymentAdapter.instance) {
      MockDeploymentAdapter.instance = new MockDeploymentAdapter();
    }
    return MockDeploymentAdapter.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    if (MockDeploymentAdapter.instance) {
      MockDeploymentAdapter.instance.initialize.mockClear();
      MockDeploymentAdapter.instance.startServer.mockClear();
      MockDeploymentAdapter.instance.stopServer.mockClear();
      MockDeploymentAdapter.instance.isServerRunning.mockClear();
      MockDeploymentAdapter.instance.cleanup.mockClear();
    }
    MockDeploymentAdapter.instance = null;
  }

  /**
   * Create a fresh instance
   */
  static createFresh(): MockDeploymentAdapter {
    return new MockDeploymentAdapter();
  }
}