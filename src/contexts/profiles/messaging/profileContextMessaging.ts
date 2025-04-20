/**
 * Messaging-Enabled Profile Context
 * 
 * This module extends the ProfileContext with messaging capabilities,
 * allowing it to participate in cross-context communication.
 */

import type { Profile } from '@/models/profile';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { ContextMediator } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { NoteContext } from '../../notes/noteContext';
import type { ProfileContext } from '../profileContext';
import type { NoteWithSimilarity } from '../profileTypes';

import { ProfileMessageHandler } from './profileMessageHandler';
import { ProfileNotifier } from './profileNotifier';

/**
 * Messaging-enabled extension of ProfileContext
 */
export class ProfileContextMessaging {
  private logger = Logger.getInstance();
  private notifier: ProfileNotifier;
  
  /**
   * Create a messaging-enabled wrapper for a ProfileContext
   * 
   * @param profileContext The profile context to extend
   * @param mediator The context mediator for messaging
   */
  constructor(
    private profileContext: ProfileContext,
    mediator: ContextMediator,
  ) {
    // Create notifier
    this.notifier = new ProfileNotifier(mediator);
    
    // Register message handler
    const handler = ProfileMessageHandler.createHandler(profileContext);
    mediator.registerHandler(ContextId.PROFILE, handler);
    
    this.logger.debug('ProfileContextMessaging initialized');
  }
  
  /**
   * Get the underlying profile context
   * @returns The profile context
   */
  getContext(): ProfileContext {
    return this.profileContext;
  }
  
  /**
   * Update profile with messaging support
   * 
   * @param profile The profile data to update
   * @returns The updated profile
   */
  async updateProfile(profile: Partial<Profile>): Promise<void> {
    // Delegate to the original context
    await this.profileContext.updateProfile(profile);
    
    // Get current profile to notify others
    const currentProfile = await this.profileContext.getProfile();
    
    // Notify other contexts if we have a profile
    if (currentProfile) {
      await this.notifier.notifyProfileUpdated(currentProfile);
    }
  }
  
  /**
   * Delegate all other methods to the original context
   * This ensures that the messaging-enabled context behaves
   * exactly like the original context, just with added messaging.
   */
  getProfile(): Promise<Profile | undefined> {
    return this.profileContext.getProfile();
  }
  
  /**
   * Get profile text for embedding
   * @param profile Profile to get text for
   * @returns Text representation of the profile
   */
  getProfileTextForEmbedding(profile: Partial<Profile>): string {
    return this.profileContext.getProfileTextForEmbedding(profile);
  }
  
  // Note: ProfileContext doesn't have getProfileById, getAllProfiles, searchProfiles, or getRelatedNotes methods
  // These methods should be implemented as adapters to the available methods

  /**
   * Find notes related to the profile using tags or embeddings
   * This proxies to the findRelatedNotes method if noteContext is available
   * 
   * @param noteContext The NoteContext for searching notes
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findRelatedNotes(
    noteContext: NoteContext, 
    limit = 5,
  ): Promise<NoteWithSimilarity[]> {
    if (typeof this.profileContext.findRelatedNotes === 'function') {
      return this.profileContext.findRelatedNotes(noteContext, limit);
    }
    
    this.logger.warn('findRelatedNotes not available on ProfileContext');
    return [];
  }
}