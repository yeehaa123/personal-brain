import { describe, expect, test } from 'bun:test';

import { 
  getDeploymentAdapter, 
  PM2DeploymentAdapter, 
} from '@/contexts/website/adapters/deploymentAdapter';

describe('DeploymentAdapter', () => {
  test('getDeploymentAdapter should return a deployment adapter', () => {
    const adapter = getDeploymentAdapter();
    expect(adapter).toBeDefined();
    expect(typeof adapter.initialize).toBe('function');
    expect(typeof adapter.startServer).toBe('function');
    expect(typeof adapter.stopServer).toBe('function');
    expect(typeof adapter.isServerRunning).toBe('function');
  });
  
  test('PM2DeploymentAdapter should provide deployment configuration', () => {
    const adapter = PM2DeploymentAdapter.getInstance();
    const config = adapter.getDeploymentConfig();
    
    expect(config.type).toBeDefined();
    expect(config.useReverseProxy).toBeDefined();
    expect(config.previewPort).toBeDefined();
    expect(config.livePort).toBeDefined();
    expect(config.domain).toBeDefined();
  });
});