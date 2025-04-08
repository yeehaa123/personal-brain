# Conversation Schema Refactoring Plan

## Overview

This document outlines a plan to refactor the Conversation schema by removing direct access to conversation turns data (`activeTurns`, `summaries`, and `archivedTurns` properties). Currently, there are two ways to access conversation history: directly through these properties on the Conversation object, and through the tiered memory system via `conversationContext.getTieredHistory()`. This refactoring will establish the tiered memory system as the single source of truth for all conversation history access.

## Goals

- Eliminate direct access to conversation history data through Conversation object properties
- Establish the TieredMemoryManager as the single source of truth for conversation history
- Prevent potential bugs from inconsistent access patterns
- Create a cleaner, more maintainable architecture with clear responsibilities
- Reduce memory footprint by eliminating data duplication

## Current Architecture

```typescript
// Current schema definition
export const ConversationSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  activeTurns: z.array(ConversationTurnSchema),  // <-- To be removed
  summaries: z.array(ConversationSummarySchema).default([]), // <-- To be removed
  archivedTurns: z.array(ConversationTurnSchema).default([]), // <-- To be removed
  roomId: z.string(),
  interfaceType: z.enum(['cli', 'matrix']),
  metadata: z.record(z.unknown()).optional(),
});
```

Currently, code can access conversation history in two ways:
1. Directly: `const turns = conversation.activeTurns`
2. Via tiered memory: `const {activeTurns} = await conversationContext.getTieredHistory(conversationId)`

## Target Architecture

```typescript
// Target schema definition
export const ConversationSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  roomId: z.string(),
  interfaceType: z.enum(['cli', 'matrix']),
  metadata: z.record(z.unknown()).optional(),
  // All direct turn data properties removed
});
```

After refactoring, all conversation history access will be through the tiered memory system:
```typescript
const {activeTurns, summaries, archivedTurns} = await conversationContext.getTieredHistory(conversationId);
```

## Implementation Plan

### Phase 1: Preparation (1-2 days)

1. **Audit Current Usage**
   - Conduct a thorough search for all direct accesses to `activeTurns`, `summaries`, and `archivedTurns`
   - Document all places where these properties are used
   - Classify usage patterns (read-only access, mutation, etc.)

2. **Enhance Tiered Memory System**
   - Review the current implementation of `getTieredHistory()` 
   - Ensure it handles all edge cases (empty conversations, etc.)
   - Add additional tests for the tiered memory system

3. **Create Migration Utilities**
   - Implement helper functions to facilitate the transition
   - Add logging to track usage during development

### Phase 2: Make Properties Optional (1 day)

1. **Update Schema Definitions**
   ```typescript
   export const ConversationSchema = z.object({
     // ...
     activeTurns: z.array(ConversationTurnSchema).optional(),
     summaries: z.array(ConversationSummarySchema).optional().default([]),
     archivedTurns: z.array(ConversationTurnSchema).optional().default([]),
     // ...
   });
   ```

2. **Update Storage Implementations**
   - Modify `InMemoryStorage` to stop populating these fields
   - Ensure `getConversation` returns objects without these properties
   - Adjust any database mapping code if applicable

3. **Add Schema Version Flag**
   - Add a version indicator in metadata to track the schema version
   - Use this to conditionally handle old vs. new format

### Phase 3: Update Consumption Code (2-3 days)

1. **Update Command Handlers**
   - Replace any remaining direct accesses in command handlers
   - Focus on `conversationCommands.ts` and similar files

2. **Update Formatters and Renderers**
   - Modify code that formats conversation data for display
   - Ensure all formatters use the tiered memory system

3. **Update Protocol Layer**
   - Check BrainProtocol methods that handle conversations
   - Update any middleware or handlers that process conversations

4. **Update Tests**
   - Modify test mocks and factories to follow the new pattern
   - Ensure test assertions are updated to use `getTieredHistory()`

### Phase 4: Complete Removal (1 day)

1. **Remove Properties from Schema**
   ```typescript
   export const ConversationSchema = z.object({
     id: z.string(),
     createdAt: z.date(),
     updatedAt: z.date(),
     roomId: z.string(),
     interfaceType: z.enum(['cli', 'matrix']),
     metadata: z.record(z.unknown()).optional(),
     // All turn data properties completely removed
   });
   ```

