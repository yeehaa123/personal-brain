/**
 * Mock implementation of LocalDevDeploymentManager for testing
 */

import { mock } from 'bun:test';

import type {
  EnvironmentStatus,
  PromotionResult,
  SiteEnvironment,
  WebsiteDeploymentManager,
} from '@/contexts/website/services/deployment/deploymentManager';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock implementation of LocalDevDeploymentManager
 */
export class MockLocalDevDeploymentManager implements WebsiteDeploymentManager {
  private static instance: MockLocalDevDeploymentManager | null = null;
  logger = MockLogger.createFresh({ silent: true });

  // Mock state
  private previewStatus: EnvironmentStatus = {
    environment: 'preview',
    buildStatus: 'Built' as const,
    fileCount: 42,
    serverStatus: 'Running' as const,
    domain: 'localhost:4321',
    accessStatus: 'Accessible',
    url: 'http://localhost:4321',
  };

  private liveStatus: EnvironmentStatus = {
    environment: 'live',
    buildStatus: 'Built' as const,
    fileCount: 42,
    serverStatus: 'Running' as const,
    domain: 'localhost:4322',
    accessStatus: 'Accessible',
    url: 'http://localhost:4322',
  };

  // Mock promotion result
  private promotionResult: PromotionResult = {
    success: true,
    message: 'Preview successfully promoted to live site (42 files).',
    url: 'http://localhost:4322',
  };

  // Mock methods that can be spied on
  getEnvironmentStatus = mock((environment: SiteEnvironment): Promise<EnvironmentStatus> => {
    return Promise.resolve(environment === 'preview' ? this.previewStatus : this.liveStatus);
  });
  
  // Implementation of required promoteToLive method
  promoteToLive = mock((): Promise<PromotionResult> => {
    return Promise.resolve(this.promotionResult);
  });
  
  // Optional startServers method
  startServers = mock((): Promise<boolean> => {
    return Promise.resolve(true);
  });
  
  // Optional stopServers method
  stopServers = mock((): Promise<void> => {
    return Promise.resolve();
  });


  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() { }

  /**
   * Get the singleton instance
   */
  static getInstance(): MockLocalDevDeploymentManager {
    if (!MockLocalDevDeploymentManager.instance) {
      MockLocalDevDeploymentManager.instance = new MockLocalDevDeploymentManager();
    }
    return MockLocalDevDeploymentManager.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockLocalDevDeploymentManager.instance = null;
  }

  /**
   * Create a fresh instance
   * @returns A new instance
   */
  static createFresh(): MockLocalDevDeploymentManager {
    return new MockLocalDevDeploymentManager();
  }

  /**
   * Set the status for an environment
   * @param environment The environment to set status for
   * @param status The status to set
   */
  setEnvironmentStatus(environment: SiteEnvironment, status: Partial<EnvironmentStatus>): void {
    if (environment === 'preview') {
      this.previewStatus = { ...this.previewStatus, ...status };
    } else {
      this.liveStatus = { ...this.liveStatus, ...status };
    }
  }

  /**
   * Set the promotion result
   * @param result The result to set
   */
  setPromotionResult(result: Partial<PromotionResult>): void {
    this.promotionResult = { ...this.promotionResult, ...result };
  }
}
