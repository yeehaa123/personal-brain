/**
 * Mock RendererRegistry for tests
 */

// Define a mock progress tracker interface
export interface MockProgressTracker {
  withProgress: <T>(
    title: string,
    steps: string[],
    task: (updateStep: (stepIndex: number) => void) => Promise<T>,
    roomId?: string
  ) => Promise<T>;
}

// Implementation of mock progress tracker
export const mockProgressTracker: MockProgressTracker = {
  withProgress: async <T>(
    _title: string,
    steps: string[],
    task: (updateStep: (stepIndex: number) => void) => Promise<T>,
    _roomId?: string,
  ): Promise<T> => {
    // Simple implementation that just runs the task without tracking
    return task((stepIndex) => {
      // No-op update step function
      console.log(`Mock progress update: step ${stepIndex + 1}/${steps.length}`);
    });
  },
};

// Mock RendererRegistry for testing
export class RendererRegistry {
  private static instance: RendererRegistry | null = null;
  private renderers: Map<string, unknown> = new Map();

  constructor() {
    // Pre-register a mock progress tracker for both interface types
    this.registerRenderer('cli', mockProgressTracker);
    this.registerRenderer('matrix', mockProgressTracker);
  }

  public static getInstance(): RendererRegistry {
    if (!RendererRegistry.instance) {
      RendererRegistry.instance = new RendererRegistry();
    }
    return RendererRegistry.instance;
  }

  public static resetInstance(): void {
    RendererRegistry.instance = null;
  }

  public static createFresh(): RendererRegistry {
    return new RendererRegistry();
  }

  registerRenderer(interfaceType: string, renderer: unknown): void {
    this.renderers.set(interfaceType, renderer);
  }

  getRenderer(interfaceType: string): unknown {
    return this.renderers.get(interfaceType) || null;
  }

  hasRenderer(interfaceType: string): boolean {
    return this.renderers.has(interfaceType);
  }

  getProgressTracker(interfaceType: string): MockProgressTracker {
    const renderer = this.getRenderer(interfaceType);
    
    // Create a type guard for renderers that implement MockProgressTracker
    const hasProgressTracker = (obj: unknown): obj is MockProgressTracker => {
      return obj !== null && 
             typeof obj === 'object' && 
             'withProgress' in obj && 
             typeof (obj as MockProgressTracker).withProgress === 'function';
    };
    
    if (renderer && hasProgressTracker(renderer)) {
      return renderer;
    }
    
    // Return the mock progress tracker as fallback
    return mockProgressTracker;
  }
}