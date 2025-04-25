# Phase 7 Implementation Plan: Refactoring Completion

## Overview

Phase 7 builds upon the successful restructuring and interface standardization work completed in Phase 6. With the major architectural components now properly structured, implemented, and tested, Phase 7 focuses on:

1. Adding Website Context MCP tools to provide visibility in the MCP Inspector (✅ Completed)
2. Removing any remaining legacy code and technical debt
3. Refining error handling and logging consistency
4. Completing comprehensive documentation

Note: CLI Interface and Logger separation has been moved to post-MVP priorities to focus on more critical MVP components.

## Goals

1. **Website Context MCP Tools**: Implement tools for the Website Context to appear in the MCP Inspector
2. **Legacy Code Removal**: Eliminate remaining technical debt and unused code
3. **Dependency Injection Completion**: Finalize the standardized DI pattern across all remaining components
4. **Error Handling**: Implement consistent error handling across all components
5. **Documentation**: Complete comprehensive architecture and component documentation

## Progress Tracking

✅ = Completed, ⏳ = In Progress, 🔜 = Upcoming

- ✅ Remove deprecated code paths and methods
- ✅ Add Website Context MCP tools for Inspector visibility
  - ✅ Create WebsiteToolService
  - ✅ Implement website operation tools
  - ✅ Update WebsiteContext.initializeMcpComponents()
- ⏳ Remove remaining technical debt
  - ⏳ Remove transitional adapters
  - ✅ Clean up barrel files to reduce implementation leakage
  - ✅ Eliminate export * patterns in barrel files
  - ✅ Flatten directory structure (contexts/core → contexts/)
  - ⏳ Remove unused exports identified by find-real-dead-code
- ⏳ Complete dependency injection implementation
  - ✅ Implement createWithDependencies in key utility classes
  - ⏳ Standardize factory methods across remaining components
  - ⏳ Update tests to properly mock dependencies
- ⏳ Refine error handling and logging
  - ⏳ Implement consistent error handling
  - ⏳ Standardize logging patterns
  - ⏳ Enhance error recovery mechanisms
- ⏳ Complete documentation
  - ⏳ Update architecture documentation
  - ⏳ Document component interactions
  - ⏳ Create developer guides for key subsystems

## Implementation Approach

### 1. Website Context MCP Tools (Priority: Highest) ✅ COMPLETED

We've successfully implemented MCP tools for the WebsiteContext to improve visibility in the MCP Inspector:

- Created a WebsiteToolService following the same pattern as ConversationToolService
- Implemented tools for all website operations (generate landing page, build, deploy, etc.)
- Updated the WebsiteContext.initializeMcpComponents() method to register these tools

**Completed Tasks:**
1. Created the `src/contexts/website/tools/websiteTools.ts` file with a WebsiteToolService class
   - Followed the Component Interface Standardization pattern (getInstance/resetInstance/createFresh)
   - Implemented getTools() method to return ResourceDefinition[] for website operations
   - Implemented getToolSchema() method for Zod schema definitions

2. Created the following tools:
   - generate_landing_page: Generates a landing page from profile data
   - build_website: Builds the website using Astro
   - promote_website: Promotes preview to production
   - get_website_status: Gets status of preview or production environment

3. Created an index.ts barrel file in the tools directory to export WebsiteToolService

4. Updated WebsiteContext.initializeMcpComponents() to register the tools:
   ```typescript
   protected override initializeMcpComponents(): void {
     // Get the tool service
     const toolService = WebsiteToolService.getInstance();
     
     // Register website tools
     this.tools = toolService.getTools(this);
   }
   ```

5. Updated WebsiteContext.getService() to handle WebsiteToolService

6. Added comprehensive tests
   - Unit tests for WebsiteToolService
   - Integration tests for WebsiteContext MCP tools integration
   - Verified tools registration with MCP Inspector

### 2. Legacy Code Removal (Priority: High)

Remove remaining technical debt and unused code:

- Run `bun run find-real-dead-code` to identify and remove truly dead exports
- Clean up barrel files to reduce implementation leakage
- Remove transitional adapters and intermediary layers
- Update imports and references to use the standardized structure

**Specific Tasks:**
1. ✅ Remove deprecated code - No items marked with `@deprecated` remain in the codebase

2. Use `bun run find-real-dead-code` to identify and remove unused exports:
   - Focus on files with multiple unused exports
   - Prioritize cleaning up the core modules first
   - Remove unused exports systematically
   - Exceptions:
     - Keep the context integration helper functions in `protocol/messaging/contextIntegration.ts` (requestContextData, requestNotes, etc.) as they will be needed for the standardized context communication implementation
     - These helper functions provide a standardized facade for cross-context communication and will be integrated as part of the dependency injection completion

