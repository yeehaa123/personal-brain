/**
 * Common types for Matrix formatters
 */

// Note model properties we need for formatting

/**
 * Note preview type for search results and related notes
 */
export interface NotePreview {
  id: string;
  title: string;
  content: string;
  tags?: string[] | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  similarity?: number;
}

/**
 * Citation source types
 */
export type CitationSourceType = 'note' | 'webpage' | 'article' | 'conversation';

/**
 * Citation data interface
 */
export interface Citation {
  source: string;
  title?: string;
  content: string;
  url?: string;
  type: CitationSourceType;
  id?: string;
  date?: string;
}

/**
 * System status interface
 */
export interface SystemStatus {
  apiConnected: boolean;
  dbConnected: boolean;
  noteCount: number;
  externalSourcesEnabled: boolean;
  externalSources: Record<string, boolean>;
}

/**
 * Note save preview result
 */
export interface SaveNotePreviewResult {
  noteContent: string;
  title: string;
  conversationId: string;
}

/**
 * Note save confirmation result
 */
export interface SaveNoteConfirmResult {
  noteId: string;
  title: string;
}

/**
 * Citation reference
 */
export interface CitationReference {
  noteId: string;
  noteTitle: string;
  excerpt?: string;
}

/**
 * UI block types
 */
export type BlockType = 'header' | 'section' | 'divider' | 'image' | 'context';

/**
 * UI block content
 */
export interface BlockContent {
  type: BlockType;
  text?: string;
  elements?: string[];
  level?: number;
  imageUrl?: string;
  altText?: string;
}