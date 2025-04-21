/**
 * Contexts Layer
 * 
 * This module exports the context components for interacting with different data domains.
 * Each context provides a specialized interface for a specific type of data or service.
 */

// Export specific components from each domain to avoid name collisions
import { ConversationContext } from './conversations';
import { BaseContext } from './core';
import type { 
  CoreContextInterface, 
  FormatterInterface, 
  McpContextInterface, 
  StorageInterface, 
} from './core';
import { ExternalSourceContext } from './externalSources';
import { NoteContext } from './notes';
import { ProfileContext } from './profiles';
import { WebsiteContext } from './website';

// Export the context classes
export { BaseContext };
export type { 
  CoreContextInterface, 
  McpContextInterface, 
  FormatterInterface, 
  StorageInterface, 
};

// Domain contexts
export {
  ConversationContext,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
  WebsiteContext,
};