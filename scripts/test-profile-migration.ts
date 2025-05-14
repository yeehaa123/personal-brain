/**
 * Test script for profile migration with mocked dependencies
 */
import * as fs from 'fs';
import { resolve } from 'path';

import * as yaml from 'js-yaml';

import { NoteContext } from '@/contexts/notes/noteContext';
import { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import { LinkedInProfileMigrationAdapter } from '@/services/profiles/linkedInProfileMigrationAdapter';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Profile } from '@/models/profile';

// Mock TagExtractor to avoid API calls
class MockTagExtractor {
  async extractTags(content: string): Promise<string[]> {
    console.log('Mock tag extractor called with content length:', content.length);
    
    // Extract basic tags from the content
    const words = content.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 20);
      
    // Remove duplicates
    return [...new Set(words)];
  }
}

async function testMigration() {
  try {
    // Get the profile file path
    const profilePath = process.argv[2] || './src/models/profiles/sample.yaml';
    const resolvedPath = resolve(profilePath);
    
    console.log(`Reading profile from ${resolvedPath}...`);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`File ${resolvedPath} does not exist`);
      process.exit(1);
    }
    
    // Read YAML content
    const fileContent = fs.readFileSync(resolvedPath, 'utf8');
    const data = yaml.load(fileContent) as Record<string, unknown>;
    console.log('YAML file loaded successfully');
    
    // Create dependencies with mocks
    const noteContext = NoteContext.getInstance();
    const tagExtractor = new MockTagExtractor();
    const profileMigrationAdapter = LinkedInProfileMigrationAdapter.createFresh();
    
    // Create the adapter with mocked dependencies
    const adapter = ProfileNoteAdapter.createFresh({
      noteContext, 
      tagExtractor: tagExtractor as any,
    });
    
    console.log('Dependencies created successfully');
    
    // Convert data to LinkedIn format
    console.log('Converting to LinkedIn profile format...');
    const linkedInProfile: LinkedInProfile = {
      id: `linkedin-${Date.now()}`,
      fullName: data['full_name'] as string || 'Unknown User',
      headline: data['headline'] as string,
      summary: data['summary'] as string,
      experiences: data['experiences'] as any[],
      // Add other fields as needed
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Convert to new profile format
    console.log('Converting LinkedIn profile to new format...');
    const profile: Profile = profileMigrationAdapter.convertToProfile(linkedInProfile);
    
    // Add required email field (example value)
    profile.email = 'example@example.com';
    
    // Save the profile as a note
    console.log('Saving profile as note...');
    const result = await adapter.saveProfile(profile);
    
    console.log('Save result:', result);
    
    if (result) {
      // Try to load the profile
      console.log('Loading profile from note...');
      const loadedProfile = await adapter.getProfile();
      
      console.log('Profile loaded:', loadedProfile ? 'Successfully' : 'Failed');
      
      if (loadedProfile) {
        console.log('Profile name:', loadedProfile.displayName);
        console.log('Profile tags:', loadedProfile.tags);
      }
    }
    
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Migration test failed:', error);
  }
}

// Run the test
console.log('Starting profile migration test with mocked dependencies...');
testMigration().catch(error => {
  console.error('Unhandled error:', error);
});