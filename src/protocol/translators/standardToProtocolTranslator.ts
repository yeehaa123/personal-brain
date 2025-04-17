/**
 * Standard to Protocol Response Translator
 * 
 * This translator converts from the StandardResponse format to the
 * traditional ProtocolResponse format for backward compatibility.
 */

import type { StandardResponse } from '@/protocol/formats/schemas/standardResponseSchema';
import type { ProtocolResponse } from '@/protocol/types';
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';

/**
 * Convert StandardResponse to the traditional ProtocolResponse format
 * This provides backward compatibility with existing renderers
 * 
 * @param standardResponse The schema-validated response from the model
 * @param relatedNotes Array of related notes to include in the response
 * @param profile Optional profile to include in the response
 * @returns A ProtocolResponse compatible with existing renderers
 */
export function standardToProtocolResponse(
  standardResponse: StandardResponse,
  relatedNotes: Note[] = [],
  profile?: Profile,
): ProtocolResponse {
  // Always include the answer
  const result: ProtocolResponse = {
    answer: standardResponse.answer,
    citations: [],
    relatedNotes,
    profile: standardResponse.metadata.usedProfile ? profile : undefined,
    externalSources: undefined,
  };

  // If we have citations, include them
  if (standardResponse.metadata.citations?.length) {
    result.citations = standardResponse.metadata.citations.map(citation => ({
      noteId: citation.noteId,
      noteTitle: citation.noteTitle,
      excerpt: citation.excerpt || '',
    }));
  }

  // If we have external sources, include them
  if (standardResponse.metadata.externalSources?.length) {
    result.externalSources = standardResponse.metadata.externalSources.map(source => ({
      title: source.title,
      source: source.source,
      url: source.url,
      excerpt: source.excerpt || '',
    }));
  }

  return result;
}