2. **Final Cleanup**
   - Remove any transitional code
   - Clean up tests and utility functions
   - Update documentation

3. **Performance Verification**
   - Run performance tests to ensure no regressions
   - Check memory usage improvements

### Phase 5: Documentation and Knowledge Sharing (0.5 day)

1. **Update Architecture Documentation**
   - Document the new conversation data access patterns
   - Update CLAUDE.md with guidance on using the tiered memory system

2. **Knowledge Sharing**
   - Share the changes with the team
   - Provide examples of how to access conversation history properly

## Files to be Modified

1. **Schema Definitions**
   - `/src/mcp/protocol/schemas/conversationSchemas.ts`

2. **Storage Implementations**
   - `/src/mcp/contexts/conversations/storage/inMemoryStorage.ts`
   - Any other storage implementations

3. **Command Handlers**
   - `/src/commands/handlers/conversationCommands.ts`
   - Any other command handlers that access conversation data

4. **Context and Manager Classes**
   - `/src/mcp/contexts/conversations/core/conversationContext.ts`
   - `/src/mcp/contexts/conversations/memory/tieredMemoryManager.ts`

5. **Formatters and Renderers**
   - `/src/mcp/contexts/conversations/formatters/conversationFormatter.ts`
   - `/src/mcp/contexts/conversations/formatters/conversationMcpFormatter.ts`

6. **Tests**
   - `/tests/commands/conversation-notes.test.ts`
   - `/tests/mcp/contexts/conversations/tieredMemoryManager.test.ts`
   - Various other test files

## Testing Strategy

1. **Unit Tests**
   - Update all unit tests that involve Conversation objects
   - Add tests for edge cases in the tiered memory system

2. **Integration Tests**
   - Test conversation history access in command handlers
   - Test formatters and renderers with the new data structure

3. **System Tests**
   - End-to-end tests for conversation creation and history access
   - Performance and memory usage tests

## Rollout Strategy

1. **Development Environment First**
   - Implement and test the changes in the development environment
   - Get feedback from team members

2. **Pre-Production Testing**
   - Deploy to pre-production environment
   - Monitor for any unexpected issues

3. **Production Deployment**
   - Since this is a pre-production project, coordinate with the team for the final deployment

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking changes in Conversation type | High | High | Thorough testing, phased approach with optional properties during transition |
| Missed usage of direct properties | High | Medium | Comprehensive audit, add ESLint rules to catch direct access |
| Performance impact | Medium | Low | Performance testing before and after changes |
| Test coverage gaps | Medium | Medium | Add new tests specifically for the refactored code |

## Success Criteria

1. All direct accesses to conversation turn data are replaced with tiered memory system access
2. All tests pass with the new architecture
3. No regression in functionality or performance
4. Code is cleaner and more maintainable
5. Documentation is updated to reflect the new architecture

## Timeline

- **Total Estimated Time**: 5-7 days
- **Phase 1 (Preparation)**: 1-2 days
- **Phase 2 (Make Properties Optional)**: 1 day
- **Phase 3 (Update Consumption Code)**: 2-3 days
- **Phase 4 (Complete Removal)**: 1 day
- **Phase 5 (Documentation)**: 0.5 day

## Appendix: Example Code Changes

### Before
```typescript
// Direct access to conversation turns
const conversation = await brainProtocol.getConversation(conversationId);
const turns = conversation.activeTurns;
```

### After
```typescript
// Access via tiered memory system
const conversationContext = brainProtocol.getConversationContext();
const { activeTurns: turns } = await conversationContext.getTieredHistory(conversationId);
```

### Test Mock Before
```typescript
const mockConversation = {
  id: 'conv123',
  activeTurns: mockConversationTurns,
  summaries: [],
  archivedTurns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  interfaceType: 'cli',
  roomId: 'room-123',
};
```

### Test Mock After
```typescript
const mockConversation = {
  id: 'conv123',
  createdAt: new Date(),
  updatedAt: new Date(),
  interfaceType: 'cli',
  roomId: 'room-123',
};

// Mock the tiered history separately
mockConversationContext.getTieredHistory.mockResolvedValue({
  activeTurns: mockConversationTurns,
  summaries: [],
  archivedTurns: [],
});
```