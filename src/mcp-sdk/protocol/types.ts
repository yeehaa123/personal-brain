/**
 * Types for the MCP protocol
 */
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';

// No need to re-export since these are already exported below

/**
 * Response from the protocol containing an answer and context
 */
export interface ProtocolResponse {
  /** The answer from the LLM */
  answer: string;
  /** Citations to notes used in the answer */
  citations: Citation[];
  /** Related notes for follow-up */
  relatedNotes: Note[];
  /** User profile if relevant to the query */
  profile?: Profile;
  /** External source citations */
  externalSources?: ExternalCitation[];
}

/**
 * Citation to a note used in an answer
 */
export interface Citation {
  /** ID of the cited note */
  noteId: string;
  /** Title of the cited note */
  noteTitle: string;
  /** Excerpt from the note */
  excerpt: string;
}

/**
 * Citation to an external source
 */
export interface ExternalCitation {
  /** Title of the external source */
  title: string;
  /** Source name (e.g., "Wikipedia") */
  source: string;
  /** URL of the source */
  url: string;
  /** Excerpt from the content */
  excerpt: string;
}