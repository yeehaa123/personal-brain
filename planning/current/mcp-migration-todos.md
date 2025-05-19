# MCP Migration TODOs and Evaluation

## Current Migration Issues

### 1. Messaging System Incompatibility - RESOLVED ✅

The messaging system has been successfully updated to work with MCP contexts.

### 2. Critical Missing Methods in MCP Contexts

Several methods from the old contexts don't exist in the new MCP contexts and need to be implemented:

#### ConversationContext - IMPLEMENTATION COMPLETED ✅
- `getOrCreateConversationForRoom(roomId, interfaceType)` - Using workaround with `createConversation`
- `getTieredHistory(conversationId)` - **IMPLEMENTED WITH TIERED MEMORY**
  - Now available in MCPConversationContext
  - Returns object with: `{ activeTurns, summaries, archivedTurns }`
  - Preserves all critical functionality:
    - Automatic conversation summarization
    - Context preservation in long conversations
    - Token optimization for AI prompts
    - Comprehensive notes from conversations
  - Successfully integrated TieredMemoryManager

#### WebsiteContext - WORKAROUNDS AVAILABLE ✅
- `getAstroContentService()` - Can use `getLandingPageData()` instead
- `handleWebsiteStatus()` - Already implemented in MCPWebsiteContext

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

### 1. Messaging System Migration ✅ COMPLETED
- [x] Update NoteContextMessaging to work with MCPNoteContext
- [x] Update ProfileContextMessaging to work with MCPProfileContext  
- [x] Update WebsiteContextMessaging to work with MCPWebsiteContext
- [x] Remove the temporary "as any" casts in ContextIntegrator

### 2. ConversationManager - WORKAROUNDS ACCEPTABLE ✅
- [x] Use `createConversation` instead of `getOrCreateConversationForRoom`
- [x] Already using `addMessage` instead of `addTurn`
- [x] Manual formatting instead of `formatHistoryForPrompt`

### 3. MCPConversationContext - TIERED MEMORY COMPLETED ✅
- [x] Add `getTieredHistory()` method
- [x] Add `formatHistoryForPrompt()` method
- [x] Integrate TieredMemoryManager
- [x] Add automatic summarization triggers
- [x] Preserve existing tiered memory configuration

### 4. WebsiteCommandHandler
- [ ] Find alternative to accessing AstroContentService directly
- [ ] Re-implement progress callback functionality
- [ ] Fix data type mismatches between command result and context API

### 5. Test Mocks
- [ ] Update all mock implementations to use MCP context interfaces
- [ ] Fix MockConversationManager to properly mock MCPConversationContext
- [ ] Update MockContextManager to use correct MCP types

### 5. Architectural Issues - Cross-Context Dependencies 🔴
- [ ] **ProfileNoteAdapter creates direct dependency between ProfileContext and NoteContext**
  - Currently ProfileContext directly imports and uses NoteContext
  - This violates the architectural pattern of contexts communicating through messaging
  - Should be refactored to use messaging layer for cross-context communication
  - Alternative: Create a generic storage interface that doesn't directly depend on NoteContext
  - See: `src/contexts/profiles/adapters/profileNoteAdapter.ts`

### 6. Test Failures to Fix 🔴
- [ ] **Mock Context Type Mismatches**
  - Many test mocks still reference old context types
  - MockConversationManager expects different interface than MCPConversationContext provides
  - Need to update all mocks to work with MCP context interfaces
- [ ] **Failing Integration Tests**
  - Protocol integration tests failing due to changed method signatures
  - Context mediator tests need updating for new message handling
  - Command handler tests need mock updates
- [ ] **Website Context Tests**
  - Landing page generation tests failing
  - Section generation service errors
  - Local deployment manager test issues

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
The code compiles but critical functionality is missing:

### Next Steps Priority (UPDATED)

1. **Add Tiered Memory to MCPConversationContext** - COMPLETED ✅
   - [x] Add `getTieredHistory()` method to MCPConversationContext
   - [x] Import and use existing TieredMemoryManager
   - [x] Add automatic conversation summarization
   - [x] Ensure proper token management for AI prompts
   - [x] Update ConversationCommandHandler to use tiered history properly

2. **Remove Old Context Implementations** - COMPLETED ✅
   - [x] Update index files to only export MCP contexts
   - [x] Delete old context implementation files (baseContext.ts, conversationContext.ts, etc.)
   - [x] Remove unused ConversationResourceService and ConversationToolService
   - [x] Update test mocks to use actual MCP contexts
   - [x] Fix import issues in ServiceRegistry and other files

3. **Clean up TODOs and Workarounds** 
   - [ ] Remove TODOs for methods that have acceptable workarounds
   - [ ] Document the new simplified patterns
   - [ ] Update command handlers to use proper MCP methods

4. **Update Tests**
   - [ ] Ensure all tests work with tiered memory in MCP context
   - [ ] Add tests for tiered history functionality
   - [ ] Update mocks to include tiered memory

### WebsiteCommandHandler
- [ ] Access services through MCP's getCapabilities() instead of direct service access
- [ ] Use proper MCP methods for status checks

### ContextManager
- [ ] Remove room initialization logic or implement differently
- [ ] Update context initialization patterns

## Critical Decision: Tiered Memory Must Be Preserved

### Why Tiered Memory is Essential:

1. **Long Conversation Support**: Without tiered memory, conversations grow indefinitely
2. **Token Management**: AI prompts have token limits - summaries keep context within bounds
3. **Context Preservation**: Summaries maintain important context from older messages
4. **Note Quality**: `save-note` command needs full conversation history, not just recent turns
5. **Memory Efficiency**: Prevents memory bloat from storing all turns as active

### Implementation Strategy:
- The tiered memory logic already exists in TieredMemoryManager
- MCPConversationContext just needs to integrate it
- This aligns with MCP principles - we're not adding complexity, just preserving essential functionality

## Questions to Address

1. Is the protocol layer doing too much orchestration? No - contexts handle their own logic
2. Should some logic move into the contexts themselves? Yes - tiered memory belongs in the context
3. Are we preserving necessary functionality while simplifying? Yes - tiered memory is necessary
4. How do we handle interface-specific behavior (CLI vs Matrix)? Through the existing interface type parameter