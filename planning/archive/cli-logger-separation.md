# CLI and Logger Separation Plan

## Overview

This document outlines the plan to improve the CLI experience by clearly separating logger output from normal CLI content. Currently, the application mixes log messages with user-facing output, creating a confusing user experience.

## Current Issues

1. **Mixed Output Streams**: Logger information (info, debug, warning messages) and application content are interspersed in the console
2. **Inconsistent Visual Formatting**: No clear visual distinction between logs and actual application output
3. **No Log Level Control**: Users can't easily control log visibility at runtime
4. **Redundant Logging**: Many CLI methods both log and output to console

## Goals

1. **Clean Separation**: Create a clear separation between log messages and user-facing content
2. **Visual Distinction**: Implement a consistent visual style that distinguishes logs from content
3. **Configurable Logging**: Allow users to control log visibility (show/hide/level)
4. **Consistent API**: Refactor the CLI interface to ensure consistent output behavior

## Implementation Plan

### 1. Create a LogOutput Class

Create a new class to handle log output management that will:
- Control log visibility and formatting
- Provide methods for different log levels
- Allow runtime configuration of log visibility

```typescript
// Example structure
class LogOutput {
  private logLevel: LogLevel;
  private logToConsole: boolean;
  
  constructor(options?: LogOutputOptions) {
    // Set initial configuration
  }
  
  setLogLevel(level: LogLevel): void {
    // Update log level
  }
  
  setLogToConsole(enabled: boolean): void {
    // Enable/disable console logging
  }
  
  // Log methods
  debug(message: string, ...meta: unknown[]): void {}
  info(message: string, ...meta: unknown[]): void {}
  warn(message: string, ...meta: unknown[]): void {}
  error(message: string, ...meta: unknown[]): void {}
}
```

### 2. Modify the CLIInterface Class

Update CLIInterface to:
- Separate content output methods from logging methods
- Use LogOutput for logging
- Ensure consistent formatting for user-facing content

```typescript
// Example refactoring
class CLIInterface {
  private static logOutput: LogOutput;
  
  // Content output methods (no logging)
  static displayTitle(title: string): void {
    // Display only, no logging
  }
  
  // Combined methods (display + log)
  static success(message: string): void {
    // Display to user
    process.stdout.write(`${this.styles.successIcon} ${message}\n`);
    // Log for debugging
    this.logOutput.info(`[SUCCESS] ${message}`);
  }
}
```

### 3. Add Command Line Options

Add CLI arguments to control logging:
- `--log-level=<level>`: Set the log level (error, warn, info, debug)
- `--no-logs`: Disable console logging entirely
- `--logs-only`: Show only logs, no content (for debugging)

### 4. Create a Console Output Strategy

Implement a strategy for how to display logs in the console:
- **Option A**: Show logs in a different color/style
- **Option B**: Prefix all logs with a special indicator
- **Option C**: Direct logs to stderr and content to stdout
- **Option D**: Create a separate "log window" in terminal-based UIs

### 5. Update Logging in Command Processing

Ensure command processing has clear boundaries between logs and content:
- Log command execution details, parameters, etc.
- Only send user-facing content to the content output stream

### 6. Add Runtime Commands for Log Control

Create CLI commands to control logging at runtime:
- `logging set-level <level>`: Change log level during execution
- `logging show`: Enable console logging
- `logging hide`: Disable console logging

## Testing Strategy

1. **Visual Testing**: Create sample commands that produce both logs and content
2. **Unit Tests**: Test that logs and content go to appropriate streams
3. **Integration Tests**: Verify that log level filters work correctly

## Implementation Phases

### Phase 1: Logging Infrastructure

- Create LogOutput class
- Update Logger class to use LogOutput
- Add command-line arguments for log control

### Phase 2: CLIInterface Refactoring

- Separate output methods in CLIInterface
- Update all points where CLIInterface methods are called
- Ensure consistent display patterns

### Phase 3: Command Processing Updates

- Update command handlers and processors
- Add runtime commands for log control
- Complete final testing

## Success Criteria

1. Logs and user content are visually distinct
2. Users can control log visibility
3. All existing functionality works without disruption
4. Clear documentation for the new logging system