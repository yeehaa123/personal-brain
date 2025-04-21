# Interface Simplification Plan

## Overview

Based on analysis of the codebase, several interfaces would benefit from simplification to reduce redundancy, improve clarity, and make the system more maintainable. This document outlines a plan for simplifying these interfaces in order of priority.

## Priority 1: Messaging Type Consolidation

### Current State

The codebase currently has two overlapping sets of message interfaces:

1. `src/protocol/formats/messageFormats.ts` - Defines base message formats
2. `src/protocol/messaging/messageTypes.ts` - Defines context-specific message types

There is significant duplication between:
- `ResponseMessage` and `DataResponseMessage`/`AcknowledgmentMessage`
- `EventMessage` and `NotificationMessage`
- Common patterns for status codes, error formats, and correlation IDs

### Proposed Changes

1. Create a unified message hierarchy with clearer inheritance:

```typescript
// Base message interface for all protocol messages
export interface BaseMessage {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  target?: string;
}

// Base request message (for both queries and commands)
export interface RequestMessage extends BaseMessage {
  // Common fields for all requests
  requestType: 'query' | 'command' | 'data';
  parameters?: Record<string, unknown>;
  timeout?: number;
}

// Base response message (for all response types)
export interface ResponseMessage extends BaseMessage {
  // Common fields for all responses
  correlationId: string;
  status: 'success' | 'error' | 'partial';
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Base notification message
export interface NotificationMessage extends BaseMessage {
  eventType: string;
  payload: Record<string, unknown>;
  requiresAck?: boolean;
}
```

2. Specific message types extend these base interfaces:

```typescript
// Context-specific request message
export interface ContextRequestMessage extends RequestMessage {
  sourceContext: string;
  targetContext: string;
  dataType: string;
}

// Context-specific response message
export interface ContextResponseMessage extends ResponseMessage {
  sourceContext: string;
  targetContext: string;
  data?: Record<string, unknown>;
}

// Context-specific notification
export interface ContextNotificationMessage extends NotificationMessage {
  sourceContext: string;
  targetContext: string;
  notificationType: string;
}
```

### Benefits

- Reduces duplication through proper inheritance
- Clarifies relationships between message types
- Simplifies message processing code
- Makes it easier to add new message types in the future

## Priority 2: Storage Interface Unification

### Current State

The codebase has multiple overlapping storage interfaces:

1. `src/contexts/core/storageInterface.ts` - Generic CRUD operations with search/list
2. `src/services/interfaces/IRepository.ts` - Minimal CRUD operations
3. `src/services/interfaces/ISearchService.ts` - Search functionality separately defined

These interfaces represent essentially the same concepts with different naming conventions and method signatures.

### Proposed Changes

1. Create a unified storage interface hierarchy:

```typescript
// Base entity interface
export interface Entity<TId = string> {
  id: TId;
}

// Common search/list options
export interface QueryOptions {
  filter?: Record<string, unknown>;
  tags?: string[];
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Base repository interface for all storage operations
export interface Repository<TEntity extends Entity, TId = string> {
  // Core CRUD operations
  create(item: Omit<TEntity, 'id'>): Promise<TId>;
  read(id: TId): Promise<TEntity | null>;
  update(id: TId, updates: Partial<TEntity>): Promise<boolean>;
  delete(id: TId): Promise<boolean>;
  
  // Query operations
  find(options?: QueryOptions): Promise<TEntity[]>;
  count(options?: QueryOptions): Promise<number>;
  
  // Specialized query operations
  findRelated(id: TId, limit?: number): Promise<TEntity[]>;
}
```

2. Create adapters for backwards compatibility:

```typescript
// Legacy adapter for StorageInterface
export class StorageAdapter<T, TId = string> implements StorageInterface<T, TId> {
  constructor(private repository: Repository<T & Entity<TId>, TId>) {}
  
  // Implement StorageInterface methods using Repository
  async search(criteria: SearchCriteria): Promise<T[]> {
    return this.repository.find({ filter: criteria });
  }
  
  async list(options?: ListOptions): Promise<T[]> {
    return this.repository.find(options);
  }
  
  // ...other methods
}
```

### Benefits

- Single source of truth for storage operations
- Consistent naming and patterns
- Reduced code duplication
- Clear path for incremental migration

## Priority 3: Context Interface Streamlining

### Current State

The `ContextInterface` in `src/contexts/core/contextInterface.ts` mixes core functionality with MCP-specific concerns:

- Core context lifecycle methods: `initialize()`, `isReady()`, `getStatus()`
- MCP-specific methods: `registerOnServer()`, `getMcpServer()`, `getResources()`, `getTools()`

### Proposed Changes

1. Split the interface into core and MCP-specific concerns:

```typescript
// Core context interface (no MCP dependencies)
export interface CoreContextInterface {
  initialize(): Promise<boolean>;
  isReady(): boolean;
  getStatus(): ContextStatus;
}

// MCP extension interface
export interface McpContextInterface extends CoreContextInterface {
  registerOnServer(server: McpServer): boolean;
  getMcpServer(): McpServer;
  getCapabilities(): ContextCapabilities;
}

// Combined capabilities replacing separate resource/tool methods
export interface ContextCapabilities {
  resources: ResourceDefinition[];
  tools: ResourceDefinition[];
  features: string[];
}
```

2. Update implementations to use the new interfaces.

### Benefits

- Better separation of concerns
- Reduced coupling to MCP implementation
- Easier to create context implementations that don't need MCP
- Consolidates related functionality (resources/tools) into a single method

## Implementation Plan

1. **Phase 1: Message Type Consolidation**
   - Create new unified message interfaces
   - Update message handlers to support both old and new formats
   - Gradually migrate code to the new message types
   - Add deprecation notices to old interfaces

2. **Phase 2: Storage Interface Unification**
   - Create unified Repository interface
   - Implement adapters for backward compatibility
   - Update one repository implementation at a time
   - Update contexts to use the new interface

3. **Phase 3: Context Interface Streamlining**
   - Split interface into core and MCP variants
   - Update context implementations to match new interface
   - Consolidate resource/tool methods

Each phase should be implemented incrementally with thorough testing to ensure backward compatibility during the transition.