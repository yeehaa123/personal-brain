/**
 * Mock implementation of LocalDevDeploymentManager for testing
 */

import { mock } from 'bun:test';
import type { 
  DeploymentEnvironment, 
  EnvironmentStatus, 
  PromotionResult, 
  WebsiteDeploymentManager,
} from '@/mcp/contexts/website/services/deployment';
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
    buildStatus: 'Built',
    fileCount: 42,
    caddyStatus: 'Running',
    domain: 'localhost:4321',
    accessStatus: 'Accessible',
    url: 'http://localhost:4321',
  };

  private productionStatus: EnvironmentStatus = {
    environment: 'production',
    buildStatus: 'Built',
    fileCount: 42,
    caddyStatus: 'Running',
    domain: 'localhost:4322',
    accessStatus: 'Accessible',
    url: 'http://localhost:4322',
  };

  // Mock promotion result
  private promotionResult: PromotionResult = {
    success: true,
    message: 'Preview successfully promoted to production (42 files).',
    url: 'http://localhost:4322',
  };

  // Mock methods that can be spied on
  getEnvironmentStatus = mock((environment: DeploymentEnvironment): Promise<EnvironmentStatus> => {
    return Promise.resolve(environment === 'preview' ? this.previewStatus : this.productionStatus);
  });

  promoteToProduction = mock((): Promise<PromotionResult> => {
    return Promise.resolve(this.promotionResult);
  });

  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}

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
  setEnvironmentStatus(environment: DeploymentEnvironment, status: Partial<EnvironmentStatus>): void {
    if (environment === 'preview') {
      this.previewStatus = { ...this.previewStatus, ...status };
    } else {
      this.productionStatus = { ...this.productionStatus, ...status };
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