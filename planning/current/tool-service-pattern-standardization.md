# Tool Service Pattern Standardization

## Overview

Currently, we have inconsistent patterns for how MCP contexts handle tools:

1. **Service Pattern** (3 contexts): Note, Website, ExternalSource
   - Use a separate ToolService class
   - Define a ToolContext interface
   - Follow Component Interface Standardization pattern

2. **Direct Pattern** (2 contexts): Profile, Conversation
   - Define tools directly in the context
   - No separate service or interface

This inconsistency makes the codebase harder to understand and maintain.

## Goal

Standardize all contexts to use the ToolService pattern for consistency and maintainability.

## Current State

### Contexts Using ToolService Pattern

1. **NoteContext**
   - `NoteToolService` class
   - `NoteToolContext` interface
   - Tools defined in separate service

2. **WebsiteContext**
   - `WebsiteToolService` class
   - `WebsiteToolContext` interface
   - Tools defined in separate service

3. **ExternalSourceContext**
   - `ExternalSourceToolService` class
   - `ExternalSourceToolContext` interface
   - Tools defined in separate service

### Contexts Using Direct Pattern

1. **ProfileContext**
   - Tools defined in `setupTools()` method
   - No separate service or interface

2. **ConversationContext**
   - Tools defined directly in context
   - No separate service or interface

## Migration Plan

### Phase 1: ProfileContext Migration

1. Create `ProfileToolService` class
   - Follow Component Interface Standardization pattern
   - getInstance(), resetInstance(), createFresh() methods
   - Move tool definitions from `setupTools()` to service

2. Create `ProfileToolContext` interface
   - Define required methods for profile tools
   - Implement in MCPProfileContext

3. Update MCPProfileContext
   - Use ProfileToolService.getInstance().getTools(this)
   - Remove direct tool definitions

### Phase 2: ConversationContext Migration

1. Create `ConversationToolService` class
   - Follow Component Interface Standardization pattern
   - getInstance(), resetInstance(), createFresh() methods
   - Move tool definitions to service

2. Create `ConversationToolContext` interface
   - Define required methods for conversation tools
   - Implement in MCPConversationContext

3. Update MCPConversationContext
   - Use ConversationToolService.getInstance().getTools(this)
   - Remove direct tool definitions

## Benefits

1. **Consistency**: All contexts follow the same pattern
2. **Maintainability**: Tools are organized in dedicated services
3. **Testability**: Tool services can be tested independently
4. **Flexibility**: Easy to add/modify tools without changing contexts
5. **Type Safety**: Interfaces ensure correct implementation

## Implementation Notes

- Follow existing patterns from NoteToolService
- Use TypeScript interfaces for type safety
- Include comprehensive documentation
- Add tests for new services
- Update any documentation that references tool patterns