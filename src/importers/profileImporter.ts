import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ProfileContext } from '../mcp/context/profileContext';
import type { Profile } from '../models/profile';

export class ProfileImporter {
  private profileContext: ProfileContext;

  constructor() {
    this.profileContext = new ProfileContext();
  }

  /**
   * Import a profile from a YAML file
   */
  async importProfileFromYaml(filePath: string): Promise<string> {
    try {
      console.log(`Importing profile from ${filePath}`);
      
      // Read and parse the YAML file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const profileData = yaml.load(fileContent) as Record<string, any>;
      
      // Transform the YAML data to our profile format
      const profileToSave = this.transformYamlToProfile(profileData);
      
      // Save the profile (create or update)
      const profileId = await this.profileContext.saveProfile(profileToSave);
      
      console.log(`Successfully imported profile with ID: ${profileId}`);
      return profileId;
    } catch (error) {
      console.error('Error importing profile from YAML:', error);
      throw error;
    }
  }

  /**
   * Transform YAML data to profile format
   */
  private transformYamlToProfile(data: Record<string, any>): Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> {
    // Convert snake_case from YAML to camelCase for database
    return {
      publicIdentifier: data.public_identifier,
      profilePicUrl: data.profile_pic_url,
      backgroundCoverImageUrl: data.background_cover_image_url,
      firstName: data.first_name,
      lastName: data.last_name,
      fullName: data.full_name,
      followerCount: data.follower_count,
      occupation: data.occupation,
      headline: data.headline,
      summary: data.summary,
      country: data.country,
      countryFullName: data.country_full_name,
      city: data.city,
      state: data.state,
      experiences: data.experiences,
      education: data.education,
      languages: data.languages,
      languagesAndProficiencies: data.languages_and_proficiencies,
      accomplishmentPublications: data.accomplishment_publications,
      accomplishmentHonorsAwards: data.accomplishment_honors_awards,
      accomplishmentProjects: data.accomplishment_projects,
      volunteerWork: data.volunteer_work
    };
  }
}