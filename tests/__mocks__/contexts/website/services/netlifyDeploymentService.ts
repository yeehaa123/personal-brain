import { mock } from 'bun:test';

import type { DeploymentConfig, DeploymentResult, DeploymentServiceTestHelpers } from '@/mcp/contexts/website/services/deploymentService';

/**
 * Mock implementation of NetlifyDeploymentService for testing
 */
export class MockNetlifyDeploymentService implements DeploymentServiceTestHelpers {
  private static instance: MockNetlifyDeploymentService | null = null;
  private isInitialized = false;
  private config: DeploymentConfig = {};
  
  // Mock state for testing
  private mockSiteInfo: { siteId: string; url: string } | null = null;
  private mockDeployResult: DeploymentResult | null = null;
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockNetlifyDeploymentService {
    if (!MockNetlifyDeploymentService.instance) {
      MockNetlifyDeploymentService.instance = new MockNetlifyDeploymentService();
    }
    return MockNetlifyDeploymentService.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockNetlifyDeploymentService.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockNetlifyDeploymentService {
    return new MockNetlifyDeploymentService();
  }
  
  /**
   * Get the name of this deployment provider
   */
  getProviderName = mock(() => 'Netlify');
  
  /**
   * Initialize the deployment service with configuration
   */
  initialize = mock((config: DeploymentConfig) => {
    this.config = config;
    
    // Validate minimal required config
    if (!config.token) {
      return Promise.resolve(false);
    }
    
    if (!config.siteId && !config['siteName']) {
      return Promise.resolve(false);
    }
    
    this.isInitialized = true;
    return Promise.resolve(true);
  });
  
  /**
   * Check if the service is properly configured and can deploy
   */
  isConfigured = mock(() => this.isInitialized);
  
  /**
   * Deploy the website
   */
  deploy = mock((_sitePath: string) => {
    if (this.mockDeployResult) {
      return Promise.resolve(this.mockDeployResult);
    }
    
    if (!this.isInitialized) {
      return Promise.resolve({
        success: false,
        message: 'Not configured',
      });
    }
    
    return Promise.resolve({
      success: true,
      message: 'Deployed successfully',
      url: 'https://mock-deployment.netlify.app',
    });
  });
  
  /**
   * Get information about the deployed site
   */
  getSiteInfo = mock(() => {
    if (this.mockSiteInfo) {
      return Promise.resolve(this.mockSiteInfo);
    }
    
    if (!this.isInitialized || !this.config.siteId) {
      return Promise.resolve(null);
    }
    
    return Promise.resolve({
      siteId: this.config.siteId as string,
      url: `https://${this.config.siteId}.netlify.app`,
    });
  });
  
  /**
   * Set mock deploy result for testing
   */
  setDeploySuccess(success: boolean, url?: string): void {
    this.mockDeployResult = {
      success,
      message: success ? 'Deployment successful' : 'Deployment failed',
      url,
    };
  }
  
  /**
   * Set mock site info for testing
   */
  setSiteInfo(siteId: string, url: string): void {
    this.mockSiteInfo = { siteId, url };
  }
}

export default MockNetlifyDeploymentService;