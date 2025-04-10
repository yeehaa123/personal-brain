import { describe, expect, test } from 'bun:test';

import { 
  BaseDeploymentService,
  type DeploymentResult,
  DeploymentServiceFactory,
} from '@/mcp/contexts/website/services/deploymentService';

// Test implementation of BaseDeploymentService
class TestDeploymentService extends BaseDeploymentService {
  getProviderName(): string {
    return 'TestProvider';
  }
  
  protected validateConfig(): void {
    const config = this.config;
    if (!config.token) {
      throw new Error('Token is required');
    }
  }
  
  async deploy(): Promise<DeploymentResult> {
    return {
      success: true,
      message: 'Test deployment successful',
      url: 'https://test-site.example.com',
    };
  }
  
  async getSiteInfo() {
    return {
      siteId: 'test-site-id',
      url: 'https://test-site.example.com',
    };
  }
}

describe('BaseDeploymentService', () => {
  test('isConfigured should return false before initialization', () => {
    const service = new TestDeploymentService();
    expect(service.isConfigured()).toBe(false);
  });
  
  test('initialize should validate configuration', async () => {
    const service = new TestDeploymentService();
    
    // Invalid config missing token
    const invalidInitResult = await service.initialize({});
    expect(invalidInitResult).toBe(false);
    expect(service.isConfigured()).toBe(false);
    
    // Valid config with token
    const validInitResult = await service.initialize({ token: 'test-token' });
    expect(validInitResult).toBe(true);
    expect(service.isConfigured()).toBe(true);
  });
});

describe('DeploymentServiceFactory', () => {
  test('getInstance should return a singleton instance', () => {
    const factory1 = DeploymentServiceFactory.getInstance();
    const factory2 = DeploymentServiceFactory.getInstance();
    
    expect(factory1).toBe(factory2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const factory1 = DeploymentServiceFactory.getInstance();
    DeploymentServiceFactory.resetInstance();
    const factory2 = DeploymentServiceFactory.getInstance();
    
    expect(factory1).not.toBe(factory2);
  });
  
  test('createFresh should return a new instance', () => {
    const factory1 = DeploymentServiceFactory.getInstance();
    const factory2 = DeploymentServiceFactory.createFresh();
    const factory3 = DeploymentServiceFactory.createFresh();
    
    expect(factory1).not.toBe(factory2);
    expect(factory2).not.toBe(factory3);
  });
  
  test('createDeploymentService should handle unknown provider types', async () => {
    const factory = DeploymentServiceFactory.createFresh();
    
    const service = await factory.createDeploymentService('unknown-provider');
    expect(service).toBeNull();
  });
});