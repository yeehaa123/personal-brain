/**
 * Tests for the ServerManager class
 */

import type * as fsPromises from 'fs/promises';
import type * as pathModule from 'path';

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { type DeploymentAdapter } from '@/mcp/contexts/website/adapters/deploymentAdapter';
import { ServerManager } from '@/mcp/contexts/website/services/serverManager';

// Create a minimal mock implementation of DeploymentAdapter
class MockDeploymentAdapter implements DeploymentAdapter {
  initialize = mock(() => Promise.resolve(true));
  startServer = mock(() => Promise.resolve(true));
  stopServer = mock(() => Promise.resolve(true));
  isServerRunning = mock((_env?: 'preview' | 'production') => Promise.resolve(false)); // Default to not running
  cleanup = mock(() => Promise.resolve());
  getDeploymentConfig = mock(() => ({
    type: 'local-dev',
    useReverseProxy: false,
    previewPort: 4321,
    productionPort: 4322,
    domain: 'example.com',
  }));
}

describe('ServerManager', () => {
  let mockAdapter: MockDeploymentAdapter;
  let fs: typeof fsPromises;
  let path: typeof pathModule;
  
  // Save original env vars to restore after tests
  const originalNodeEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    // Create a fresh mock adapter for each test
    mockAdapter = new MockDeploymentAdapter();
    
    // Reset ServerManager singleton
    ServerManager.resetInstance();
    
    // Reset environment variables to known values
    process.env.NODE_ENV = 'test';
  });
  
  afterEach(() => {
    // Reset singleton
    ServerManager.resetInstance();
    
    // Restore env vars
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  test('getInstance returns a singleton instance', () => {
    const instance1 = ServerManager.getInstance({ deploymentAdapter: mockAdapter });
    const instance2 = ServerManager.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('initialize calls initialize on the adapter', async () => {
    const serverManager = ServerManager.getInstance({ deploymentAdapter: mockAdapter });
    await serverManager.initialize();
    
    expect(mockAdapter.initialize).toHaveBeenCalled();
  });
  
  test('initialize should set up the server manager without starting servers', async () => {
    // Create a fresh server manager with the adapter
    const serverManager = ServerManager.createFresh({ deploymentAdapter: mockAdapter });
    await serverManager.initialize();
    
    // Initialize should be called but no servers should be auto-started
    // In hybrid Caddy approach, servers are managed externally
    expect(mockAdapter.initialize).toHaveBeenCalled();
    expect(mockAdapter.startServer).not.toHaveBeenCalled();
  });
  
  test('startServers doesnt start already running servers', async () => {
    // Create a new adapter for this test only
    const localMockAdapter = new MockDeploymentAdapter();
    
    // Mock servers as already running
    localMockAdapter.isServerRunning.mockImplementation(() => Promise.resolve(true));
    
    // Create a fresh server manager with the local adapter
    const serverManager = ServerManager.createFresh({ deploymentAdapter: localMockAdapter });
    await serverManager.startServers();
    
    // Should not start any servers when they're already running
    expect(localMockAdapter.startServer).not.toHaveBeenCalled();
  });
  
  test('stopServers stops servers if initialized', async () => {
    // Create a new adapter for this test only
    const localMockAdapter = new MockDeploymentAdapter();
    
    // Mock the stopServer method to return true (success)
    localMockAdapter.stopServer.mockImplementation(() => Promise.resolve(true));
    
    // Create a fresh server manager with the local adapter
    const serverManager = ServerManager.createFresh({ deploymentAdapter: localMockAdapter });
    
    // Initialize first (need to call because stopServers checks initialized flag)
    await serverManager.initialize();
    
    // Then stop servers
    await serverManager.stopServers();
    
    // Verify stopServer was called (we don't care about the exact parameters)
    expect(localMockAdapter.stopServer).toHaveBeenCalled();
  });
  
  test('cleanup method calls stopServers', async () => {
    // Create a new adapter for this test only
    const localMockAdapter = new MockDeploymentAdapter();
    
    // Create a fresh server manager with the local adapter
    const serverManager = ServerManager.createFresh({ deploymentAdapter: localMockAdapter });
    
    // Initialize first
    await serverManager.initialize();
    
    // Call cleanup
    await serverManager.cleanup();
    
    // Verify stopServer was called
    expect(localMockAdapter.stopServer).toHaveBeenCalled();
  });
  
  test('areServersRunning returns correct status for each server', async () => {
    // Create a new adapter for this test only
    const localMockAdapter = new MockDeploymentAdapter();
    
    // Mock different status for each environment
    localMockAdapter.isServerRunning.mockImplementation((env?: 'preview' | 'production') => {
      // Default to false if env is undefined
      return Promise.resolve(env === 'preview');
    });
    
    // Create a fresh server manager with the local adapter
    const serverManager = ServerManager.createFresh({ deploymentAdapter: localMockAdapter });
    const status = await serverManager.areServersRunning();
    
    // Should return the correct status for each environment
    expect(status).toEqual({ preview: true, production: false });
  });
  
  test('initialize ensures production directory exists with template', async () => {
    // Import necessary modules
    fs = await import('fs/promises');
    path = await import('path');
    
    // Clean up any existing test production directory
    const testProdDir = path.join(process.cwd(), 'dist', 'test-production');
    try {
      await fs.rm(testProdDir, { recursive: true, force: true });
    } catch (_error) {
      // Directory might not exist, which is fine
    }
    
    // Create a server manager that will use our test directory
    const serverManager = ServerManager.createFresh({ deploymentAdapter: mockAdapter });
    
    // Call the private ensureProductionDirectory method using a workaround
    // @ts-expect-error - accessing private method for testing
    await serverManager.ensureProductionDirectory(testProdDir);
    
    // Check that the directory was created
    const dirExists = await fs.stat(testProdDir).then(stats => stats.isDirectory()).catch(() => false);
    expect(dirExists).toBe(true);
    
    // Check that index.html was created
    const indexExists = await fs.stat(path.join(testProdDir, 'index.html')).then(() => true).catch(() => false);
    expect(indexExists).toBe(true);
    
    // Clean up
    await fs.rm(testProdDir, { recursive: true, force: true });
  });
});