# Conversation to Notes Integration Design

## Overview

This document outlines the design for integrating the conversation memory system with the notes system, allowing users to create permanent notes from conversation insights while maintaining clear boundaries between user-provided and AI-generated content.

## Core Principles

1. **Clear Content Attribution**: Maintain transparency about content sources (user-provided vs. AI-generated)
2. **User Control**: Give users explicit control over what becomes a permanent note
3. **Bidirectional References**: Create two-way links between conversations and notes
4. **Metadata Integrity**: Ensure proper tagging and source tracking for all generated content

## User Flows

### 1. Save Conversation to Note

**User Flow**:
```
User: ask "Can you explain the principles of ecosystem architecture?"
Brain: [detailed answer about ecosystem architecture]
User: save-note "Ecosystem Architecture Principles"
Brain: [Preview of generated note with source attribution]
User: confirm [or edit before saving]
Brain: Created note ec-123 "Principles of Ecosystem Architecture"
       with tags #ecosystem #architecture #principles
       Source: Conversation on [date]
```

**Implementation Details**:
- Add a `save-note` command with optional title parameter
- Extract context from recent conversation turns
- Generate a note draft with proper attribution header
- Allow user to preview, edit, or confirm
- Save as a permanent note with special metadata

### 2. View Conversation-Derived Notes

**User Flow**:
```
User: list conversation-notes
Brain: Notes derived from conversations:
       - "Principles of Ecosystem Architecture" [April 4, 2025]
       - "Innovation Framework Comparison" [March 28, 2025]

User: note ec-123
Brain: [Note content with clear visual indication of AI-generated content]
       [Source attribution footer with conversation reference]
       Related conversation: "Discussion about ecosystem architecture" [April 4, 2025]
```

**Implementation Details**:
- Extend note display to show source information
- Add visual styling for AI-generated content
- Implement command to filter notes by source type
- Create bidirectional references between notes and conversations

### 3. Enhanced Conversation Context

**User Flow**:
```
User: ask "Let's continue our discussion about ecosystem architecture"
Brain: I'll continue our discussion. Here's what we previously covered:
       [Reference to previous conversation and related notes]
       [Continues the conversation with enhanced context]
```

**Implementation Details**:
- Enhance conversation memory with note references
- Include relevant notes as context for the AI model
- Track conversation continuity across sessions
- Implement bidirectional linking in the prompt strategy

## Data Model Changes

### Note Model Extensions

```typescript
interface Note {
  // Existing fields...
  
  // New fields
  source: 'import' | 'conversation' | 'user-created';
  sourceMetadata?: {
    conversationId?: string;
    timestamp?: Date;
    userName?: string;
    promptSegment?: string;
  };
  confidence?: number; // For AI-generated content
  verified?: boolean;  // User verification status
}
```

### Conversation Model Extensions

```typescript
interface ConversationTurn {
  // Existing fields...
  
  // New fields
  linkedNoteIds?: string[];
  highlighedSegments?: Array<{
    text: string;
    startPos: number;
    endPos: number;
  }>;
  savedAsNoteId?: string;
}

interface ConversationMetadata {
  // Existing fields...
  
  // New fields
  linkedNoteIds?: string[];
  topicSummary?: string;
}
```

## New Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `save-note [title]` | Create a note from recent conversation | `save-note "Ecosystem Principles"` |
| `highlight` | Mark conversation segment as important | `highlight "The key insight is..."` |
| `list conversation-notes` | List notes created from conversations | `list conversation-notes` |
| `conversation-history` | View conversation archives | `conversation-history [limit]` |
| `link-note <note-id>` | Link current conversation to existing note | `link-note ec-123` |

## UI/UX Considerations

### Visual Differentiation

- **Conversation-derived notes**: Display with a light background color or border
- **Source attribution**: Include prominent header with source information
- **Confidence indicators**: Visual indicators for AI-generated content
- **Edit history**: Track modifications to show evolution from original conversation

### User Controls

- **Edit before saving**: Allow users to modify AI-generated content before saving as a note
- **Verification toggle**: Let users mark content as verified after review
- **Attribution settings**: Control how attribution is displayed
- **Privacy controls**: Option to anonymize conversation participants in derived notes

## Implementation Strategy

### Phase 1: Basic Integration

1. Extend data models with source attribution fields
2. Implement `save-note` command and note generation
3. Add visual differentiation for conversation-derived notes
4. Create the basic conversation-to-note conversion workflow

### Phase 2: Enhanced References

1. Implement bidirectional linking between conversations and notes
2. Add conversation history command and archive browsing
3. Enhance prompts to include references to related notes
4. Implement highlighting and important segment tracking

### Phase 3: Advanced Features

1. Add automatic suggestion of noteworthy conversation segments
2. Implement confidence scoring for generated content
3. Create visualization of conversation-note connections
4. Add bulk operations for conversation processing

## Technical Implementation

### Required Changes

1. Extend Note schema in DB
2. Add source metadata fields to ConversationTurn
3. Create ConversationToNoteService
4. Extend display formatters with source attribution
5. Add new commands to CommandHandler
6. Update renderers for Matrix and CLI
7. Implement bidirectional reference tracking

### Security and Privacy Considerations

1. Clear opt-in workflow before saving conversations
2. Option to anonymize participants in saved notes
3. User control over attribution and linking
4. Access controls for conversation archives

## Testing Strategy

1. Unit tests for conversation-to-note conversion
2. Integration tests for bidirectional references
3. User acceptance testing for command flows
4. Visual testing for content differentiation

## Dependencies

1. Existing tiered memory system
2. NoteRepository and NoteContext
3. ConversationMemory
4. CommandHandler infrastructure
5. BrainProtocol prompt formatters