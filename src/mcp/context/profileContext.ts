import { db } from '../../db';
import { profiles } from '../../db/schema';
import { eq, SQL } from 'drizzle-orm';
import type { 
  Profile, 
  ProfileEducation, 
  ProfileExperience, 
  ProfilePublication, 
  ProfileProject 
} from '../../models/profile';
import { nanoid } from 'nanoid';
import { EmbeddingService } from '../model/embeddings';
import { extractTags } from '../../utils/tagExtractor';

interface NoteContext {
  searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<any[]>;
  searchNotes: (options: { query?: string; limit?: number; includeContent?: boolean }) => Promise<any[]>;
}

/**
 * Manages a user profile with vector embeddings and tag generation
 */
export class ProfileContext {
  private embeddingService: EmbeddingService;

  constructor(apiKey?: string) {
    this.embeddingService = new EmbeddingService(apiKey);
  }

  /**
   * Retrieve the user profile
   */
  async getProfile(): Promise<Profile | undefined> {
    const result = await db.select().from(profiles).limit(1);
    return result[0];
  }

  /**
   * Create or update the user profile with automatic tag and embedding generation
   */
  async saveProfile(
    profileData: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'embedding' | 'tags'> & { 
      embedding?: number[]; 
      tags?: string[] 
    }
  ): Promise<string> {
    const now = new Date();
    const profileText = this.getProfileTextForEmbedding(profileData);
    
    // Generate embedding if not provided
    const embedding = profileData.embedding || await this.generateEmbedding(profileText);
    
    // Generate tags if not provided
    const tags = profileData.tags?.length 
      ? profileData.tags
      : await this.generateProfileTags(profileText);

    // Check if a profile already exists
    const existingProfile = await this.getProfile();

    if (existingProfile) {
      // Update existing profile
      const updateData: any = {
        ...profileData,
        updatedAt: now
      };
      
      // Only set these fields if we have values
      if (embedding?.length) updateData.embedding = embedding;
      if (tags?.length) updateData.tags = tags;

      await db.update(profiles)
        .set(updateData)
        .where(eq(profiles.id, existingProfile.id));

      return existingProfile.id;
    } else {
      // Create new profile
      const id = nanoid();
      
      const insertData: any = {
        id,
        ...profileData,
        createdAt: now,
        updatedAt: now
      };
      
      // Only set these fields if we have values
      if (embedding?.length) insertData.embedding = embedding;
      if (tags?.length) insertData.tags = tags;

      await db.insert(profiles).values(insertData);

      return id;
    }
  }

  /**
   * Update partial profile data with automatic embedding regeneration when needed
   */
  async updateProfile(profileData: Partial<Profile>): Promise<void> {
    const existingProfile = await this.getProfile();

    if (!existingProfile) {
      throw new Error('No profile exists to update');
    }

    const now = new Date();
    const updatedData: Record<string, any> = { ...profileData, updatedAt: now };

    // If profile content is being updated, regenerate the embedding
    if (this.shouldRegenerateEmbedding(profileData)) {
      const updatedProfile = { ...existingProfile, ...profileData };
      const profileText = this.getProfileTextForEmbedding(updatedProfile);
      const embedding = await this.generateEmbedding(profileText);
      
      if (embedding?.length) {
        updatedData.embedding = embedding;
      }
    }

    // Update the profile with all changes
    await db.update(profiles)
      .set(updatedData as any)
      .where(eq(profiles.id, existingProfile.id));
  }

  /**
   * Generate or update embeddings for the profile
   */
  async generateEmbeddingForProfile(): Promise<{ updated: boolean }> {
    const profile = await this.getProfile();
    if (!profile) {
      return { updated: false };
    }

    try {
      const profileText = this.getProfileTextForEmbedding(profile);
      const embedding = await this.generateEmbedding(profileText);

      await db.update(profiles)
        .set({ embedding: embedding } as any)
        .where(eq(profiles.id, profile.id));

      return { updated: true };
    } catch (error) {
      console.error(`Failed to update embedding for profile ${profile.id}:`, error);
      return { updated: false };
    }
  }

