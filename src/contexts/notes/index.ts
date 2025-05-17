/**
 * Export NoteContext implementation
 * 
 * During migration: Exports both old and new implementations
 */
export { NoteContext } from './noteContext';
export { MCPNoteContext } from './MCPNoteContext';
export { NoteStorageAdapter } from './noteStorageAdapter';
export type { NoteContextConfig } from './noteContext';
export type { MCPNoteContextConfig, MCPNoteContextDependencies } from './MCPNoteContext';