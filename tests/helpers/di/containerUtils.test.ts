/**
 * Tests for containerUtils
 */
import { describe, expect, test } from 'bun:test';

import { SimpleContainer } from '@/utils/registry';

import { setupDependencyContainer } from './containerUtils';

describe('containerUtils', () => {
  test('setupDependencyContainer should return a container and cleanup function', () => {
    const { container, cleanup } = setupDependencyContainer();

    expect(container).toBeInstanceOf(SimpleContainer);
    expect(typeof cleanup).toBe('function');
  });

  test('container should allow registering and resolving services', () => {
    const { container, cleanup } = setupDependencyContainer();

    try {
      const mockService = { test: 'value' };
      container.register('test', () => mockService);
      
      const resolved = container.resolve('test');
      expect(resolved).toBe(mockService);
    } finally {
      cleanup();
    }
  });

  test('cleanup should clear the container', () => {
    const { container, cleanup } = setupDependencyContainer();

    container.register('test', () => ({ test: 'value' }));
    expect(container.has('test')).toBe(true);
    
    cleanup();
    
    expect(container.has('test')).toBe(false);
  });
});