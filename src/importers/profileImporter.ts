import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ProfileContext } from '@/mcp-sdk';
import { selectProfileSchema } from '../models/profile';
import logger from '../utils/logger';

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
      logger.info(`Importing profile from ${filePath}`, { context: 'ProfileImporter' });
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const profileData = yaml.load(fileContent) as Record<string, unknown>;
      const profileToSave = this.transformYamlToProfile(profileData);
      const parsedProfile = selectProfileSchema.parse(profileToSave);
      
      // Convert the profile to match the expected input format for the MCP SDK implementation
      const profileForSaving = {
        ...parsedProfile,
        // Make sure followerCount is not null for MCP SDK implementation
        followerCount: parsedProfile.followerCount ?? undefined,
      };
      
      const profileId = await this.profileContext.saveProfile(profileForSaving);
      logger.info(`Successfully imported profile with ID: ${profileId}`, { context: 'ProfileImporter' });
      return profileId;
    } catch (error) {
      logger.error('Error importing profile from YAML:', { error, context: 'ProfileImporter' });
      throw error;
    }
  }

  /**
   * Transform YAML data to profile format
   */
  private transformYamlToProfile(data: Record<string, unknown>): Record<string, unknown> {
    // Convert snake_case from YAML to camelCase for database
    return {
      publicIdentifier: data['public_identifier'],
      profilePicUrl: data['profile_pic_url'],
      backgroundCoverImageUrl: data['background_cover_image_url'],
      firstName: data['first_name'],
      lastName: data['last_name'],
      fullName: data['full_name'],
      followerCount: data['follower_count'],
      occupation: data['occupation'],
      headline: data['headline'],
      summary: data['summary'],
      country: data['country'],
      countryFullName: data['country_full_name'],
      city: data['city'],
      state: data['state'],
      experiences: data['experiences'],
      education: data['education'],
      languages: data['languages'],
      languagesAndProficiencies: data['languages_and_proficiencies'],
      accomplishmentPublications: data['accomplishment_publications'],
      accomplishmentHonorsAwards: data['accomplishment_honors_awards'],
      accomplishmentProjects: data['accomplishment_projects'],
      volunteerWork: data['volunteer_work'],
    };
  }
}
