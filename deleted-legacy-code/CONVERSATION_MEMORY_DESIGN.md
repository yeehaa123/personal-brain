# Conversation Memory System Design

## Core Concept
A room-based conversation system that tracks user attribution, with consistent recognition of the brain's "Anchor" person across all interfaces, designed to scale across multiple Matrix rooms with advanced UX features.

## Detailed Approach

### 1. Room-Based Conversations
- Each Matrix room will have a single conversation object in our memory system
- The conversation will be identified by the room ID
- All messages from all users in that room contribute to the same conversation history
- For CLI usage, we'll have a default conversation context
- Some common memory will be shared between CLI and Matrix interfaces

### 2. Consistent Anchor Identification
- For each turn in a conversation, we'll store:
  - User ID (userId)
  - User's display name (userName)
  - The Anchor status will be determined dynamically rather than stored

- **Anchor Identification (Unified):**
  - We'll use the configured MATRIX_USER_ID as the Anchor identifier in BOTH interfaces
  - In CLI: We'll assign the MATRIX_USER_ID to CLI messages, marking them as from the Anchor
  - In Matrix: We'll check if the message sender's userId matches the MATRIX_USER_ID
  - If MATRIX_USER_ID environment variable is not configured:
    - In CLI: Messages will be assigned a default Anchor ID ("cli-user")
    - (Matrix interface wouldn't function without MATRIX_USER_ID, so this case only applies to CLI)
  - This ensures a single, consistent Anchor identity across all interfaces

### 3. Conversation Format in Prompts
- When formatting conversations for AI prompts, we'll include user names with special formatting for the Anchor:
  ```
  Anchor (JanHein): What is quantum computing?
  Assistant: Quantum computing uses qubits that can exist in multiple states...
  Maria: How does that differ from classical computing?
  Assistant: Classical computing uses binary bits that are either 0 or 1...
  ```
- This gives the AI context about the conversation flow and highlights the Anchor's messages
- When using conversation history, the system will add subtle references ("As we discussed earlier...")

### 4. User Experience Features
- **Tiered Memory System:**
  - **Active Memory:** Most recent turns (~10-20) kept in complete detail
  - **Summarized Memory:** Older turns condensed into topic-based summaries
  - **Archived Memory:** Very old conversations moved to persistent storage, retrievable by command

- **Anchor-Only Memory Controls:**
  - Only the Anchor user can issue memory management commands
  - Explicit commands like "forget this conversation" or "remember this important point"
  - Ability to mark certain exchanges as high priority for long-term retention

- **Enhanced Memory Capabilities:**
  - Track named entities, timestamps, emotional context, and importance markers
  - Preserve links to external documents/resources mentioned in conversations
  - Record system actions (file operations, searches) alongside dialogue
  - Attempt to resolve contradictions when user statements change over time
  - Proactively recall relevant information from older conversations

### 5. Implementation Details
- We'll extend the `ConversationTurn` schema to include:
  - `userId` (optional)
  - `userName` (optional)
  - Anchor status is computed at runtime based on userId matching
  - Metadata fields for tracking priority, entities, and linked resources
- In both interfaces, we'll check if the configured MATRIX_USER_ID exists:
  - If it exists, we'll use it as the Anchor identifier
  - If not (CLI-only scenario), the CLI user will be considered the Anchor by default
- Configuration will be loaded from environment variables at startup
- Maintain separate but linked stores for conversation history and user preferences

### 6. Conversation Management
- In Matrix: Create/retrieve conversation history by room ID
- In CLI: Use a default conversation ID but with the same Anchor identity as Matrix
- This ensures the brain perceives the same person as the Anchor regardless of interface
- Implement automatic summarization for older conversation segments
- Track conversation activity to manage memory resources efficiently

### 7. Integration with BrainProtocol
- Modify `processQuery` to include user information and consistent Anchor status
- Update `PromptFormatter` to format conversation history with Anchor recognition
- Maintain a consistent identity representation across interfaces
- Add command handling for memory-related user requests

### 8. Scalability Considerations
- **Storage Strategy:**
  - Implement a pluggable storage interface (ConversationMemoryStorage)
  - Provide both in-memory implementation (for development) and persistent implementations
  - Design for lazy loading of conversations to minimize memory usage

- **Performance Optimizations:**
  - Add conversation lifecycle management (auto-archiving inactive conversations)
  - Implement configurable limits for:
    - Maximum turns per conversation 
    - Maximum stored conversations
    - Maximum age for inactive conversations
  - Create efficient indexing for room ID to conversation ID mapping

- **Persistence Implementation:**
  - Implement SQLiteStorage adapter for persistent storage
  - Ensure efficient querying for conversations by room ID
  - Add conversation pruning based on age and activity
  - Include automated backup/export functionality

- **Monitoring and Management:**
  - Add metrics for tracking memory usage and conversation counts
  - Implement commands for conversation maintenance (archive, export, delete)
  - Create diagnostic tools for conversation health

- **Long-Term: Distributed Architecture:**
  - For very large deployments with high Matrix room counts:
    - Implement sharding of conversations across multiple instances
    - Create a message bus for synchronizing state between instances
    - Develop a distributed storage solution with replication
    - Add load balancing for conversation access and processing
  - This approach would allow for horizontal scaling beyond what a single instance can handle