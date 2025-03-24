import { db } from '../../db';
import { profiles } from '../../db/schema';
import { eq, isNull, not } from 'drizzle-orm';
import type { Profile, EnhancedProfile } from '../../models/profile';
import { nanoid } from 'nanoid';
import { EmbeddingService } from '../model/embeddings';
import { extractTags } from '../../utils/tagExtractor';

export class ProfileContext {
  private embeddingService: EmbeddingService;
  private profile?: Profile;

  constructor(apiKey?: string) {
    this.embeddingService = new EmbeddingService(apiKey);
    // Load profile asynchronously
    this.loadProfile();
  }
  
  /**
   * Load the profile data asynchronously
   */
  private async loadProfile(): Promise<void> {
    try {
      this.profile = await this.getProfile();
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }

  /**
   * Retrieve the user profile
   */
  async getProfile(): Promise<Profile | undefined> {
    const result = await db.select().from(profiles).limit(1);
    return result[0];
  }

  /**
   * Create or update the user profile with automatic tag generation
   */
  async saveProfile(profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'embedding' | 'tags'> & { embedding?: number[], tags?: string[] }): Promise<string> {
    const now = new Date();
    
    // Generate embedding if not provided
    let embedding = profile.embedding;
    if (!embedding) {
      try {
        const profileText = this.getProfileTextForEmbedding(profile);
        const result = await this.embeddingService.getEmbedding(profileText);
        embedding = result.embedding;
      } catch (error) {
        console.error('Error generating profile embedding:', error);
      }
    }
    
    // Generate tags if not provided
    let tags = profile.tags;
    if (!tags || tags.length === 0) {
      try {
        console.log('Generating tags for profile...');
        const profileText = this.getProfileTextForEmbedding(profile);
        tags = await this.generateProfileTags(profileText);
        console.log(`Generated ${tags.length} tags: ${tags.join(', ')}`);
      } catch (error) {
        console.error('Error generating profile tags:', error);
      }
    }
    
    // Check if a profile already exists
    const existingProfile = await this.getProfile();
    
    if (existingProfile) {
      // Update existing profile
      await db.update(profiles)
        .set({
          ...profile,
          embedding,
          tags,
          updatedAt: now
        })
        .where(eq(profiles.id, existingProfile.id));
      
      return existingProfile.id;
    } else {
      // Create new profile
      const id = nanoid();
      
      await db.insert(profiles).values({
        id,
        ...profile,
        embedding,
        tags,
        createdAt: now,
        updatedAt: now
      });
      
      return id;
    }
  }

  /**
   * Merge partial data into existing profile
   */
  async updateProfile(profileData: Partial<Profile>): Promise<void> {
    const existingProfile = await this.getProfile();
    
    if (!existingProfile) {
      throw new Error('No profile exists to update');
    }
    
    const now = new Date();
    
    // If profile content is being updated, regenerate the embedding
    if (this.shouldRegenerateEmbedding(profileData)) {
      try {
        // Get full profile with updates to generate embedding
        const updatedProfile = { ...existingProfile, ...profileData };
        const profileText = this.getProfileTextForEmbedding(updatedProfile);
        const result = await this.embeddingService.getEmbedding(profileText);
        
        await db.update(profiles)
          .set({
            ...profileData,
            embedding: result.embedding,
            updatedAt: now
          })
          .where(eq(profiles.id, existingProfile.id));
          
        return;
      } catch (error) {
        console.error('Error regenerating profile embedding:', error);
      }
    }
    
    // Regular update without regenerating embedding
    await db.update(profiles)
      .set({
        ...profileData,
        updatedAt: now
      })
      .where(eq(profiles.id, existingProfile.id));
  }

  /**
   * Generate or update embeddings for the profile
   */
  async generateEmbeddingForProfile(): Promise<{ updated: boolean }> {
    const profile = await this.getProfile();
    if (!profile) {
      console.log('No profile found to generate embedding for');
      return { updated: false };
    }

    try {
      const profileText = this.getProfileTextForEmbedding(profile);
      const result = await this.embeddingService.getEmbedding(profileText);

      await db.update(profiles)
        .set({ embedding: result.embedding })
        .where(eq(profiles.id, profile.id));

      console.log(`Updated embedding for profile: ${profile.id}`);
      return { updated: true };
    } catch (error) {
      console.error(`Failed to update embedding for profile ${profile.id}:`, error);
      return { updated: false };
    }
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
   * Generate tags for a profile using AI
   * @param profileText Formatted profile text
   * @returns Array of generated tags
   */
  async generateProfileTags(profileText: string): Promise<string[]> {
    try {
      // Use the AI-based tag extractor
      const tags = await extractTags(profileText, [], 10);
      
      // Make sure we got valid tags
      if (!tags || tags.length === 0) {
        console.warn('No tags were generated, using fallback keywords');
        return this.extractProfileKeywords(this.profile || {});
      }
      
      return tags;
    } catch (error) {
      console.error('Error generating profile tags:', error);
      // Fallback to keyword extraction from profile
      return this.extractProfileKeywords(this.profile || {});
    }
  }
  
  /**
   * Update or generate tags for an existing profile
   * @param forceRegenerate Whether to force regeneration even if tags exist
   * @returns The updated tags
   */
  async updateProfileTags(forceRegenerate: boolean = false): Promise<string[] | null> {
    const profile = await this.getProfile();
    
    if (!profile) {
      console.log('No profile found to generate tags for');
      return null;
    }
    
    // Check if we need to generate tags
    if (!forceRegenerate && profile.tags && profile.tags.length > 0) {
      console.log('Profile already has tags, skipping generation');
      return profile.tags;
    }
    
    try {
      // Generate profile text for tagging
      const profileText = this.getProfileTextForEmbedding(profile);
      
      // Generate tags
      const tags = await this.generateProfileTags(profileText);
      
      // Update the profile with the new tags
      await db.update(profiles)
        .set({ tags })
        .where(eq(profiles.id, profile.id));
      
      console.log(`Updated tags for profile: ${tags.join(', ')}`);
      return tags;
    } catch (error) {
      console.error('Error updating profile tags:', error);
      return null;
    }
  }

  /**
   * Extract keywords from profile to use for searching notes
   */
  extractProfileKeywords(profile: Profile): string[] {
    const keywords: string[] = [];
    
    // Add important terms from summary
    if (profile.summary) {
      // Extract key terms from summary (skip common words)
      const summaryTerms = profile.summary
        .toLowerCase()
        .split(/\W+/)
        .filter(term => 
          term.length > 3 && 
          !['the', 'and', 'that', 'with', 'have', 'this', 'from'].includes(term)
        );
      keywords.push(...summaryTerms);
    }
    
    // Add job titles
    if (profile.experiences) {
      profile.experiences.forEach(exp => {
        if (exp.title) {
          // Split title into words and add
          const titleParts = exp.title.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...titleParts);
        }
      });
    }
    
    // Add skills
    if (profile.languages) {
      keywords.push(...profile.languages.map(lang => lang.toLowerCase()));
    }
    
    // Add education fields and majors
    if (profile.education) {
      profile.education.forEach(edu => {
        if (edu.degree) {
          const degreeParts = edu.degree.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...degreeParts);
        }
      });
    }
    
    // Add projects
    if (profile.accomplishmentProjects) {
      profile.accomplishmentProjects.forEach(proj => {
        if (proj.name) {
          const projParts = proj.name.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...projParts);
        }
      });
    }
    