  /**
   * Update or generate tags for an existing profile
   */
  async updateProfileTags(forceRegenerate = false): Promise<string[] | null> {
    const profile = await this.getProfile();

    if (!profile) {
      return null;
    }

    // Check if we need to generate tags
    if (!forceRegenerate && profile.tags && profile.tags.length > 0) {
      return profile.tags as string[];
    }

    try {
      const profileText = this.getProfileTextForEmbedding(profile);
      const tags = await this.generateProfileTags(profileText);

      await db.update(profiles)
        .set({ tags: tags } as any)
        .where(eq(profiles.id, profile.id));

      return tags;
    } catch (error) {
      console.error('Error updating profile tags:', error);
      return null;
    }
  }

  /**
   * Find notes related to the profile using tags or embeddings
   */
  async findRelatedNotes(noteContext: NoteContext, limit = 5): Promise<any[]> {
    const profile = await this.getProfile();
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
        console.error('Error finding notes with similar tags:', error);
      }
    }

    // Fall back to embedding or keyword search
    try {
      // If profile has embeddings, use semantic search
      if (profile.embedding?.length) {
        return await noteContext.searchNotesWithEmbedding(
          profile.embedding as number[],
          limit
        );
      } 
      
      // Otherwise fall back to keyword search
      const keywords = this.extractProfileKeywords(profile);
      return await noteContext.searchNotes({
        query: keywords.slice(0, 10).join(' '), // Use top 10 keywords
        limit
      });
    } catch (error) {
      console.error('Error finding notes related to profile:', error);
      return [];
    }
  }

  /**
   * Find notes that have similar tags to the profile
   */
  async findNotesWithSimilarTags(
    noteContext: NoteContext, 
    profileTags: string[], 
    limit = 5
  ): Promise<any[]> {
    if (!profileTags?.length) {
      return [];
    }

    // Get all notes with tags
    const allNotes = await noteContext.searchNotes({
      limit: 100,
      includeContent: false
    });

    // Filter to notes that have tags and score them
    const scoredNotes = allNotes
      .filter(note => note.tags?.length > 0)
      .map(note => {
        const matchCount = this.calculateTagMatchScore(note.tags, profileTags);
        return {
          ...note,
          tagScore: matchCount,
          matchRatio: matchCount / note.tags.length
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
      .map(({ tagScore, matchRatio, ...note }) => note);

    return sortedNotes.slice(0, limit);
  }

  // PRIVATE METHODS

  /**
   * Calculate how well tags match between a note and profile
   */
  private calculateTagMatchScore(noteTags: string[], profileTags: string[]): number {
    return noteTags.reduce((count, noteTag) => {
      // Direct match (exact tag match)
      const directMatch = profileTags.includes(noteTag);
      
      // Partial match (tag contains or is contained by a profile tag)
      const partialMatch = !directMatch && profileTags.some(profileTag =>
        noteTag.includes(profileTag) || profileTag.includes(noteTag)
      );
      
      return count + (directMatch ? 1 : partialMatch ? 0.5 : 0);
    }, 0);
  }

  /**
   * Generate embedding for profile text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingService.getEmbedding(text);
      return result.embedding;
    } catch (error) {
      console.error('Error generating profile embedding:', error);
      return [];
    }
  }

  /**
   * Generate tags for a profile using AI
   */
  private async generateProfileTags(profileText: string): Promise<string[]> {
    try {
      const tags = await extractTags(profileText, [], 10);
      
      if (!tags?.length) {
        const profile = await this.getProfile();
        return this.extractProfileKeywords(profile || {});
      }
      
      return tags;
    } catch (error) {
      console.error('Error generating profile tags:', error);
      const profile = await this.getProfile();
      return this.extractProfileKeywords(profile || {});
    }
  }

  /**
   * Extract keywords from profile to use for searching notes
   */
  extractProfileKeywords(profile: Partial<Profile>): string[] {
    const keywords: string[] = [];
    const commonWords = ['the', 'and', 'that', 'with', 'have', 'this', 'from'];

    // Add important terms from summary
    if (profile.summary) {
      const summaryTerms = profile.summary
        .toLowerCase()
        .split(/\W+/)
        .filter(term => term.length > 3 && !commonWords.includes(term));
      keywords.push(...summaryTerms);
    }

    // Add job titles
    if (profile.experiences?.length) {
      (profile.experiences as ProfileExperience[]).forEach((exp: ProfileExperience) => {
        if (exp.title) {
          const titleParts = exp.title.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...titleParts);
        }
      });
    }

    // Add languages
    if (profile.languages?.length) {
      keywords.push(...(profile.languages as string[]).map(lang => lang.toLowerCase()));
    }

    // Add education fields
    if (profile.education?.length) {
      (profile.education as ProfileEducation[]).forEach((edu: ProfileEducation) => {
        if (edu.degree_name) {
          const degreeParts = edu.degree_name.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...degreeParts);
        }
      });
    }

    // Add projects
    if (profile.accomplishmentProjects?.length) {
      (profile.accomplishmentProjects as ProfileProject[]).forEach((proj: ProfileProject) => {
        if (proj.title) {
          const projParts = proj.title.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...projParts);
        }
      });
    }

    // Remove duplicates
    return Array.from(new Set(keywords));
  }

  /**
   * Check if the profile changes require regenerating the embedding
   */
  private shouldRegenerateEmbedding(profileData: Partial<Profile>): boolean {
    // Fields that affect the semantic meaning of the profile
    const semanticFields: (keyof Profile)[] = [
      'fullName', 'occupation', 'headline', 'summary',
      'experiences', 'education', 'accomplishmentProjects',
      'accomplishmentPublications', 'accomplishmentHonorsAwards',
      'volunteerWork'
    ];

    return semanticFields.some(field => field in profileData);
  }

  /**
   * Prepare profile text for embedding
   */
  private getProfileTextForEmbedding(profile: Partial<Profile>): string {
    const parts: string[] = [];

    // Add basic profile information
    if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
    if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
    if (profile.headline) parts.push(`Headline: ${profile.headline}`);
    if (profile.summary) parts.push(`Summary: ${profile.summary}`);

    // Add location information
    const location = [profile.city, profile.state, profile.countryFullName]
      .filter(Boolean)
      .join(', ');
    if (location) parts.push(`Location: ${location}`);

    // Add experiences
    if (profile.experiences?.length) {
      parts.push('Experience:');
      (profile.experiences as ProfileExperience[]).forEach((exp: ProfileExperience) => {
        const duration = [exp.starts_at, exp.ends_at].filter(Boolean).join(' - ');
        parts.push(`- ${exp.title} at ${exp.company} (${duration})`);
        if (exp.description) parts.push(`  ${exp.description}`);
      });
    }

    // Add education
    if (profile.education?.length) {
      parts.push('Education:');
      (profile.education as ProfileEducation[]).forEach((edu: ProfileEducation) => {
        parts.push(`- ${edu.degree_name} at ${edu.school}`);
      });
    }

    // Add publications
    if (profile.accomplishmentPublications?.length) {
      parts.push('Publications:');
      (profile.accomplishmentPublications as ProfilePublication[]).forEach((pub: ProfilePublication) => {
        parts.push(`- ${pub.name}`);
        if (pub.description) parts.push(`  ${pub.description}`);
      });
    }

    // Add projects
    if (profile.accomplishmentProjects?.length) {
      parts.push('Projects:');
      (profile.accomplishmentProjects as ProfileProject[]).forEach((proj: ProfileProject) => {
        parts.push(`- ${proj.title}`);
        if (proj.description) parts.push(`  ${proj.description}`);
      });
    }

    return parts.join('\n');
  }
}