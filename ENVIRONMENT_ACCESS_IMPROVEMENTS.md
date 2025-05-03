# Environment Access Improvements

This document outlines the improvements made to centralize environment variable access and standardize environment-related configurations in the codebase.

## Summary of Changes

1. Added `isTestMode` configuration to `logConfig` in `config.ts`
2. Added utility functions for environment checking in `configUtils.ts`:
   - `isTestEnvironment()`
   - `isProductionEnvironment()`
   - `isDevelopmentEnvironment()`
3. Created path utilities in `pathUtils.ts` for standardized path resolution
4. Updated `Logger` class to use `logConfig.isTestMode` instead of direct environment access
5. Removed explicit `{ silent: process.env.NODE_ENV === 'test' }` from Logger initialization throughout the codebase
6. Updated path resolution to use the new path utilities

## Problem Addressed

Before these changes, the codebase had many scattered instances of direct environment variable access using `process.env.NODE_ENV === 'test'`, especially for configuring the Logger's silent mode during tests. This created several issues:

1. **Inconsistency**: Environment checking was duplicated across the codebase
2. **Maintainability**: Any change to environment handling would require updates in many places
3. **Testability**: Hard-coded environment checks made testing more difficult
4. **Configuration**: Lack of centralized configuration reduced flexibility

## Implementation Details

### 1. Test Mode Configuration in `config.ts`

Added a new parameter to `logConfig` to centralize test mode detection:

```typescript
export const logConfig = {
  // other config...
  
  // Test mode configuration - used for silencing logs during tests
  isTestMode: getEnvAsBool('TEST_MODE', process.env.NODE_ENV === 'test'),
};
```

### 2. Environment Utility Functions in `configUtils.ts`

Added utility functions to centralize environment checking:

```typescript
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}
```

### 3. Path Utilities in `pathUtils.ts`

Created a new utility file with standardized path functions:

```typescript
export function getProjectRoot(): string {
  return process.cwd();
}

export function resolveProjectPath(relativePath: string): string {
  return path.join(getProjectRoot(), relativePath);
}

export function resolvePath(basePath: string, ...pathSegments: string[]): string {
  return path.join(basePath, ...pathSegments);
}

// Additional utilities...
```

### 4. Logger Class Updates

Updated the Logger class to automatically use `logConfig.isTestMode` for silent mode configuration:

```typescript
// Check for silent mode first, either from explicit config or from global test mode setting
const isSilent = config?.silent ?? logConfig.isTestMode;

if (isSilent) {
  // Create a silent logger with no transports
  this.winstonLogger = winston.createLogger({
    silent: true,
    transports: [],
  });
  return;
}
```

### 5. Code Refactoring

Updated various files to use the new utilities:

- Base classes like `BaseContext`, `BaseEmbeddingService`, and `BaseSearchService`
- Storage adapters for conversations, notes, profiles, and external sources
- Formatters for conversation data
- Memory and query services for conversations
- Protocol components for prompt formatting
- Path resolution in various website context methods

## Benefits

1. **Centralized Configuration**: Environment-related settings are now managed in one place
2. **Reduced Duplication**: Eliminated repeated environment checks throughout the codebase
3. **Improved Testability**: Easier to simulate different environments during testing
4. **Enhanced Maintainability**: Changes to environment behavior only need to be made in one place
5. **Type Safety**: Using typed configuration instead of direct string comparison
6. **Standardized Path Handling**: Common path operations use consistent utilities

## Next Steps

1. Continue updating remaining instances of direct environment access
2. Add environment-specific configuration for different deployment scenarios
3. Consider adding a global `EnvironmentManager` class for more complex environment handling
4. Add more comprehensive test coverage for environment-dependent functionality

## Files Updated

- `/src/config.ts`
- `/src/utils/configUtils.ts`
- `/src/utils/logger.ts`
- `/src/utils/pathUtils.ts` (new file)
- `/src/contexts/baseContext.ts`
- `/src/services/common/baseEmbeddingService.ts`
- `/src/services/common/baseSearchService.ts`
- `/src/services/notes/noteEmbeddingService.ts`
- `/src/contexts/conversations/conversationContext.ts`
- `/src/contexts/conversations/conversationStorageAdapter.ts`
- `/src/contexts/notes/noteStorageAdapter.ts`
- `/src/contexts/profiles/profileStorageAdapter.ts`
- `/src/contexts/externalSources/externalSourceStorageAdapter.ts`
- `/src/contexts/conversations/formatters/conversationFormatter.ts`
- `/src/contexts/conversations/formatters/conversationMcpFormatter.ts`
- `/src/contexts/conversations/services/conversationMemoryService.ts`
- `/src/contexts/conversations/services/conversationQueryService.ts`
- `/src/protocol/components/promptFormatter.ts`
- `/src/protocol/components/systemPromptGenerator.ts`
- `/src/contexts/website/websiteContext.ts`