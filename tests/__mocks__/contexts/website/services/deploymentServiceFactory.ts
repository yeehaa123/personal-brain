import { mock } from 'bun:test';

import type { DeploymentService } from '@/mcp/contexts/website/services/deploymentService';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock implementation of DeploymentServiceFactory for testing
 */
export class MockDeploymentServiceFactory {
  private static instance: MockDeploymentServiceFactory | null = null;
  logger = MockLogger.createFresh({ silent: true });
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockDeploymentServiceFactory {
    if (!MockDeploymentServiceFactory.instance) {
      MockDeploymentServiceFactory.instance = new MockDeploymentServiceFactory();
    }
    return MockDeploymentServiceFactory.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockDeploymentServiceFactory.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockDeploymentServiceFactory {
    return new MockDeploymentServiceFactory();
  }
  
  /**
   * Create a mock deployment service
   */
  createDeploymentService = mock((_providerType: string): Promise<DeploymentService | null> => {
    // For now, always return null to indicate no deployment provider is implemented yet
    return Promise.resolve(null);
  });
}

export default MockDeploymentServiceFactory;