    // Remove duplicates and return
    return [...new Set(keywords)];
  }
  
  /**
   * Find notes that are related to the profile based on keywords or tags
   */
  async findRelatedNotes(noteContext: any, limit = 5): Promise<any[]> {
    const profile = await this.getProfile();
    if (!profile) {
      return [];
    }
    
    // First try to find notes based on tags if available
    if (profile.tags && profile.tags.length > 0) {
      try {
        console.log(`Finding notes with similar tags to profile: ${profile.tags.join(', ')}`);
        const tagResults = await this.findNotesWithSimilarTags(noteContext, profile.tags, limit);
        
        // If we found notes with tags, return them
        if (tagResults.length > 0) {
          return tagResults;
        }
      } catch (tagError) {
        console.error('Error finding notes with similar tags:', tagError);
      }
    }
    
    // Extract keywords from profile as fallback
    const keywords = this.extractProfileKeywords(profile);
    
    // Search for notes with these keywords
    try {
      // If profile has embeddings, use semantic search with profile embedding
      if (profile.embedding) {
        const results = await noteContext.searchNotesWithEmbedding(
          profile.embedding, 
          limit
        );
        return results;
      } else {
        // Otherwise fall back to keyword search
        const results = await noteContext.searchNotes({
          query: keywords.slice(0, 10).join(' '), // Use top 10 keywords
          limit
        });
        return results;
      }
    } catch (error) {
      console.error('Error finding notes related to profile:', error);
      return [];
    }
  }
  
  /**
   * Find notes that have similar tags to the profile
   * @param noteContext Note context instance
   * @param profileTags Array of profile tags
   * @param limit Maximum number of notes to return
   * @returns Array of notes with matching tags
   */
  async findNotesWithSimilarTags(noteContext: any, profileTags: string[], limit = 5): Promise<any[]> {
    if (!profileTags || profileTags.length === 0) {
      return [];
    }
    
    // Get all notes with tags
    const allNotes = await noteContext.searchNotes({
      limit: 100,
      includeContent: false // Just get metadata to save bandwidth
    });
    
    // Filter to notes that have tags
    const notesWithTags = allNotes.filter(note => note.tags && note.tags.length > 0);
    
    // Score each note based on tag matches
    const scoredNotes = notesWithTags.map(note => {
      // Count how many profile tags match this note's tags
      const matchCount = note.tags.reduce((count, noteTag) => {
        // Look for direct matches or partial matches (hyphenated tags)
        const directMatch = profileTags.includes(noteTag);
        
        // Look for partial matches (e.g. "ecosystem" matches "ecosystem-architecture")
        const partialMatch = !directMatch && profileTags.some(profileTag => 
          noteTag.includes(profileTag) || profileTag.includes(noteTag)
        );
        
        return count + (directMatch ? 1 : partialMatch ? 0.5 : 0);
      }, 0);
      
      return {
        ...note,
        tagScore: matchCount,
        matchRatio: matchCount / note.tags.length // Normalize by number of tags
      };
    });
    
    // Sort by tag match score (higher is better)
    const sortedNotes = scoredNotes
      .filter(note => note.tagScore > 0) // Only include notes with at least one tag match
      .sort((a, b) => {
        // First sort by absolute number of matches
        if (b.tagScore !== a.tagScore) {
          return b.tagScore - a.tagScore;
        }
        // Then by ratio of matches to total tags (higher is better)
        return b.matchRatio - a.matchRatio;
      })
      .map(note => {
        // Remove our scoring properties before returning
        const { tagScore, matchRatio, ...cleanNote } = note;
        return cleanNote;
      });
    
    // Return top N results
    return sortedNotes.slice(0, limit);
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
    if (profile.experiences && profile.experiences.length > 0) {
      parts.push('Experience:');
      profile.experiences.forEach(exp => {
        const duration = [exp.startDate, exp.endDate].filter(Boolean).join(' - ');
        parts.push(`- ${exp.title} at ${exp.company} (${duration})`);
        if (exp.description) parts.push(`  ${exp.description}`);
      });
    }

    // Add education
    if (profile.education && profile.education.length > 0) {
      parts.push('Education:');
      profile.education.forEach(edu => {
        parts.push(`- ${edu.degree} at ${edu.school}`);
      });
    }

    // Add publications
    if (profile.accomplishmentPublications && profile.accomplishmentPublications.length > 0) {
      parts.push('Publications:');
      profile.accomplishmentPublications.forEach(pub => {
        parts.push(`- ${pub.name}`);
        if (pub.description) parts.push(`  ${pub.description}`);
      });
    }

    // Add projects
    if (profile.accomplishmentProjects && profile.accomplishmentProjects.length > 0) {
      parts.push('Projects:');
      profile.accomplishmentProjects.forEach(proj => {
        parts.push(`- ${proj.name}`);
        if (proj.description) parts.push(`  ${proj.description}`);
      });
    }

    // Join all parts with newlines
    return parts.join('\n');
  }
}