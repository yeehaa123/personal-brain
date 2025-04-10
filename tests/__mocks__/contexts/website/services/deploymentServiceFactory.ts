import { mock } from 'bun:test';

import type { DeploymentService } from '@/mcp/contexts/website/services/deploymentService';
import { MockLogger } from '@test/__mocks__/core/logger';

import { MockNetlifyDeploymentService } from './netlifyDeploymentService';

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
    MockNetlifyDeploymentService.resetInstance();
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockDeploymentServiceFactory {
    return new MockDeploymentServiceFactory();
  }
  
  /**
   * Create a deployment service for the given provider
   */
  createDeploymentService = mock((providerType: string): Promise<DeploymentService | null> => {
    switch (providerType.toLowerCase()) {
    case 'netlify':
      return Promise.resolve(MockNetlifyDeploymentService.getInstance());
    default:
      return Promise.resolve(null);
    }
  });
  
  /**
   * Get the mock Netlify service
   */
  getMockNetlifyService(): MockNetlifyDeploymentService {
    return MockNetlifyDeploymentService.getInstance();
  }
}

export default MockDeploymentServiceFactory;