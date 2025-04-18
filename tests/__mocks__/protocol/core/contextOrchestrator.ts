/**
 * Mock ContextOrchestrator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type { IContextManager } from '@/protocol/types';

/**
 * Mock ContextOrchestrator for testing protocol layer
 */
export class MockContextOrchestrator {
  private static instance: MockContextOrchestrator | null = null;
  private ready = true;
  private contextManager: IContextManager = {
    getMockContext: () => 'mock-context',
  } as unknown as IContextManager;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockContextOrchestrator {
    if (!MockContextOrchestrator.instance) {
      MockContextOrchestrator.instance = new MockContextOrchestrator(options);
    }
    return MockContextOrchestrator.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContextOrchestrator.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockContextOrchestrator {
    return new MockContextOrchestrator(options);
  }
  
  private constructor(options?: Record<string, unknown>) {
    // Set up with options if provided
    if (options && typeof options['ready'] === 'boolean') {
      this.ready = options['ready'] as boolean;
    }
    
    if (options && options['contextManager']) {
      this.contextManager = options['contextManager'] as IContextManager;
    }
  }
  
  /**
   * Check if all contexts are ready
   */
  areContextsReady(): boolean { 
    return this.ready; 
  }
  
  /**
   * Get the context manager
   */
  getContextManager(): IContextManager { 
    return this.contextManager; 
  }
  
  /**
   * For testing - set the ready state
   */
  setReady(ready: boolean): void { 
    this.ready = ready; 
  }
}