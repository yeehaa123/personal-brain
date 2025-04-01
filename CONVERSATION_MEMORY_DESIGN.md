# Conversation Memory System Design

## Core Concept
A room-based conversation system that tracks user attribution, with consistent recognition of the brain's "Anchor" person across all interfaces.

## Detailed Approach

### 1. Room-Based Conversations
- Each Matrix room will have a single conversation object in our memory system
- The conversation will be identified by the room ID
- All messages from all users in that room contribute to the same conversation history
- For CLI usage, we'll have a default conversation context

### 2. Consistent Anchor Identification
- For each turn in a conversation, we'll store:
  - User ID (userId)
  - User's display name (userName)
  - Whether this user is the Anchor of the brain (isAnchor flag)

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

### 4. Implementation Details
- We'll extend the `ConversationTurn` schema to include:
  - `userId` (optional)
  - `userName` (optional)
  - `isAnchor` (boolean, defaults to false)
- In both interfaces, we'll check if the configured MATRIX_USER_ID exists:
  - If it exists, we'll use it as the Anchor identifier
  - If not (CLI-only scenario), the CLI user will be considered the Anchor by default
- Configuration will be loaded from environment variables at startup

### 5. Conversation Management
- In Matrix: Create/retrieve conversation history by room ID
- In CLI: Use a default conversation ID but with the same Anchor identity as Matrix
- This ensures the brain perceives the same person as the Anchor regardless of interface

### 6. Integration with BrainProtocol
- Modify `processQuery` to include user information and consistent Anchor status
- Update `PromptFormatter` to format conversation history with Anchor recognition
- Maintain a consistent identity representation across interfaces