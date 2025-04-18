/**
 * Mock StatusManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */

/**
 * Mock StatusManager for testing protocol layer
 */
export class MockStatusManager {
  private static instance: MockStatusManager | null = null;
  private ready = true;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockStatusManager {
    if (!MockStatusManager.instance) {
      MockStatusManager.instance = new MockStatusManager(options);
    }
    return MockStatusManager.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockStatusManager.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockStatusManager {
    return new MockStatusManager(options);
  }
  
  private constructor(options?: Record<string, unknown>) {
    // Set up with options if provided
    if (options && typeof options['ready'] === 'boolean') {
      this.ready = options['ready'] as boolean;
    }
  }
  
  /**
   * Check if the system is ready
   */
  isReady(): boolean {
    return this.ready;
  }
  
  /**
   * For testing - set the ready state
   */
  setReady(ready: boolean): void {
    this.ready = ready;
  }
}