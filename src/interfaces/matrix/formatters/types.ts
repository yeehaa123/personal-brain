/**
 * Common types for Matrix formatters
 */

import type { DeploymentInfo, WebsiteConfig } from '@/mcp/contexts/website/storage/websiteStorage';
import type { LandingPageData } from '@website/schemas';

// Note model properties we need for formatting

/**
 * Note preview type for search results and related notes
 */
/**
 * Compatible with Note but with more flexible types for Matrix formatting
 */
export interface NotePreview {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  similarity?: number;
  // Additional properties used in Note type, all optional
  embedding?: number[] | null;
  source?: 'conversation' | 'import' | 'user-created';
  conversationMetadata?: {
    conversationId: string;
    timestamp: Date;
    userName?: string;
    promptSegment?: string;
  } | null;
  confidence?: number | null;
  verified?: boolean | null;
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
 * Website configuration result
 */
export interface WebsiteConfigResult {
  type: 'website-config';
  config?: WebsiteConfig;
  success?: boolean;
  message: string;
}

/**
 * Website help result
 */
export interface WebsiteHelpResult {
  type: 'website-help';
  commands: Array<{
    command: string;
    description: string;
    usage: string;
    examples?: string[];
  }>;
}

/**
 * Website initialization result
 */
export interface WebsiteInitResult {
  type: 'website-init';
  success: boolean;
  message: string;
  deploymentInfo?: DeploymentInfo;
}

/**
 * Landing page result
 */
export interface LandingPageResult {
  type: 'landing-page';
  success?: boolean;
  message?: string;
  data?: LandingPageData;
}

/**
 * Website preview result
 */
export interface WebsitePreviewResult {
  type: 'website-preview';
  success: boolean;
  url?: string;
  message: string;
}

/**
 * Website preview stop result
 */
export interface WebsitePreviewStopResult {
  type: 'website-preview-stop';
  success: boolean;
  message: string;
}

/**
 * Website build result
 */
export interface WebsiteBuildResult {
  type: 'website-build';
  success: boolean;
  message: string;
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