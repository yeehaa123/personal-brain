/**
 * Mock ProfileContextV2Messaging for testing
 */

import type { ProfileContextV2Messaging } from '@/contexts/profiles/messaging/profileContextV2Messaging';
import type { ProfileContextV2 } from '@/contexts/profiles/profileContextV2';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { Logger } from '@/utils/logger';

/**
 * Mock implementation of ProfileContextV2Messaging
 */
export class MockProfileContextV2Messaging {
  private static instance: MockProfileContextV2Messaging | null = null;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(profileContext: ProfileContextV2, mediator?: ContextMediator) {
    if (!MockProfileContextV2Messaging.instance) {
      MockProfileContextV2Messaging.instance = new MockProfileContextV2Messaging(profileContext, mediator);
    }
    return MockProfileContextV2Messaging.instance as unknown as ProfileContextV2Messaging;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockProfileContextV2Messaging.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(profileContext: ProfileContextV2, mediator?: ContextMediator) {
    return new MockProfileContextV2Messaging(profileContext, mediator) as unknown as ProfileContextV2Messaging;
  }
  private profileContext: ProfileContextV2;
  
  // Add missing properties to match the real implementation
  mediator: ContextMediator;
  notifier: { notifyProfileUpdated: () => Promise<void> };
  logger: Logger;
  
  constructor(profileContext: ProfileContextV2, mediator?: ContextMediator) {
    this.profileContext = profileContext;
    this.mediator = mediator || {} as ContextMediator;
    this.notifier = { notifyProfileUpdated: async () => {} };
    this.logger = Logger.getInstance();
  }
  
  /**
   * Get the wrapped profile context
   */
  getContext(): ProfileContextV2 {
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