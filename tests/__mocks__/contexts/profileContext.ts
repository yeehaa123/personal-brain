/**
 * Mock ProfileContext for testing
 *
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type { ProfileContext } from '@/contexts/profiles';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { Logger } from '@/utils/logger';

/**
 * Mock implementation of ProfileContext
 */
export class MockProfileContext {
  private static instance: MockProfileContext | null = null;
  private profile: Profile | null = null;
  private profileNote: Note | null = null;
  private logger: Logger;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProfileContext {
    if (!MockProfileContext.instance) {
      MockProfileContext.instance = new MockProfileContext();
    }
    return MockProfileContext.instance as unknown as ProfileContext;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockProfileContext.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(options?: { profile?: Profile; profileNote?: Note }): ProfileContext {
    const instance = new MockProfileContext();
    
    if (options?.profile) {
      instance.profile = options.profile;
    }
    
    if (options?.profileNote) {
      instance.profileNote = options.profileNote;
    }
    
    return instance as unknown as ProfileContext;
  }
  
  private constructor() {
    this.logger = Logger.getInstance();
    this.logger.debug('MockProfileContext created');
  }
  
  /* Mock implementation of methods expected from the real ProfileContext */
  
  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    this.logger.debug('MockProfileContext.getProfile called');
    return this.profile;
  }
  
  /**
   * Save the user profile
   */
  async saveProfile(profile: Profile): Promise<boolean> {
    this.logger.debug('MockProfileContext.saveProfile called');
    this.profile = profile;
    return true;
  }
  
  /**
   * Update the user profile
   */
  async updateProfile(data: Partial<Profile>): Promise<boolean> {
    this.logger.debug('MockProfileContext.updateProfile called');
    if (!this.profile) {
      return false;
    }
    
    this.profile = {
      ...this.profile,
      ...data,
    };
    
    return true;
  }
  
  /**
   * Get profile as a note
   */
  async getProfileAsNote(): Promise<Note | null> {
    this.logger.debug('MockProfileContext.getProfileAsNote called');
    return this.profileNote;
  }
  
  /**
   * Migrate a LinkedIn profile
   */
  async migrateLinkedInProfile(_linkedInProfile: LinkedInProfile): Promise<boolean> {
    this.logger.debug('MockProfileContext.migrateLinkedInProfile called');
    return true;
  }
  
  /**
   * For backward compatibility
   */
  async getActiveProfile(): Promise<Profile | null> {
    this.logger.debug('MockProfileContext.getActiveProfile called');
    return this.getProfile();
  }
  
  /**
   * For implementing BaseContext
   */
  getLoggerContext(): string {
    return 'ProfileContext';
  }
  
  /**
   * For implementing BaseContext
   */
  initialize(): boolean {
    this.logger.debug('MockProfileContext.initialize called');
    return true;
  }
  
  /**
   * For implementing BaseContext
   */
  isInitialized(): boolean {
    return true;
  }
}