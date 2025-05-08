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
7. Changed default log file paths to use 'logs/' directory instead of root directory
8. Added automatic logs directory creation in Logger constructor
9. Significantly reduced console verbosity by changing default console log level to 'error' (only errors are shown)
10. Fixed logger transport configuration to ensure error logs are properly separated
11. Further reduced noisy CLI output during generation of content

## Problem Addressed

Before these changes, the codebase had many scattered instances of direct environment variable access using `process.env.NODE_ENV === 'test'`, especially for configuring the Logger's silent mode during tests. This created several issues:

1. **Inconsistency**: Environment checking was duplicated across the codebase
2. **Maintainability**: Any change to environment handling would require updates in many places
3. **Testability**: Hard-coded environment checks made testing more difficult
4. **Configuration**: Lack of centralized configuration reduced flexibility

## Implementation Details

### 1. Log Configuration Updates in `config.ts`

Added a new parameter to `logConfig` to centralize test mode detection:

```typescript
export const logConfig = {
  // Log levels
  consoleLevel: getEnv('LOG_CONSOLE_LEVEL', getEnv('BRAIN_ENV') === 'production' ? 'warn' : 'warn'),
  fileLevel: getEnv('LOG_FILE_LEVEL', 'debug'),

  // Log file paths
  errorLogPath: getEnv('ERROR_LOG_PATH', 'logs/error.log'),
  combinedLogPath: getEnv('COMBINED_LOG_PATH', 'logs/combined.log'),
  debugLogPath: getEnv('DEBUG_LOG_PATH', 'logs/debug.log'),
  
  // Test mode configuration - used for silencing logs during tests
  isTestMode: getEnvAsBool('TEST_MODE', process.env.NODE_ENV === 'test'),
};
```

Key improvements:
- Changed default console log level to 'warn' to reduce verbose console output
- Changed default log file paths to use the 'logs/' directory instead of root directory
- Used environment variables with sensible defaults for greater flexibility

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

Added logic to automatically create the logs directory if it doesn't exist:

```typescript
/**
 * Ensure the logs directory exists
 * @param logPath The path to the log file
 */
private ensureLogDirectory(logPath: string): void {
  try {
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create log directory for ${logPath}:`, error);
  }
}
```

Using this utility in the Logger constructor to ensure all log directories exist:

```typescript
// Ensure log directories exist
this.ensureLogDirectory(defaultConfig.errorLogPath);
this.ensureLogDirectory(defaultConfig.combinedLogPath);
this.ensureLogDirectory(defaultConfig.debugLogPath);
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