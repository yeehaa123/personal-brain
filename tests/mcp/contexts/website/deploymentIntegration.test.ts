import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import type { AstroContentService } from '@/mcp/contexts/website/services/astroContentService';
import type { DeploymentServiceFactory } from '@/mcp/contexts/website/services/deploymentService';
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockDeploymentServiceFactory } from '@test/__mocks__/contexts/website/services/deploymentServiceFactory';
import { MockNetlifyDeploymentService } from '@test/__mocks__/contexts/website/services/netlifyDeploymentService';

// We'll inject the mock deployment service factory directly in the tests

describe('WebsiteContext Deployment Integration', () => {
  let context: WebsiteContext;
  let mockAstroService: MockAstroContentService;
  let mockDeploymentFactory: MockDeploymentServiceFactory;
  let mockNetlifyService: MockNetlifyDeploymentService;
  
  beforeEach(() => {
    // Reset all mocks
    WebsiteContext.resetInstance();
    MockDeploymentServiceFactory.resetInstance();
    MockNetlifyDeploymentService.resetInstance();
    
    // Create fresh mocks
    mockAstroService = new MockAstroContentService();
    mockDeploymentFactory = MockDeploymentServiceFactory.getInstance();
    mockNetlifyService = mockDeploymentFactory.getMockNetlifyService();
    
    // Create the context with mocked services
    // Use type assertion to satisfy TypeScript while maintaining the interface at runtime
    context = WebsiteContext.createFresh({
      astroContentService: mockAstroService as unknown as AstroContentService,
      deploymentServiceFactory: mockDeploymentFactory as unknown as DeploymentServiceFactory,
    });
  });
  
  test('deployWebsite should configure and use the deployment service', async () => {
    // Set up test data
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
        buildDir: 'dist',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the build method to succeed
    const mockBuildResult = {
      success: true,
      message: 'Website built successfully',
      output: 'Build completed',
    };
    mockAstroService.runAstroCommand = mock(() => Promise.resolve(mockBuildResult));
    
    // Mock the deployment service
    mockNetlifyService.initialize = mock(() => Promise.resolve(true));
    mockNetlifyService.deploy = mock(() => Promise.resolve({
      success: true,
      message: 'Deployed successfully',
      url: 'https://test-site.netlify.app',
    }));
    
    // Deploy the website
    const result = await context.deployWebsite();
    
    // Verify results
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://test-site.netlify.app');
    
    // Verify the factory was used to create the right service
    expect(mockDeploymentFactory.createDeploymentService).toHaveBeenCalledWith('netlify');
    
    // Verify service was initialized with config
    expect(mockNetlifyService.initialize).toHaveBeenCalledWith(mockConfig.deploymentConfig);
    
    // Verify the site was built and deployed
    expect(mockAstroService.runAstroCommand).toHaveBeenCalledWith('build');
    expect(mockNetlifyService.deploy).toHaveBeenCalledWith('/path/to/astro');
  });
  
  test('deployWebsite should fail if build fails', async () => {
    // Set up test data
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the build method to fail
    const mockBuildResult = {
      success: false,
      message: 'Build failed',
      output: 'Error during build',
    };
    mockAstroService.runAstroCommand = mock(() => Promise.resolve(mockBuildResult));
    
    // Deploy the website
    const result = await context.deployWebsite();
    
    // Verify results
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to build website for deployment');
    
    // Verify the site was not deployed
    expect(mockNetlifyService.deploy).not.toHaveBeenCalled();
  });
  
  test('deployWebsite should fail if deployment service creation fails', async () => {
    // Set up test data with unknown deployment type
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      // Type assertion to the valid enum type to pass type checking
      // In reality we're testing behavior with an unknown type
      deploymentType: 'unknown' as 'netlify' | 'github' | 'local',
      deploymentConfig: {},
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the build method to succeed
    const mockBuildResult = {
      success: true,
      message: 'Website built successfully',
      output: 'Build completed',
    };
    mockAstroService.runAstroCommand = mock(() => Promise.resolve(mockBuildResult));
    
    // Mock the factory to return null for unknown provider
    mockDeploymentFactory.createDeploymentService = mock(() => Promise.resolve(null));
    
    // Deploy the website
    const result = await context.deployWebsite();
    
    // Verify results
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown deployment type');
    
    // Verify the factory was used with the unknown type
    expect(mockDeploymentFactory.createDeploymentService).toHaveBeenCalledWith('unknown');
  });
  
  test('deployWebsite should fail if deployment service initialization fails', async () => {
    // Set up test data with invalid config
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        // Missing required token
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the build method to succeed
    const mockBuildResult = {
      success: true,
      message: 'Website built successfully',
      output: 'Build completed',
    };
    mockAstroService.runAstroCommand = mock(() => Promise.resolve(mockBuildResult));
    
    // Mock the service initialization to fail
    mockNetlifyService.initialize = mock(() => Promise.resolve(false));
    
    // Deploy the website
    const result = await context.deployWebsite();
    
    // Verify results
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown deployment type');
    
    // Verify the service initialization was attempted
    expect(mockNetlifyService.initialize).toHaveBeenCalled();
    
    // Verify the site was not deployed
    expect(mockNetlifyService.deploy).not.toHaveBeenCalled();
  });
  
  test('deployWebsite should fail if deployment fails', async () => {
    // Set up test data
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the build method to succeed
    const mockBuildResult = {
      success: true,
      message: 'Website built successfully',
      output: 'Build completed',
    };
    mockAstroService.runAstroCommand = mock(() => Promise.resolve(mockBuildResult));
    
    // Mock the deployment service
    mockNetlifyService.initialize = mock(() => Promise.resolve(true));
    mockNetlifyService.deploy = mock(() => Promise.resolve({
      success: false,
      message: 'Deployment failed',
      logs: 'API error',
    }));
    
    // Deploy the website
    const result = await context.deployWebsite();
    
    // Verify results
    expect(result.success).toBe(false);
    expect(result.message).toContain('Deployment failed');
    
    // Verify deployment was attempted
    expect(mockNetlifyService.deploy).toHaveBeenCalled();
  });
  
  test('getDeploymentStatus should return site info from deployment service', async () => {
    // Set up test data
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the deployment service
    mockNetlifyService.initialize = mock(() => Promise.resolve(true));
    // Explicitly type the mock for getSiteInfo with non-null return
    mockNetlifyService.getSiteInfo = mock<() => Promise<{ siteId: string; url: string }>>(
      () => Promise.resolve({
        siteId: 'test-site-id',
        url: 'https://test-site.netlify.app',
      }),
    );
    
    // Get deployment status
    const result = await context.getDeploymentStatus();
    
    // Verify results
    expect(result.success).toBe(true);
    expect(result.isDeployed).toBe(true);
    expect(result.url).toBe('https://test-site.netlify.app');
    
    // Verify the factory was used to create the right service
    expect(mockDeploymentFactory.createDeploymentService).toHaveBeenCalledWith('netlify');
    
    // Verify service was initialized with config
    expect(mockNetlifyService.initialize).toHaveBeenCalledWith(mockConfig.deploymentConfig);
    
    // Verify getSiteInfo was called
    expect(mockNetlifyService.getSiteInfo).toHaveBeenCalled();
  });
  
  test('getDeploymentStatus should handle case when site is not deployed', async () => {
    // Set up test data
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the deployment service
    mockNetlifyService.initialize = mock(() => Promise.resolve(true));
    // Explicitly type the mock to ensure correct return type
    mockNetlifyService.getSiteInfo = mock<() => Promise<null>>(
      () => Promise.resolve(null),
    );
    
    // Get deployment status
    const result = await context.getDeploymentStatus();
    
    // Verify results
    expect(result.success).toBe(true);
    expect(result.isDeployed).toBe(false);
    expect(result.message).toContain('not currently deployed');
    
    // Verify getSiteInfo was called
    expect(mockNetlifyService.getSiteInfo).toHaveBeenCalled();
  });
  
  test('getDeploymentStatus should handle errors gracefully', async () => {
    // Set up test data
    const mockConfig = {
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://example.com',
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    // Configure the mock storage to return the test config
    const mockGetConfig = mock(() => Promise.resolve(mockConfig));
    context.getConfig = mockGetConfig;
    
    // Mock the deployment service to throw an error
    mockNetlifyService.initialize = mock(() => Promise.resolve(true));
    // Use Promise.reject with proper type annotation for Promise
    mockNetlifyService.getSiteInfo = mock<() => Promise<never>>(
      () => Promise.reject(new Error('API error')),
    );
    
    // Get deployment status
    const result = await context.getDeploymentStatus();
    
    // Verify results
    expect(result.success).toBe(false);
    expect(result.message).toContain('API error');
  });
});