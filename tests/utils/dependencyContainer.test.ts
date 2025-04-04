/**
 * Tests for the dependency injection container
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { createContainer, DependencyContainer } from '@/utils/dependencyContainer';

// Test sample services
interface Service1 {
  name: string;
  getValue(): string;
}

interface Service2 {
  service1: Service1;
  getMessage(): string;
}

class TestService1 implements Service1 {
  name = 'TestService1';
  constructor(private value: string = 'default') {}
  
  getValue(): string {
    return this.value;
  }
}

class TestService2 implements Service2 {
  constructor(public service1: Service1) {}
  
  getMessage(): string {
    return `Service2 with dependency ${this.service1.getValue()}`;
  }
}

describe('DependencyContainer', () => {
  let container: DependencyContainer;
  
  beforeEach(() => {
    container = createContainer();
  });
  
  test('should register and resolve a service', () => {
    container.register<Service1>('service1', () => new TestService1());
    
    const service = container.resolve<Service1>('service1');
    
    expect(service).toBeInstanceOf(TestService1);
    expect(service.getValue()).toBe('default');
  });
  
  test('should handle service dependencies', () => {
    container.register<Service1>('service1', () => new TestService1('custom'));
    container.register<Service2>('service2', (c) => new TestService2(c.resolve('service1')));
    
    const service2 = container.resolve<Service2>('service2');
    
    expect(service2).toBeInstanceOf(TestService2);
    expect(service2.service1).toBeInstanceOf(TestService1);
    expect(service2.getMessage()).toBe('Service2 with dependency custom');
  });
  
  test('should create singleton by default', () => {
    container.register<Service1>('service1', () => new TestService1());
    
    const instance1 = container.resolve<Service1>('service1');
    const instance2 = container.resolve<Service1>('service1');
    
    expect(instance1).toBe(instance2); // Same instance
  });
  
  test('should create new instances when singleton is false', () => {
    container.register<Service1>('service1', () => new TestService1(), false);
    
    const instance1 = container.resolve<Service1>('service1');
    const instance2 = container.resolve<Service1>('service1');
    
    expect(instance1).not.toBe(instance2); // Different instances
  });
  
  test('should throw error when resolving unregistered service', () => {
    expect(() => container.resolve('unknown')).toThrow('Service \'unknown\' is not registered');
  });
  
  test('should check if service is registered', () => {
    container.register('service1', () => ({}));
    
    expect(container.has('service1')).toBe(true);
    expect(container.has('unknown')).toBe(false);
  });
  
  test('should unregister a service', () => {
    container.register('service1', () => ({}));
    expect(container.has('service1')).toBe(true);
    
    container.unregister('service1');
    expect(container.has('service1')).toBe(false);
  });
  
  test('should clear all services', () => {
    container.register('service1', () => ({}));
    container.register('service2', () => ({}));
    
    container.clear();
    
    expect(container.has('service1')).toBe(false);
    expect(container.has('service2')).toBe(false);
  });
  
  test('should override service when registering with same name', () => {
    container.register<Service1>('service', () => new TestService1('first'));
    container.register<Service1>('service', () => new TestService1('second'));
    
    const service = container.resolve<Service1>('service');
    expect(service.getValue()).toBe('second');
  });
});