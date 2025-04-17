/**
 * Tests for the deployment adapter
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { 
  getDeploymentAdapter, 
  PM2DeploymentAdapter, 
} from '@/contexts/website/adapters/deploymentAdapter';
import { WebsiteContext } from '@/contexts/website/core/websiteContext';
import { LocalDevDeploymentManager } from '@/contexts/website/services/deployment/localDevDeploymentManager';
import { MockDeploymentAdapter } from '@test/__mocks__/contexts/website/adapters/deploymentAdapter';

describe('DeploymentAdapter', () => {
  test('getDeploymentAdapter should return a deployment adapter', () => {
    const adapter = getDeploymentAdapter();
    expect(adapter).toBeInstanceOf(PM2DeploymentAdapter);
  });
  
  test('PM2DeploymentAdapter should implement DeploymentAdapter interface', () => {
    const adapter = new PM2DeploymentAdapter();
    expect(typeof adapter.initialize).toBe('function');
    expect(typeof adapter.startServer).toBe('function');
    expect(typeof adapter.stopServer).toBe('function');
    expect(typeof adapter.isServerRunning).toBe('function');
    expect(typeof adapter.cleanup).toBe('function');
    expect(typeof adapter.getDeploymentConfig).toBe('function');
  });
  
  test('PM2DeploymentAdapter getDeploymentConfig should return configuration', () => {
    const adapter = new PM2DeploymentAdapter();
    const config = adapter.getDeploymentConfig();
    expect(config).toHaveProperty('type');
    expect(config).toHaveProperty('useReverseProxy');
    expect(config).toHaveProperty('previewPort');
    expect(config).toHaveProperty('productionPort');
    expect(config).toHaveProperty('domain');
  });
});

describe('LocalDevDeploymentManager with DeploymentAdapter', () => {
  let mockAdapter: MockDeploymentAdapter;
  let manager: LocalDevDeploymentManager;
  
  beforeEach(() => {
    mockAdapter = MockDeploymentAdapter.createFresh();
    manager = new LocalDevDeploymentManager({
      deploymentAdapter: mockAdapter,
    });
  });
  
  test('startServers should use the deployment adapter', async () => {
    // Call startServers
    await manager.startServers();
    
    // Verify the adapter methods were called
    expect(mockAdapter.initialize).toHaveBeenCalled();
    expect(mockAdapter.startServer).toHaveBeenCalledTimes(2);
  });
  
  test('stopServers should use the deployment adapter', async () => {
    // Call stopServers
    await manager.stopServers();
    
    // Verify the adapter methods were called
    expect(mockAdapter.initialize).toHaveBeenCalled();
    expect(mockAdapter.stopServer).toHaveBeenCalledTimes(2);
  });
  
  test('getEnvironmentStatus should use the deployment adapter', async () => {
    // Set up the adapter
    mockAdapter.setServerRunning('preview', true);
    
    // Call getEnvironmentStatus
    const status = await manager.getEnvironmentStatus('preview');
    
    // Verify the adapter methods were called
    expect(mockAdapter.initialize).toHaveBeenCalled();
    expect(mockAdapter.isServerRunning).toHaveBeenCalledWith('preview');
    
    // Check the status
    expect(status.serverStatus).toBe('Running');
  });
});

describe('WebsiteContext cleanup', () => {
  // Mock stopServers function to test if it's called during cleanup
  const stopServersMock = mock(() => Promise.resolve());
  const managerMock = {
    stopServers: stopServersMock,
  } as unknown as { stopServers(): Promise<void> };
  
  test('resetInstance should stop servers when cleaning up', () => {
    // Create a context instance with our mock manager
    const context = WebsiteContext.createFresh();
    
    // Replace the deploymentManager property with our mock
    Object.defineProperty(context, 'deploymentManager', {
      value: managerMock,
      writable: true,
    });
    
    // Set the singleton instance to our context
    // @ts-expect-error - Accessing private static property
    WebsiteContext.instance = context;
    
    // Reset the instance, which should call the stopServers method
    WebsiteContext.resetInstance();
    
    // Verify the stopServers method was called
    expect(stopServersMock).toHaveBeenCalled();
  });
});