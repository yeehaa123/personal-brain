/**
 * Mock implementation of WebsiteDeploymentManager for testing
 */

import { mock } from 'bun:test';

import type { 
  DeploymentEnvironment, 
  EnvironmentStatus, 
  PromotionResult, 
  WebsiteDeploymentManager,
} from '@/contexts/website/services/deployment';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock implementation of WebsiteDeploymentManager
 */
export class MockWebsiteDeploymentManager implements WebsiteDeploymentManager {
  private static instance: MockWebsiteDeploymentManager | null = null;
  logger = MockLogger.createFresh({ silent: true });

  // Mock state
  private previewStatus: EnvironmentStatus = {
    environment: 'preview',
    buildStatus: 'Built' as const,
    fileCount: 42,
    serverStatus: 'Running' as const,
    domain: 'preview.example.com',
    accessStatus: 'Accessible',
    url: 'https://preview.example.com',
  };

  private productionStatus: EnvironmentStatus = {
    environment: 'production',
    buildStatus: 'Built' as const,
    fileCount: 42,
    serverStatus: 'Running' as const,
    domain: 'example.com',
    accessStatus: 'Accessible',
    url: 'https://example.com',
  };

  // Mock promotion result
  private promotionResult: PromotionResult = {
    success: true,
    message: 'Preview successfully promoted to production (42 files).',
    url: 'https://example.com',
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
  static getInstance(): MockWebsiteDeploymentManager {
    if (!MockWebsiteDeploymentManager.instance) {
      MockWebsiteDeploymentManager.instance = new MockWebsiteDeploymentManager();
    }
    return MockWebsiteDeploymentManager.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockWebsiteDeploymentManager.instance = null;
  }

  /**
   * Create a fresh instance
   * @returns A new instance
   */
  static createFresh(): MockWebsiteDeploymentManager {
    return new MockWebsiteDeploymentManager();
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

/**
 * Mock implementation of DeploymentManagerFactory
 */
export class MockDeploymentManagerFactory {
  private static instance: MockDeploymentManagerFactory | null = null;
  logger = MockLogger.createFresh({ silent: true });
  
  // Mock deployment manager
  private deploymentManager = MockWebsiteDeploymentManager.createFresh();
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockDeploymentManagerFactory {
    if (!MockDeploymentManagerFactory.instance) {
      MockDeploymentManagerFactory.instance = new MockDeploymentManagerFactory();
    }
    return MockDeploymentManagerFactory.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockDeploymentManagerFactory.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockDeploymentManagerFactory {
    return new MockDeploymentManagerFactory();
  }
  
  /**
   * Set the deployment manager instance
   * @param manager The deployment manager to use
   */
  setDeploymentManager(manager: MockWebsiteDeploymentManager): void {
    this.deploymentManager = manager;
  }
  
  /**
   * Create a deployment manager instance
   * @returns A WebsiteDeploymentManager implementation
   */
  createDeploymentManager = mock((): WebsiteDeploymentManager => {
    return this.deploymentManager;
  });
}