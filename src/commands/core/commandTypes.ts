/**
 * Command types and interfaces
 * Defines the common types used throughout the command system
 */

import type { ExternalCitation } from '@/mcp';
import type { LandingPageData, WebsiteConfig } from '@/mcp/contexts/website/storage/websiteStorage';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';

/**
 * Interface for command descriptions
 */
export interface CommandInfo {
  command: string;
  description: string;
  usage: string;
  examples?: string[];
}

/**
 * Union type for all website command result types
 */
export type WebsiteCommandResult =
  | { type: 'website-help'; commands: CommandInfo[] }
  | { type: 'website-config'; success?: boolean; config?: WebsiteConfig; message: string }
  | { type: 'landing-page'; success?: boolean; message?: string; data?: LandingPageData }
  | { type: 'website-build'; success: boolean; message: string; url?: string; output?: string }
  | { type: 'website-promote'; success: boolean; message: string; url?: string }
  | { type: 'website-status'; success: boolean; message: string; data?: { 
      environment: string;
      buildStatus: string;
      fileCount: number;
      caddyStatus: string;
      domain: string;
      accessStatus: string;
      url: string;
    } };

/**
 * Union type for all possible command result types
 */
export type CommandResult =
  | { type: 'error'; message: string }
  | { type: 'help'; commands: CommandInfo[] }
  | { type: 'profile'; profile: Profile }
  | { type: 'profile-related'; profile: Profile; relatedNotes: Note[]; matchType: 'tags' | 'semantic' | 'keyword' }
  | { type: 'notes'; notes: Note[]; title?: string }
  | { type: 'note'; note: Note }
  | { type: 'tags'; tags: Array<{ tag: string; count: number }> }
  | { type: 'search'; query: string; notes: Note[] }
  | { type: 'ask'; answer: string; citations: Array<{ noteId: string; noteTitle: string; excerpt: string }>; relatedNotes: Note[]; profile: Profile | undefined; externalSources: ExternalCitation[] | undefined }
  | { type: 'external'; enabled: boolean; message: string }
  | {
    type: 'status'; status: {
      apiConnected: boolean;
      dbConnected: boolean;
      noteCount: number;
      externalSources: Record<string, boolean>;
      externalSourcesEnabled: boolean;
    }
  }
  | { type: 'save-note-preview'; noteContent: string; title: string; conversationId: string }
  | { type: 'save-note-confirm'; noteId: string; title: string }
  | { type: 'conversation-notes'; notes: Note[] }
  | { type: 'website-help'; commands: CommandInfo[] }
  | { type: 'website-config'; success?: boolean; config?: WebsiteConfig; message: string }
  | { type: 'landing-page'; success?: boolean; message?: string; data?: LandingPageData }
  | { type: 'website-build'; success: boolean; message: string; url?: string; output?: string }
  | { type: 'website-promote'; success: boolean; message: string; url?: string }
  | { type: 'website-status'; success: boolean; message: string; data?: { 
      environment: string;
      buildStatus: string;
      fileCount: number;
      caddyStatus: string;
      domain: string;
      accessStatus: string;
      url: string;
    } };