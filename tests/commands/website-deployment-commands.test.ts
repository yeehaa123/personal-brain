import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { WebsiteCommandHandler } from '@/commands/handlers/websiteCommands';
import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import type { BrainProtocol } from '@/mcp/protocol';

// Mock the brain protocol
const mockBrainProtocol = {
  getWebsiteContext: mock(() => WebsiteContext.getInstance()),
} as unknown as BrainProtocol;

describe('WebsiteCommandHandler Deployment Commands', () => {
  let handler: WebsiteCommandHandler;
  let websiteContext: WebsiteContext;
  
  beforeEach(() => {
    // Reset mocks and instances
    WebsiteCommandHandler.resetInstance();
    WebsiteContext.resetInstance();
    
    // Create fresh instances
    handler = WebsiteCommandHandler.createFresh(mockBrainProtocol);
    websiteContext = WebsiteContext.createFresh();
    
    // Configure the mock brain protocol to return our website context
    mockBrainProtocol.getWebsiteContext = mock(() => websiteContext);
    
    // Set context as ready
    websiteContext.setReadyState(true);
  });
  
  describe('website-deploy command', () => {
    test('should handle website deployment', async () => {
      // Mock the deployWebsite method
      websiteContext.deployWebsite = mock(() => Promise.resolve({
        success: true,
        message: 'Deployment successful',
        url: 'https://test-site.example.com',
      }));
      
      // Execute the deploy command
      const result = await handler.execute('website-deploy', '');
      
      // Verify results
      expect(result.type).toBe('website-deploy');
      
      // Type assertion for website-deploy result
      if (result.type === 'website-deploy') {
        expect(result.success).toBe(true);
        // Message format has changed to be more informative
        // The message now includes notes about cache and status checking
        expect(result.message).toContain('Deployment successful');
        expect(result.url).toBe('https://test-site.example.com');
      }
      
      // Verify deployWebsite was called
      expect(websiteContext.deployWebsite).toHaveBeenCalled();
    });
    
    test('should handle deployment failures', async () => {
      // Mock the deployWebsite method to fail
      websiteContext.deployWebsite = mock(() => Promise.resolve({
        success: false,
        message: 'Deployment failed: API error',
      }));
      
      // Execute the deploy command
      const result = await handler.execute('website-deploy', '');
      
      // Verify results
      expect(result.type).toBe('website-deploy');
      
      // Type assertion for website-deploy result
      if (result.type === 'website-deploy') {
        expect(result.success).toBe(false);
        expect(result.message).toContain('Deployment failed');
      }
    });
    
    test('should fail if website context is not ready', async () => {
      // Set context as not ready
      websiteContext.setReadyState(false);
      
      // Execute the deploy command
      const result = await handler.execute('website-deploy', '');
      
      // Verify results
      expect(result.type).toBe('website-deploy');
      
      // Type assertion for website-deploy result
      if (result.type === 'website-deploy') {
        expect(result.success).toBe(false);
        expect(result.message).toContain('not initialized');
      }
    });
  });
  
  describe('website-deployment-status command', () => {
    test('should return deployment status', async () => {
      // Mock the getDeploymentStatus method
      websiteContext.getDeploymentStatus = mock(() => Promise.resolve({
        success: true,
        isDeployed: true,
        url: 'https://test-site.example.com',
        provider: 'S3',
      }));
      
      // Execute the status command
      const result = await handler.execute('website-deployment-status', '');
      
      // Verify results
      expect(result.type).toBe('website-deployment-status');
      
      // Type assertion for website-deployment-status result
      if (result.type === 'website-deployment-status') {
        expect(result.success).toBe(true);
        expect(result.isDeployed).toBe(true);
        expect(result.url).toBe('https://test-site.example.com');
        expect(result.provider).toBe('S3');
      }
      
      // Verify getDeploymentStatus was called
      expect(websiteContext.getDeploymentStatus).toHaveBeenCalled();
    });
    
    test('should handle case when site is not deployed', async () => {
      // Mock the getDeploymentStatus method
      websiteContext.getDeploymentStatus = mock(() => Promise.resolve({
        success: true,
        isDeployed: false,
        message: 'Site is not currently deployed',
      }));
      
      // Execute the status command
      const result = await handler.execute('website-deployment-status', '');
      
      // Verify results
      expect(result.type).toBe('website-deployment-status');
      
      // Type assertion for website-deployment-status result
      if (result.type === 'website-deployment-status') {
        expect(result.success).toBe(true);
        expect(result.isDeployed).toBe(false);
        expect(result.message).toContain('not currently deployed');
      }
    });
    
    test('should handle status check failures', async () => {
      // Mock the getDeploymentStatus method to fail
      websiteContext.getDeploymentStatus = mock(() => Promise.resolve({
        success: false,
        isDeployed: false,
        message: 'Failed to check deployment status',
      }));
      
      // Execute the status command
      const result = await handler.execute('website-deployment-status', '');
      
      // Verify results
      expect(result.type).toBe('website-deployment-status');
      
      // Type assertion for website-deployment-status result
      if (result.type === 'website-deployment-status') {
        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to check deployment status');
      }
    });
  });
  
  // Note: Tests for website-deployment-config command have been removed as the command
  // has been consolidated with website-config for a more streamlined interface.
});