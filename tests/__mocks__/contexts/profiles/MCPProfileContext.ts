import type { Profile } from '@/models/profile';

/**
 * Mock implementation of MCPProfileContext for testing
 */
export class MockMCPProfileContext {
  private static instance: MockMCPProfileContext | null = null;
  private profile: Profile | null = null;

  private constructor() {}

  public static getInstance(): MockMCPProfileContext {
    if (!MockMCPProfileContext.instance) {
      MockMCPProfileContext.instance = new MockMCPProfileContext();
    }
    return MockMCPProfileContext.instance;
  }

  public static resetInstance(): void {
    MockMCPProfileContext.instance = null;
  }

  public static createFresh(): MockMCPProfileContext {
    return new MockMCPProfileContext();
  }

  // Mock methods
  public async getProfile(): Promise<Profile | null> {
    return this.profile;
  }

  public async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    if (!this.profile) {
      this.profile = updates as Profile;
    } else {
      this.profile = { ...this.profile, ...updates };
    }
    return this.profile;
  }

  public async createProfile(profile: Profile): Promise<Profile> {
    this.profile = profile;
    return profile;
  }

  public async deleteProfile(): Promise<void> {
    this.profile = null;
  }
}