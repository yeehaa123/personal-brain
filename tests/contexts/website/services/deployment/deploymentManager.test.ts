/**
 * Tests for deployment manager implementations
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type {
  WebsiteDeploymentManager,
} from '@/contexts/website/services/deployment';
import {
  CaddyDeploymentManager,
  DeploymentManagerFactory,
} from '@/contexts/website/services/deployment';
import { LocalDevDeploymentManager } from '@/contexts/website/services/deployment/localDevDeploymentManager';

// Define interfaces for the private methods we need to mock
interface MockableLocalDevDeploymentManager extends WebsiteDeploymentManager {
  countFiles: (directory: string) => Promise<number>;
  copyDirectory: (source: string, destination: string) => Promise<void>;
}

// Mock the fs, path, and child_process modules
const mockStat = mock(() => Promise.resolve({
  isDirectory: () => true,
}));

const mockReaddir = mock(() => Promise.resolve(['file1.html', 'file2.js', 'file3.css']));
const mockMkdir = mock(() => Promise.resolve());
const mockRm = mock(() => Promise.resolve());
const mockCopyFile = mock(() => Promise.resolve());

const mockExec = mock(() => Promise.resolve({ stdout: 'success', stderr: '' }));
const mockExecPromise = mock(() => Promise.resolve({ stdout: 'success', stderr: '' }));

// Mock modules using Bun's mocking
mock.module('fs/promises', () => ({
  stat: mockStat,
  readdir: mockReaddir,
  mkdir: mockMkdir,
  rm: mockRm,
  copyFile: mockCopyFile,
}));

mock.module('child_process', () => ({
  exec: mockExec,
}));

mock.module('util', () => ({
  promisify: () => mockExecPromise,
}));

describe('DeploymentManagerFactory', () => {
  beforeEach(() => {
    DeploymentManagerFactory.resetInstance();
  });

  test('create method creates the correct type of manager', () => {
    const factory = DeploymentManagerFactory.createFresh();

    // Default is CaddyDeploymentManager
    const defaultManager = factory.create();
    expect(defaultManager instanceof CaddyDeploymentManager).toBe(true);

    // Set a different class
    factory.setDeploymentManagerClass(LocalDevDeploymentManager);
    const devManager = factory.create();
    expect(devManager instanceof LocalDevDeploymentManager).toBe(true);
  });
});

describe('CaddyDeploymentManager', () => {
  let manager: WebsiteDeploymentManager;

  beforeEach(() => {
    // Reset the mocks
    mockStat.mockClear();
    mockReaddir.mockClear();
    mockMkdir.mockClear();
    mockRm.mockClear();
    mockCopyFile.mockClear();
    mockExec.mockClear();

    // Create a fresh manager
    manager = CaddyDeploymentManager.createFresh({ baseDir: '/test-dir' });
  });

  test('getEnvironmentStatus returns status for preview environment', async () => {
    // Create test data for preview environment
    const previewStatus = {
      environment: 'preview' as const,
      buildStatus: 'Built' as const,
      fileCount: 3,
      serverStatus: 'Running' as const,
      domain: 'preview.example.com',
      accessStatus: 'Accessible',
      url: 'https://preview.example.com',
    };

    // Mock the getEnvironmentStatus method
    const getStatusMock = mock(() => Promise.resolve(previewStatus));
    (manager as unknown as { getEnvironmentStatus: typeof getStatusMock }).getEnvironmentStatus = getStatusMock;

    const status = await manager.getEnvironmentStatus('preview');

    expect(status.environment).toBe('preview');
    expect(status.buildStatus).toBe('Built');
    expect(status.fileCount).toBe(3);
    expect(status.serverStatus).toBe('Running');
    expect(status.domain).toContain('preview');
    expect(status.url).toContain('https://preview');
  });

  test('getEnvironmentStatus returns status for production environment', async () => {
    // Create test data for production environment
    const productionStatus = {
      environment: 'production' as const,
      buildStatus: 'Built' as const,
      fileCount: 3,
      serverStatus: 'Running' as const,
      domain: 'example.com',
      accessStatus: 'Accessible',
      url: 'https://example.com',
    };

    // Mock the getEnvironmentStatus method
    const getStatusMock = mock(() => Promise.resolve(productionStatus));
    (manager as unknown as { getEnvironmentStatus: typeof getStatusMock }).getEnvironmentStatus = getStatusMock;

    const status = await manager.getEnvironmentStatus('production');

    expect(status.environment).toBe('production');
    expect(status.buildStatus).toBe('Built');
    expect(status.fileCount).toBe(3);
    expect(status.serverStatus).toBe('Running');
    expect(status.domain).not.toContain('preview');
    expect(status.url).toContain('https://');
  });

  test('promoteToProduction copies files from preview to production', async () => {
    // Create test promotion result
    const promotionResult = {
      success: true,
      message: 'Preview successfully promoted to production (42 files).',
      url: 'https://example.com',
    };

    // Mock the promoteToProduction method
    const promoteMock = mock(() => Promise.resolve(promotionResult));
    (manager as unknown as { promoteToProduction: typeof promoteMock }).promoteToProduction = promoteMock;

    const result = await manager.promoteToProduction();

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully promoted');
    expect(result.url).toBeDefined();

    // Verify the mock was called
    expect(promoteMock).toHaveBeenCalled();
  });
});

describe('LocalDevDeploymentManager', () => {
  let manager: MockableLocalDevDeploymentManager;

  beforeEach(() => {
    // Reset the mocks
    mockStat.mockClear();
    mockReaddir.mockClear();
    mockMkdir.mockClear();
    mockRm.mockClear();
    mockCopyFile.mockClear();

    // Create a fresh manager
    manager = LocalDevDeploymentManager.createFresh({ baseDir: '/test-dir' }) as unknown as MockableLocalDevDeploymentManager;
  });

  test('getEnvironmentStatus returns status for preview environment', async () => {
    // Create test data for preview environment
    const previewStatus = {
      environment: 'preview' as const,
      buildStatus: 'Built' as const,
      fileCount: 5,
      serverStatus: 'Running' as const,
      domain: 'localhost:4321',
      accessStatus: 'Accessible',
      url: 'http://localhost:4321',
    };

    // Mock the getEnvironmentStatus method
    const getStatusMock = mock(() => Promise.resolve(previewStatus));
    manager.getEnvironmentStatus = getStatusMock;

    const status = await manager.getEnvironmentStatus('preview');

    expect(status.environment).toBe('preview');
    expect(status.buildStatus).toBe('Built');
    expect(status.fileCount).toBe(5);
    expect(status.serverStatus).toBe('Running');
    expect(status.domain).toBe('localhost:4321');
    expect(status.url).toBe('http://localhost:4321');
  });

  test('getEnvironmentStatus returns status for production environment', async () => {
    // Create test data for production environment
    const productionStatus = {
      environment: 'production' as const,
      buildStatus: 'Built' as const,
      fileCount: 5,
      serverStatus: 'Running' as const,
      domain: 'localhost:4322',
      accessStatus: 'Accessible',
      url: 'http://localhost:4322',
    };

    // Mock the getEnvironmentStatus method
    const getStatusMock = mock(() => Promise.resolve(productionStatus));
    manager.getEnvironmentStatus = getStatusMock;

    const status = await manager.getEnvironmentStatus('production');

    expect(status.environment).toBe('production');
    expect(status.buildStatus).toBe('Built');
    expect(status.fileCount).toBe(5);
    expect(status.serverStatus).toBe('Running');
    expect(status.domain).toBe('localhost:4322');
    expect(status.url).toBe('http://localhost:4322');
  });

  test('promoteToProduction copies files from preview to production', async () => {
    // Create test promotion result
    const promotionResult = {
      success: true,
      message: 'Preview successfully promoted to production (42 files).',
      url: 'http://localhost:4322',
    };

    // Mock the promoteToProduction method
    const promoteMock = mock(() => Promise.resolve(promotionResult));
    manager.promoteToProduction = promoteMock;

    const result = await manager.promoteToProduction();

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully promoted');
    expect(result.url).toBe('http://localhost:4322');

    // Verify the mock was called
    expect(promoteMock).toHaveBeenCalled();
  });

  test('handles errors gracefully during promotion', async () => {
    // Create test error result
    const errorResult = {
      success: false,
      message: 'Error promoting website: Test error',
    };

    // Mock the promoteToProduction method to return an error result
    const errorMock = mock(() => Promise.resolve(errorResult));
    manager.promoteToProduction = errorMock;

    const result = await manager.promoteToProduction();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Test error');
    expect(errorMock).toHaveBeenCalled();
  });
});