3. Refactor barrel files to reduce implementation leakage:
   - Review each barrel file to identify what's actually needed by upstream consumers
   - Only export what's truly part of the public API
   - Remove unnecessary re-exports that leak implementation details
   - Use direct imports for implementation details that aren't part of the public API
   - Focus especially on the main context barrel files (in src/contexts/*/index.ts)
   - For `protocol/messaging/index.ts`, keep core message types but remove helper functions to encourage direct imports

4. Use `bun run lint:fix` with the unused-imports plugin to clean up unused imports

### 3. Dependency Injection Completion (Priority: Medium)

Finalize dependency injection implementation across remaining components:

- ✅ Complete `createWithDependencies` in key utility classes
- Standardize factory methods across all components
- Update tests to properly mock dependencies
- Integrate existing context integration helper functions into the application

**Specific Tasks:**
1. ✅ Complete `createWithDependencies` implementation in utility classes:
   - ✅ Implemented in NoteSearchService
   - ✅ Implemented in EmbeddingService
   - ✅ Implemented in NoteRepository
   - Identify and implement in any remaining utility classes
2. Update any remaining service implementations to use dependency injection consistently
3. Standardize dependency resolution in factory methods
4. Update tests to use standardized mock implementations
5. Integrate context integration helper functions:
   - Implement cross-context communication using the helper functions in `protocol/messaging/contextIntegration.ts` 
   - Use requestContextData, requestNotes, requestProfile, etc. in protocol components to create a standardized messaging layer
   - Add these helper functions to the appropriate context implementations to enable seamless cross-context data access
   - Update existing direct messaging implementations to use these standardized helpers

### 4. Error Handling Refinement (Priority: Medium)

Implement a consistent error handling approach across all components:

- Standardize error types and error handling patterns
- Implement proper error recovery mechanisms
- Enhance error logging with contextual information
- Ensure all async operations have proper error boundaries

**Specific Tasks:**
1. Standardize AppError usage throughout the codebase
2. Implement consistent try/catch patterns in async operations
3. Enhance error logging with contextual information
4. Create error recovery mechanisms for critical operations
5. Update error handling documentation

### 5. Documentation Completion (Priority: Medium)

Complete comprehensive documentation for the architecture and components:

- Update architecture diagrams to reflect the new simplified structure
- Document component interactions and dependencies
- Create developer guides for key subsystems
- Update contributing guidelines with standardized patterns

**Specific Tasks:**
1. Update ARCHITECTURE.md with final architecture decisions
2. Document Context standardization in CONTEXT_STANDARDIZATION.md
3. Update component interaction diagrams
4. Create developer guides for each major context
5. Document error handling patterns and best practices

## Testing Strategy

1. Maintain high test coverage throughout the codebase
2. Write comprehensive tests for WebsiteToolService
3. Test CLI/Logger separation with visual tests
4. Ensure all components have unit tests for error conditions

## Progress Milestones

### Milestone 1: Website Context MCP Tools

- Create WebsiteToolService class
- Implement website operation tools
- Update WebsiteContext.initializeMcpComponents()
- Add unit tests for WebsiteToolService
- Verify tools appear in MCP Inspector

### Milestone 2: CLI Interface and Logger Separation

- Create LogOutput class
- Update CLIInterface class
- Add command-line options for log control
- Add runtime commands for log visibility
- Verify visual distinction between logs and content

### Milestone 3: Technical Debt Cleanup

- Remove unused exports identified by find-real-dead-code
- Clean up barrel files to reduce implementation leakage
- Remove transitional adapters and intermediary layers
- Simplify imports and references

### Milestone 4: Error Handling and Documentation

- Standardize error handling patterns
- Enhance error logging and recovery
- Update architecture documentation
- Create developer guides for key subsystems

## Next Steps

1. **Continue Technical Debt Cleanup** (High Priority):
   - ✅ Clean up barrel files (completed)
   - Remove unused exports identified by find-real-dead-code
   - Remove any remaining transitional adapters

2. **Complete Dependency Injection** (Medium Priority):
   - Finish remaining createWithDependencies implementations
   - Standardize factory methods
   - Update tests to use proper mocking

3. **Standardize Error Handling** (Medium Priority):
   - Implement consistent error handling
   - Enhance error logging
   - Create recovery mechanisms

## Detailed Implementation Plan for Website Context MCP Tools

### Website Context MCP Tools Structure

The WebsiteToolService will follow the same pattern as ConversationToolService, providing tools for website-related operations through MCP:

```typescript
/**
 * Website Tools for MCP
 * 
 * This file contains the tool definitions for the WebsiteContext
 * following the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class WebsiteToolService {
  /** The singleton instance */
  private static instance: WebsiteToolService | null = null;
  
  /** Logger instance */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of WebsiteToolService
   */
  public static getInstance(): WebsiteToolService { /* implementation */ }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void { /* implementation */ }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  public static createFresh(): WebsiteToolService { /* implementation */ }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() { /* implementation */ }

  /**
   * Get the MCP tools for the website context
   */
  getTools(context: WebsiteContext): ResourceDefinition[] {
    return [
      // Tool implementations
      this.generateLandingPageTool(context),
      this.buildWebsiteTool(context),
      this.deployWebsiteTool(context),
      this.promoteWebsiteTool(context),
      this.getWebsiteStatusTool(context),
    ];
  }
  
  /**
   * Get the Zod schema for a tool based on its name
   */
  getToolSchema(tool: { name?: string }): Record<string, z.ZodTypeAny> {
    // Schema definitions for each tool
  }
  
  // Tool implementation methods
  private generateLandingPageTool(context: WebsiteContext): ResourceDefinition {
    // Implementation
  }
  
  private buildWebsiteTool(context: WebsiteContext): ResourceDefinition {
    // Implementation
  }
  
  // Additional tool implementations...
}
```

The WebsiteContext will need to be updated to initialize and use these tools:

```typescript
// In WebsiteContext.ts
protected override initializeMcpComponents(): void {
  // Get the tool service
  const toolService = WebsiteToolService.getInstance();
  
  // Register website tools
  this.tools = toolService.getTools(this);
}
```

## Success Criteria

1. ✅ No deprecated code or methods remain in the codebase
2. ✅ WebsiteContext tools appear and function correctly in the MCP Inspector
3. CLI output clearly separates logs from content
4. Unused exports and imports have been removed
5. All components follow the Component Interface Standardization pattern
6. Consistent error handling throughout the codebase
7. Comprehensive documentation for all major components
8. All tests pass with the new standardized patterns