# MCP Migration TODOs and Evaluation

## Current Migration Issues

### 1. Messaging System Incompatibility

The messaging system (ContextIntegrator, ContextMessaging classes) expects BaseContext-based contexts, not MCP contexts:
- NoteContextMessaging expects NoteContext, not MCPNoteContext
- ProfileContextMessaging expects ProfileContext, not MCPProfileContext  
- WebsiteContextMessaging expects WebsiteContext, not MCPWebsiteContext

### 2. Missing Methods in MCP Contexts

Several methods from the old contexts don't exist in the new MCP contexts:

#### ConversationContext
- `getOrCreateConversationForRoom(roomId, interfaceType)` - Used by ConversationManager and ContextManager
- `getTieredHistory(conversationId)` - Used by ConversationCommandHandler in two places:
  - In `save-note` command to get active turns from tiered memory
  - In `conversation-notes` command to access conversation history
  - Returns object with: `{ activeTurns, summaries, archivedTurns }`

#### WebsiteContext  
- `getAstroContentService()` - Used by WebsiteCommandHandler
- `handleWebsiteStatus()` - Used by WebsiteCommandHandler

### 2. Method Signature Differences

Some methods have different signatures or return types:
- WebsiteContext methods expecting different parameters
- Missing properties on return objects (data, assessments, results)

## Architectural Evaluation

### Current Approach Analysis

**What we're doing:**
- Directly replacing old contexts with new MCP contexts
- Commenting out incompatible method calls as TODOs
- Updating types throughout the protocol layer

**Issues with this approach:**
1. We're losing functionality that the protocol layer depends on
2. Creating technical debt with commented-out code
3. May be forcing a square peg into a round hole

### Alternative Approaches

#### Option 1: Adapter Pattern
Create adapter classes that wrap MCP contexts and provide the old interface:

```typescript
class ConversationContextAdapter implements OldConversationContextInterface {
  private mcpContext: MCPConversationContext;
  
  getOrCreateConversationForRoom(roomId, interfaceType) {
    // Implement using MCP context methods
  }
}
```

**Pros:**
- No breaking changes to protocol layer
- Gradual migration path
- Can implement missing methods

**Cons:**
- Additional abstraction layer
- May perpetuate old patterns

#### Option 2: Extend MCP Contexts
Add the missing methods to MCP contexts:

```typescript
class MCPConversationContext {
  // ... existing methods
  
  async getOrCreateConversationForRoom(roomId, interfaceType) {
    // New implementation
  }
}
```

**Pros:**
- Direct solution
- No adapter layer needed

**Cons:**
- Violates MCP simplification goals
- May reintroduce complexity

#### Option 3: Refactor Protocol Layer
Update the protocol layer to work with the simplified MCP interface:

```typescript
// Instead of getOrCreateConversationForRoom
// Use simpler MCP methods:
const conversation = await context.createConversation();
context.setActiveConversation(conversation);
```

**Pros:**
- Aligns with MCP design principles
- Cleaner architecture
- Removes complex methods

**Cons:**
- Requires more extensive changes
- May change behavior

## Recommendation

**Preferred approach: Option 3 - Refactor Protocol Layer**

Reasons:
1. Aligns with the MCP simplification goals
2. Removes unnecessary complexity
3. Creates a cleaner architecture
4. Avoids technical debt from adapters

## Next Steps

1. Document all dependencies on missing methods
2. Design replacements using MCP's simpler interface
3. Update protocol layer to use new patterns
4. Test thoroughly to ensure no behavior changes

## Specific TODOs

### TypeScript Compilation Status
✅ All TypeScript errors have been resolved
- Used temporary "as any" casts for messaging system incompatibility
- Commented out or worked around missing methods
- Fixed all type mismatches in command handlers and protocol layer

### Remaining Implementation TODOs

### 1. Messaging System Migration
- [ ] Update NoteContextMessaging to work with MCPNoteContext
- [ ] Update ProfileContextMessaging to work with MCPProfileContext  
- [ ] Update WebsiteContextMessaging to work with MCPWebsiteContext
- [ ] Remove the temporary "as any" casts in ContextIntegrator

### 2. ConversationManager
- [ ] Replace `getOrCreateConversationForRoom` with simpler create/set pattern
- [ ] Replace `addTurn` with `addMessage` properly
- [ ] Implement proper conversation history formatting to replace `formatHistoryForPrompt`

### 3. ConversationCommandHandler
- [ ] Implement proper replacement for `getTieredHistory` functionality
- [ ] Fix memory service access pattern

### 4. WebsiteCommandHandler
- [ ] Find alternative to accessing AstroContentService directly
- [ ] Re-implement progress callback functionality
- [ ] Fix data type mismatches between command result and context API

### 5. Test Mocks
- [ ] Update all mock implementations to use MCP context interfaces
- [ ] Fix MockConversationManager to properly mock MCPConversationContext
- [ ] Update MockContextManager to use correct MCP types

### Current Migration Status

#### ✅ Completed
1. **TypeScript Compilation** - All TypeScript errors resolved
   - Replaced all context imports from old to MCP contexts
   - Updated all type definitions throughout protocol layer
   - Fixed command handlers to use MCP context types
   - Added temporary workarounds for incompatibilities

2. **Context Migration** - All contexts now use MCP imports
   - ContextManager uses MCPNoteContext, MCPProfileContext, etc.
   - Protocol managers updated to expect MCP context types  
   - Command handlers updated to use MCP contexts

3. **Interface Compatibility** - Type system satisfied
   - Used temporary "as any" casts for messaging system
   - Commented out/worked around missing methods
   - Fixed data type mismatches in command results

#### ⚠️ Pending Implementation
The code compiles but functionality is incomplete due to:
1. Missing methods in MCP contexts (getTieredHistory, getOrCreateConversationForRoom, etc.)
2. Messaging system still expects old context types
3. Several command handler features disabled/reduced

### Next Steps Priority
1. **Fix Messaging System** - Critical for cross-context communication
2. **Implement Missing Methods** - Either add to MCP contexts or refactor callers
3. **Restore Full Functionality** - Re-enable all commented features with proper implementations
4. **Update Tests** - Ensure all tests work with new MCP context types
  - May need to add tiered memory support to MCPConversationContext
- [ ] Update command implementations for save-note and conversation-notes

### WebsiteCommandHandler
- [ ] Access services through MCP's getCapabilities() instead of direct service access
- [ ] Use proper MCP methods for status checks

### ContextManager
- [ ] Remove room initialization logic or implement differently
- [ ] Update context initialization patterns

## Questions to Address

1. Is the protocol layer doing too much orchestration?
2. Should some logic move into the contexts themselves?
3. Are we preserving necessary functionality while simplifying?
4. How do we handle interface-specific behavior (CLI vs Matrix)?