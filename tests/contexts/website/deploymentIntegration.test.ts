/**
 * Integration tests for website deployment process
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { WebsiteContext } from '@/contexts';
import type { AstroContentService } from '@/contexts/website/services/astroContentService';
import { 
  DeploymentManagerFactory,
  type WebsiteDeploymentManager,
} from '@/contexts/website/services/deployment';
import { LocalDevDeploymentManager } from '@/contexts/website/services/deployment/localDevDeploymentManager';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/website/adapters/websiteStorageAdapter';
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';

// Mock environment variables
const originalEnv = { ...process.env };

describe('Website Deployment Integration', () => {
  let websiteContext: WebsiteContext;
  
  beforeEach(() => {
    // Reset singletons
    WebsiteContext.resetInstance();
    DeploymentManagerFactory.resetInstance();
    
    // Create a fresh context with mocked services
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const mockAstroService = MockAstroContentService.createFresh() as unknown as AstroContentService;
    
    websiteContext = WebsiteContext.createFresh({
      storage: mockStorage,
      astroContentService: mockAstroService,
    });
    
    // Mock the Astro build using Bun's mock
    websiteContext.buildWebsite = mock(() => Promise.resolve({
      success: true,
      message: 'Website built successfully',
      output: 'Build output',
    }));
  });
  
  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });
  
  test('should use LocalDevDeploymentManager when deployment type is local-dev', async () => {
    // Set up the configuration for local-dev
    const mockConfig = await websiteContext.getConfig();
    mockConfig.deployment.type = 'local-dev';
    await websiteContext.updateConfig(mockConfig);
    
    // Get the deployment manager
    const deploymentManager = await websiteContext.getDeploymentManager();
    
    // Should be an instance of LocalDevDeploymentManager
    expect(deploymentManager instanceof LocalDevDeploymentManager).toBe(true);
  });
  
  test('should use default deployment manager in server environment', async () => {
    // Set up the environment
    process.env['NODE_ENV'] = 'server';
    delete process.env['WEBSITE_DEPLOYMENT_TYPE'];
    
    // Override the websiteContext configuration
    const mockConfig = await websiteContext.getConfig();
    mockConfig.deployment.type = 'caddy'; // Force caddy deployment type
    await websiteContext.updateConfig(mockConfig);
    
    // Get the deployment manager
    const deploymentManager = await websiteContext.getDeploymentManager();
    
    // Verify it's not a LocalDevDeploymentManager
    expect(deploymentManager instanceof LocalDevDeploymentManager).toBe(false);
  });
  
  test('should respect WEBSITE_DEPLOYMENT_TYPE environment variable', async () => {
    // Set up the environment
    process.env['NODE_ENV'] = 'server';
    process.env['WEBSITE_DEPLOYMENT_TYPE'] = 'local-dev';
    
    // Get the deployment manager
    const deploymentManager = await websiteContext.getDeploymentManager();
    
    // Should be an instance of LocalDevDeploymentManager despite being in server environment
    expect(deploymentManager instanceof LocalDevDeploymentManager).toBe(true);
  });
  
  test('build and promote workflow should work end-to-end', async () => {
    // Set up the environment for testing
    process.env['NODE_ENV'] = 'test';
    
    // Create a mock deployment manager as a WebsiteDeploymentManager
    const mockDeploymentManager: WebsiteDeploymentManager = {
      getEnvironmentStatus: mock(() => Promise.resolve({
        environment: 'preview' as const,
        buildStatus: 'Built' as const,
        fileCount: 42,
        serverStatus: 'Running' as const,
        domain: 'localhost:4321',
        accessStatus: 'Accessible',
        url: 'http://localhost:4321',
      })),
      
      promoteToLive: mock(() => Promise.resolve({
        success: true,
        message: 'Preview successfully promoted to live site (42 files). Available at http://localhost:4322 (development mode)',
        url: 'http://localhost:4322',
      })),
    };
    
    // Set the deployment manager directly for testing
    websiteContext.setDeploymentManagerForTesting(mockDeploymentManager);
    
    // Build the website
    const buildResult = await websiteContext.handleWebsiteBuild();
    expect(buildResult.success).toBe(true);
    expect(buildResult.message).toBe('Website built successfully. Available at http://localhost:4321 (development mode)');
    
    // Promote to production
    const promoteResult = await websiteContext.handleWebsitePromote();
    expect(promoteResult.success).toBe(true);
    expect(promoteResult.message).toContain('successfully promoted to live site');
    expect(promoteResult.url).toBe('http://localhost:4322');
    
    // Verify the deployment manager was called
    expect(mockDeploymentManager.promoteToLive).toHaveBeenCalled();
  });
  
  test('should handle build failure correctly', async () => {
    // Mock a build failure
    websiteContext.buildWebsite = mock(() => Promise.resolve({
      success: false,
      message: 'Build failed',
      output: 'Error output',
    }));
    
    // Try to build
    const buildResult = await websiteContext.handleWebsiteBuild();
    
    // Should report the failure
    expect(buildResult.success).toBe(false);
    expect(buildResult.message).toContain('Failed to build website');
  });
  
  test('should handle promotion failure correctly', async () => {
    // Get the deployment manager
    const deploymentManager = await websiteContext.getDeploymentManager();
    
    // Mock a promotion failure
    deploymentManager.promoteToLive = mock(() => Promise.resolve({
      success: false,
      message: 'Promotion failed: No files to promote',
    }));
    
    // Try to promote
    const promoteResult = await websiteContext.handleWebsitePromote();
    
    // Should report the failure
    expect(promoteResult.success).toBe(false);
    expect(promoteResult.message).toBe('Promotion failed: No files to promote');
  });
  
  test('status command reports correct environment status', async () => {
    // Get the deployment manager
    const deploymentManager = await websiteContext.getDeploymentManager();
    
    // Mock environment status
    deploymentManager.getEnvironmentStatus = mock((env: 'preview' | 'live') => {
      if (env === 'preview') {
        return Promise.resolve({
          environment: env,
          buildStatus: 'Built' as const,
          fileCount: 42,
          serverStatus: 'Running' as const,
          domain: 'localhost:4321',
          accessStatus: 'Accessible',
          url: 'http://localhost:4321',
        });
      } else {
        return Promise.resolve({
          environment: env,
          buildStatus: 'Not Built' as const,
          fileCount: 0,
          serverStatus: 'Running' as const,
          domain: 'localhost:4322',
          accessStatus: 'Not Accessible',
          url: 'http://localhost:4322',
        });
      }
    });
    
    // Check preview status
    const previewStatus = await websiteContext.handleWebsiteStatus('preview');
    expect(previewStatus.success).toBe(true);
    expect(previewStatus.data?.environment).toBe('preview');
    expect(previewStatus.data?.buildStatus).toBe('Built');
    expect(previewStatus.data?.fileCount).toBe(42);
    
    // Check live status
    const liveStatus = await websiteContext.handleWebsiteStatus('live');
    expect(liveStatus.success).toBe(true);
    expect(liveStatus.data?.environment).toBe('live');
    expect(liveStatus.data?.buildStatus).toBe('Not Built');
    expect(liveStatus.data?.fileCount).toBe(0);
  });
});