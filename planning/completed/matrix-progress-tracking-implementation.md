# Matrix Progress Tracking Implementation Plan

## Overview

This document outlines a two-phase approach to implement progress tracking for long-running operations in the Matrix interface, similar to what we've already implemented for the CLI interface.

## Current State

- CLI interface has a fully functional progress tracking system with step-by-step updates
- Matrix interface needs similar functionality for better user experience
- The renderer architecture is not currently unified across interfaces
- CLI renderer is managed in the CLI app entry point
- Matrix renderer is created in the MatrixBrainInterface

## Phase 1: Quick Implementation with Interface Type Check

### Approach

Implement a short-term solution that works with the current architecture by:

1. Adding progress tracking types and formatting support for Matrix
2. Adding the `withProgressTracker` method to MatrixRenderer
3. Modifying command handlers to use different progress tracking approaches based on the interface type

### Implementation Steps

1. ✅ Create progress-types.ts for Matrix progress tracking
2. ✅ Add formatProgress method to MatrixResponseFormatter
3. ✅ Add 'progress' response type to CommandResult union
4. ✅ Update MatrixRenderer with withProgressTracker method
5. ✅ Update WebsiteCommandHandler to check interface type and use the appropriate progress approach

### Remaining Work

6. Fix the interface access issue by:
   - Adding direct reference to Matrix interface in WebsiteCommandHandler constructor
   - Using BrainProtocol's access to MatrixBrainInterface
   - Modifying the `handleLandingPage` method to detect interface type and routing to the appropriate progress tracker

### Usage Pattern

```typescript
// In WebsiteCommandHandler
private async handleLandingPage(args: string): Promise<CommandResult> {
  // ...
  if (action === 'generate') {
    try {
      // Define steps for both interfaces
      const steps = [
        'Retrieving website identity',
        'Analyzing site requirements',
        // ... more steps ...
      ];
      
      // Check which interface we're using
      const interfaceType = this.brainProtocol.getInterfaceType();
      
      if (interfaceType === 'matrix') {
        // Get Matrix-specific rendering resources
        const roomId = this.brainProtocol.getConversationManager().getCurrentRoom();
        if (!roomId) {
          throw new Error('Room ID not available for progress tracking');
        }
        
        // Get Matrix renderer via direct reference
        // Direct reference will be implemented in Phase 1
        const matrixRenderer = this.matrixInterface?.renderer;
        
        if (!matrixRenderer) {
          throw new Error('Matrix renderer not available');
        }
        
        // Use Matrix progress tracker
        const result = await matrixRenderer.withProgressTracker(
          roomId,
          'Generating Landing Page',
          steps,
          async (updateStep) => {
            // Generate landing page with progress tracking
            return await this.websiteContext.generateLandingPage({
              // ...options...
              onProgress: (_step, index) => updateStep(index),
            });
          }
        );
        
        return { /* landing page result */ };
      } else {
        // Use CLI progress spinner
        const cli = CLIInterface.getInstance();
        const result = await cli.withProgressSpinner(/* ... */);
        return { /* landing page result */ };
      }
    } catch (error) {
      // Error handling
    }
  }
}
```

## Phase 2: Architecture Refactoring for Unified Renderer Access

### Approach

Implement a long-term solution that refactors the architecture to provide a standardized way to access renderers:

1. Create a unified renderer registry
2. Modify interface initialization to register renderers
3. Update ContextManager to access renderers through the registry
4. Standardize the progress tracking interface

### Implementation Steps

1. Create a RendererRegistry class:
   ```typescript
   class RendererRegistry {
     private static instance: RendererRegistry | null = null;
     private renderers: Map<string, unknown> = new Map();
     
     public static getInstance(): RendererRegistry {
       if (!RendererRegistry.instance) {
         RendererRegistry.instance = new RendererRegistry();
       }
       return RendererRegistry.instance;
     }
     
     registerRenderer(interfaceType: string, renderer: unknown): void {
       this.renderers.set(interfaceType, renderer);
     }
     
     getRenderer(interfaceType: string): unknown {
       return this.renderers.get(interfaceType) || null;
     }
   }
   ```

2. Update interface initialization to register renderers:
   - Modify CLI app to register CLIRenderer
   - Modify MatrixBrainInterface to register MatrixRenderer

3. Update ContextManager with a working getRenderer method:
   ```typescript
   getRenderer(): unknown {
     const interfaceType = this.config.getInterfaceType();
     return RendererRegistry.getInstance().getRenderer(interfaceType);
   }
   ```

4. Create a unified IProgressTracker interface:
   ```typescript
   interface IProgressTracker {
     withProgress<T>(
       title: string,
       steps: string[],
       task: (updateStep: (stepIndex: number) => void) => Promise<T>
     ): Promise<T>;
   }
   ```

5. Update CLI and Matrix renderers to implement the IProgressTracker interface

### Benefits of Phase 2

- Standardized access to renderers through the ContextManager
- Consistent progress tracking interface across all interface types
- Better separation of concerns
- Easier to add new interface types in the future
- More maintainable and testable code

## Next Steps

1. Complete Phase 1 implementation to deliver immediate value
2. Create unit tests for new functionality
3. Begin Phase 2 implementation as part of broader architecture refactoring
4. Apply progress tracking to other long-running operations