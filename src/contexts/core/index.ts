/**
 * Core interfaces for the MCP context architecture
 * 
 * This module exports the base interfaces and abstract classes that define 
 * the standard contracts for all context components in the system.
 */

export type {
  CoreContextInterface,
  ContextInterface,
  McpContextInterface,
  ContextStatus,
  ResourceDefinition,
  ContextCapabilities,
} from './contextInterface';

export type {
  StorageInterface,
  SearchCriteria,
  ListOptions,
} from './storageInterface';

export type {
  FormatterInterface,
  FormattingOptions,
} from './formatterInterface';

export { BaseContext } from './baseContext';