import fs from 'fs/promises';

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import type { AstroContentService } from '@/mcp/contexts/website/services/astroContentService';
import { DeploymentServiceFactory } from '@/mcp/contexts/website/services/deploymentService';
import { NetlifyDeploymentService } from '@/mcp/contexts/website/services/netlifyDeploymentService';

/**
 * This test demonstrates the full end-to-end flow for Netlify deployment
 * using real service implementations but with mocked API calls.
 * 
 * To run these tests specifically, use:
 * ENABLE_INTEGRATION_TESTS=1 bun test tests/mcp/contexts/website/netlifyDeploymentIntegration.test.ts
 * 
 * These tests are skipped by default since they're more extensive integration tests
 * that aren't necessary to run in every test suite run.
 */

// Skip these tests by default as they're integration tests
const shouldRunTests = process.env['ENABLE_INTEGRATION_TESTS'] === '1';
const describeOrSkip = shouldRunTests ? describe : describe.skip;

describeOrSkip('Netlify Deployment Integration', () => {
  // Create actual service instances
  let websiteContext: WebsiteContext;
  let astroContentService: AstroContentService;
  
  // Store original fs methods for restoration in afterEach
  let originalAccess: typeof fs.access;
  let originalReaddir: typeof fs.readdir;
  let originalReadFile: typeof fs.readFile;
  
  beforeEach(() => {
    // Reset all singletons to ensure test isolation
    WebsiteContext.resetInstance();
    DeploymentServiceFactory.resetInstance();
    NetlifyDeploymentService.resetInstance();
    
    // Reset the service to ensure clean state
    NetlifyDeploymentService.resetInstance();
    
    // Mock the fetch API and file system operations
    global.fetch = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        site_id: 'test-site-id',
        ssl_url: 'https://test-site.netlify.app',
        url: 'http://test-site.netlify.app',
      }),
      headers: new Headers(),
      redirected: false,
      statusText: 'OK',
      type: 'basic',
      url: 'https://api.netlify.com',
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response));
    
    // Mock AstroContentService
    astroContentService = {} as AstroContentService;
    astroContentService.runAstroCommand = mock(() => Promise.resolve({
      success: true,
      message: 'Website built successfully',
      output: 'Build completed',
    }));
    
    // Create website context with mocked services
    websiteContext = WebsiteContext.createFresh({
      astroContentService: astroContentService as AstroContentService,
    });
    
    // Save original fs methods
    originalAccess = fs.access;
    originalReaddir = fs.readdir;
    originalReadFile = fs.readFile;
    
    // Mock file system access for netlify service
    fs.access = mock(() => Promise.resolve(undefined));
    
    fs.readdir = mock((_, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          {
            name: 'index.html',
            isDirectory: () => false,
          },
        ]);
      }
      return Promise.resolve(['index.html'] as string[]);
    }) as unknown as typeof fs.readdir;
    
    fs.readFile = mock(() => Promise.resolve(Buffer.from('<html>Test</html>'))) as unknown as typeof fs.readFile;
  });
  
  afterEach(() => {
    // Reset services for the next test
    WebsiteContext.resetInstance();
    DeploymentServiceFactory.resetInstance();
    NetlifyDeploymentService.resetInstance();
    
    // Restore original fs methods
    fs.access = originalAccess;
    fs.readdir = originalReaddir;
    fs.readFile = originalReadFile;
  });
  
  test('End-to-end Netlify deployment flow', async () => {
    // Step 1: Initialize website context
    await websiteContext.initialize();
    expect(websiteContext.isReady()).toBe(true);
    
    // Step 2: Set up deployment configuration
    const deploymentConfig = {
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
        buildDir: 'dist',
      },
      astroProjectPath: '/path/to/astro',
    };
    
    await websiteContext.updateConfig(deploymentConfig);
    
    // Step 3: Build the website
    const buildResult = await websiteContext.buildWebsite();
    expect(buildResult.success).toBe(true);
    expect(astroContentService.runAstroCommand).toHaveBeenCalledWith('build');
    
    // Step 4: Deploy the website
    const deployResult = await websiteContext.deployWebsite();
    expect(deployResult.success).toBe(true);
    expect(deployResult.url).toBeDefined();
    expect(global.fetch).toHaveBeenCalled();
    
    // Step 5: Check deployment status
    const statusResult = await websiteContext.getDeploymentStatus();
    expect(statusResult.success).toBe(true);
    expect(statusResult.isDeployed).toBe(true);
    expect(statusResult.provider).toBe('Netlify');
    expect(statusResult.url).toBe('https://test-site.netlify.app');
  });
  
  test('Should handle build failures gracefully', async () => {
    // Initialize and configure
    await websiteContext.initialize();
    await websiteContext.updateConfig({
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
    });
    
    // Mock build failure
    astroContentService.runAstroCommand = mock(() => Promise.resolve({
      success: false,
      message: 'Build failed',
      output: 'Error: Failed to build site',
    }));
    
    // Attempt to deploy
    const deployResult = await websiteContext.deployWebsite();
    
    // Verify it handles the failure gracefully
    expect(deployResult.success).toBe(false);
    expect(deployResult.message).toContain('Failed to build website for deployment');
  });
  
  test('Should handle deployment service configuration issues', async () => {
    // Initialize and configure with invalid token
    await websiteContext.initialize();
    await websiteContext.updateConfig({
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        // Missing token should cause initialization failure
        siteId: 'test-site-id',
      },
    });
    
    // Mock successful build but failing deployment service init
    astroContentService.runAstroCommand = mock(() => Promise.resolve({
      success: true,
      message: 'Build successful',
      output: 'Build completed',
    }));
    
    // Override NetlifyDeploymentService.prototype.initialize
    const originalInitialize = NetlifyDeploymentService.prototype.initialize;
    NetlifyDeploymentService.prototype.initialize = mock(() => Promise.resolve(false));
    
    try {
      // Attempt to deploy
      const deployResult = await websiteContext.deployWebsite();
      
      // Verify error handling
      expect(deployResult.success).toBe(false);
      expect(deployResult.message).toContain('Unknown deployment type');
    } finally {
      // Restore original method
      NetlifyDeploymentService.prototype.initialize = originalInitialize;
    }
  });
  
  test('Should handle API errors during deployment', async () => {
    // Initialize and configure
    await websiteContext.initialize();
    await websiteContext.updateConfig({
      deploymentType: 'netlify' as const,
      deploymentConfig: {
        token: 'test-token',
        siteId: 'test-site-id',
      },
    });
    
    // Mock build success
    astroContentService.runAstroCommand = mock(() => Promise.resolve({
      success: true,
      message: 'Build successful',
      output: 'Build completed',
    }));
    
    // Mock API error
    global.fetch = mock(() => Promise.resolve({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Invalid API token' }),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: 'https://api.netlify.com',
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response));
    
    // Attempt to deploy
    const deployResult = await websiteContext.deployWebsite();
    
    // Verify error handling
    expect(deployResult.success).toBe(false);
    expect(deployResult.message).toMatch(/Invalid API token|token/i);
  });
});