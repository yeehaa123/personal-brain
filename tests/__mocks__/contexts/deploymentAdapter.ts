import { mock } from 'bun:test';

import type { DeploymentAdapter as IDeploymentAdapter } from '@/contexts/website/adapters/deploymentAdapter';

/**
 * Mock implementation of DeploymentAdapter for testing
 */
export class MockDeploymentAdapter implements IDeploymentAdapter {
  private static instance: MockDeploymentAdapter | null = null;
  
  // Mock state
  private runningServers: Record<string, boolean> = {
    preview: false,
    production: false,
  };
  
  // Configuration
  private config = {
    type: 'local-dev',
    useReverseProxy: false,
    previewPort: 4321,
    productionPort: 4322,
    domain: 'localhost',
  };
  
  // Mock functions
  initialize = mock(() => {
    return Promise.resolve(true);
  });
  
   
  startServer = mock((environment: 'preview' | 'production', _port: number, _directory: string) => {
    this.runningServers[environment] = true;
    return Promise.resolve(true);
  });
  
  stopServer = mock((environment: 'preview' | 'production') => {
    this.runningServers[environment] = false;
    return Promise.resolve(true);
  });
  
  isServerRunning = mock((environment: 'preview' | 'production') => {
    return Promise.resolve(this.runningServers[environment]);
  });
  
  cleanup = mock(() => {
    this.runningServers['preview'] = false;
    this.runningServers['production'] = false;
    return Promise.resolve();
  });
  
  getDeploymentConfig = mock(() => this.config);
  
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
      MockDeploymentAdapter.instance.getDeploymentConfig.mockClear();
      
      // Reset state
      MockDeploymentAdapter.instance.runningServers = {
        preview: false,
        production: false,
      };
    }
    MockDeploymentAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockDeploymentAdapter {
    return new MockDeploymentAdapter();
  }
  
  /**
   * Set config for testing
   */
  setConfig(config: Partial<{
    type: string;
    useReverseProxy: boolean;
    previewPort: number;
    productionPort: number;
    domain: string;
  }>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Set server running state for testing
   */
  setServerRunning(environment: 'preview' | 'production', running: boolean): void {
    this.runningServers[environment] = running;
  }
}