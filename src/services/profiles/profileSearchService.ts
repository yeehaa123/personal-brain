/**
 * Service for profile-related search functionality
 */
import { ProfileRepository } from './profileRepository';
import { ProfileTagService } from './profileTagService';
import { isDefined } from '@/utils/safeAccessUtils';
import logger from '@/utils/logger';

interface NoteWithSimilarity {
  id: string;
  title: string;
  content: string;
  tags?: string[] | null;
  embedding?: number[] | null;
  similarity?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface NoteContext {
  searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<NoteWithSimilarity[]>;
  searchNotes: (options: { query?: string; tags?: string[]; limit?: number; includeContent?: boolean }) => Promise<NoteWithSimilarity[]>;
}

/**
 * Service for finding notes related to a profile
 */
export class ProfileSearchService {
  private repository: ProfileRepository;
  private tagService: ProfileTagService;

  /**
   * Create a new ProfileSearchService
   */
  constructor() {
    this.repository = new ProfileRepository();
    this.tagService = new ProfileTagService();
  }

  /**
   * Find notes related to the profile using tags or embeddings
   * @param noteContext The NoteContext for searching notes
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findRelatedNotes(noteContext: NoteContext, limit = 5): Promise<NoteWithSimilarity[]> {
    const profile = await this.repository.getProfile();
    if (!profile) {
      return [];
    }

    // Try to find notes based on tags if available
    if (profile.tags?.length) {
      try {
        const tagResults = await this.findNotesWithSimilarTags(noteContext, profile.tags as string[], limit);
        if (tagResults.length > 0) {
          return tagResults;
        }
      } catch (error) {
        logger.error('Error finding notes with similar tags', { 
          error: error instanceof Error ? error.message : String(error),
          context: 'ProfileSearchService',
        });
      }
    }

    // Fall back to embedding or keyword search
    try {
      // If profile has embeddings, use semantic search
      if (profile.embedding?.length) {
        return await noteContext.searchNotesWithEmbedding(
          profile.embedding as number[],
          limit,
        );
      }

      // Otherwise fall back to keyword search
      const keywords = this.tagService.extractProfileKeywords(profile);
      return await noteContext.searchNotes({
        query: keywords.slice(0, 10).join(' '), // Use top 10 keywords
        limit,
      });
    } catch (error) {
      logger.error('Error finding notes related to profile:', { 
        error: error instanceof Error ? error.message : String(error),
        context: 'ProfileSearchService',
      });
      return [];
    }
  }

  /**
   * Find notes that have similar tags to the profile
   * @param noteContext The NoteContext for searching notes
   * @param profileTags The profile tags to match against
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findNotesWithSimilarTags(
    noteContext: NoteContext,
    profileTags: string[],
    limit = 5,
  ): Promise<NoteWithSimilarity[]> {
    if (!profileTags?.length) {
      return [];
    }

    // Get all notes with tags
    const allNotes = await noteContext.searchNotes({
      limit: 100,
      includeContent: false,
    });

    // Filter to notes that have tags and score them
    const scoredNotes = allNotes
      .filter(note => note.tags && Array.isArray(note.tags) && note.tags.length > 0)
      .map(note => {
        // We know tags is not null from the filter above
        const noteTags = note.tags as string[]; 
        const matchCount = this.calculateTagMatchScore(noteTags, profileTags);
        return {
          ...note,
          tagScore: matchCount,
          matchRatio: matchCount / noteTags.length,
        };
      })
      .filter(note => note.tagScore > 0);

    // Sort by tag match score and ratio
    const sortedNotes = scoredNotes
      .sort((a, b) => {
        // First sort by absolute number of matches
        if (b.tagScore !== a.tagScore) {
          return b.tagScore - a.tagScore;
        }
        // Then by ratio of matches to total tags
        return b.matchRatio - a.matchRatio;
      })
      .map(({ tagScore: _tagScore, matchRatio: _matchRatio, ...note }) => note);

    return sortedNotes.slice(0, limit);
  }

  /**
   * Calculate how well tags match between a note and profile
   * @param noteTags The note tags to compare
   * @param profileTags The profile tags to compare against
   * @returns Weighted match score
   */
  private calculateTagMatchScore(noteTags: string[], profileTags: string[]): number {
    if (!isDefined(noteTags) || !isDefined(profileTags) || noteTags.length === 0 || profileTags.length === 0) {
      return 0;
    }
    
    return noteTags.reduce((count, noteTag) => {
      // Direct match (exact tag match)
      const directMatch = profileTags.includes(noteTag);

      // Partial match (tag contains or is contained by a profile tag)
      const partialMatch = !directMatch && profileTags.some(profileTag =>
        noteTag.includes(profileTag) || profileTag.includes(noteTag),
      );

      return count + (directMatch ? 1 : partialMatch ? 0.5 : 0);
    }, 0);
  }
}