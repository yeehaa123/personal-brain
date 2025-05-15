/**
 * Mock ProfileContextMessaging for testing
 */

import type { ProfileContext } from '@/contexts/profiles';
import type { ProfileContextMessaging } from '@/contexts/profiles/messaging/profileContextMessaging';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { Logger } from '@/utils/logger';

/**
 * Mock implementation of ProfileContextMessaging
 */
export class MockProfileContextMessaging {
  private static instance: MockProfileContextMessaging | null = null;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(profileContext: ProfileContext, mediator?: ContextMediator) {
    if (!MockProfileContextMessaging.instance) {
      MockProfileContextMessaging.instance = new MockProfileContextMessaging(profileContext, mediator);
    }
    return MockProfileContextMessaging.instance as unknown as ProfileContextMessaging;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockProfileContextMessaging.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(profileContext: ProfileContext, mediator?: ContextMediator) {
    return new MockProfileContextMessaging(profileContext, mediator) as unknown as ProfileContextMessaging;
  }
  private profileContext: ProfileContext;
  
  // Add missing properties to match the real implementation
  mediator: ContextMediator;
  notifier: { notifyProfileUpdated: () => Promise<void> };
  logger: Logger;
  
  constructor(profileContext: ProfileContext, mediator?: ContextMediator) {
    this.profileContext = profileContext;
    this.mediator = mediator || {} as ContextMediator;
    this.notifier = { notifyProfileUpdated: async () => {} };
    this.logger = Logger.getInstance();
  }
  
  /**
   * Get the wrapped profile context
   */
  getContext(): ProfileContext {
    return this.profileContext;
  }
  
  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    return this.profileContext.getProfile();
  }
  
  /**
   * Save the user profile
   */
  async saveProfile(profile: Profile): Promise<boolean> {
    const success = await this.profileContext.saveProfile(profile);
    
    // Simulate notification
    if (success) {
      await this.notifyProfileUpdated(profile);
    }
    
    return success;
  }
  
  /**
   * Update the user profile
   */
  async updateProfile(data: Partial<Profile>): Promise<boolean> {
    const success = await this.profileContext.updateProfile(data);
    
    // Simulate notification
    if (success) {
      const updatedProfile = await this.profileContext.getProfile();
      if (updatedProfile) {
        await this.notifyProfileUpdated(updatedProfile);
      }
    }
    
    return success;
  }
  
  /**
   * Get profile as a note
   */
  async getProfileAsNote(): Promise<Note | null> {
    return this.profileContext.getProfileAsNote();
  }
  
  
  /**
   * Migrate a LinkedIn profile
   */
  async migrateLinkedInProfile(linkedInProfile: LinkedInProfile): Promise<boolean> {
    const success = await this.profileContext.migrateLinkedInProfile(linkedInProfile);
    
    // Simulate notification
    if (success) {
      const migratedProfile = await this.profileContext.getProfile();
      if (migratedProfile) {
        await this.notifyProfileUpdated(migratedProfile);
      }
    }
    
    return success;
  }
  
  /**
   * For backward compatibility
   */
  async getActiveProfile(): Promise<Profile | null> {
    return this.profileContext.getActiveProfile();
  }
  
  /**
   * Mock notification method
   */
  async notifyProfileUpdated(_profile: Profile): Promise<void> {
    // This is a mock implementation
  }
  
  /**
   * Mock notification method
   */
  async notifyProfileCreated(_profile: Profile): Promise<void> {
    // This is a mock implementation
  }
  
  /**
   * Send data to another context through the mediator
   */
  async sendRequest(_targetContext: string, _requestType: string, _data?: Record<string, unknown>): Promise<{ success: boolean }> {
    // Mock implementation
    return { success: true };
  }
}