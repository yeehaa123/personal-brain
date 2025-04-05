/**
 * ProfileFormatter class
 * 
 * Responsible for formatting profile data into human-readable text formats
 */
import type { 
  Profile, 
  ProfileAward, 
  ProfileEducation,
  ProfileExperience,
  ProfileLanguageProficiency,
  ProfileProject,
  ProfilePublication,
  ProfileVolunteerWork,
} from '@/models/profile';
import logger from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

import type { ProfileFormattingOptions } from '../types/profileTypes';

/**
 * ProfileFormatter handles converting profile objects to human-readable text
 */
export class ProfileFormatter {
  /**
   * Formats a profile for display to users
   * 
   * @param profile - The profile to format
   * @param options - Optional formatting options
   * @returns Formatted profile string with sections and formatting
   */
  formatProfileForDisplay(profile: Profile, options: ProfileFormattingOptions = {}): string {
    try {
      const { 
        includeSectionHeaders = true,
        includeEmptySections = false,
        maxFieldLength = 0, 
      } = options;
      
      const formatField = (value: string | null | undefined): string => {
        if (!value) return '';
        return maxFieldLength > 0 && value.length > maxFieldLength 
          ? value.substring(0, maxFieldLength) + '...'
          : value;
      };
      
      // Start with personal info
      let formatted = '';
      const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      
      if (name) {
        formatted += `# ${name}\n\n`;
      } else if (profile.fullName) {
        formatted += `# ${profile.fullName}\n\n`;
      }
      
      if (profile.headline) {
        formatted += `**${formatField(profile.headline)}**\n\n`;
      }
      
      if (profile.summary) {
        formatted += `${formatField(profile.summary)}\n\n`;
      }
      
      // Basic info section
      let basicInfo = '';
      
      // Location from city, state, country
      const location = [profile.city, profile.state, profile.countryFullName]
        .filter(Boolean)
        .join(', ');
      
      if (location) {
        basicInfo += `**Location:** ${formatField(location)}\n`;
      }
      
      if (profile.occupation) {
        basicInfo += `**Occupation:** ${formatField(profile.occupation)}\n`;
      }
      
      if (basicInfo && (includeEmptySections || basicInfo.length > 0)) {
        if (includeSectionHeaders) {
          formatted += '## Basic Information\n\n';
        }
        formatted += `${basicInfo}\n`;
      }
      
      // Experience
      if (profile.experiences && profile.experiences.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Experience\n\n';
        }
        
        formatted += profile.experiences
          .map(exp => this.formatExperience(exp, formatField))
          .join('\n\n');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Experience\n\n';
        }
        formatted += 'No experience listed.\n\n';
      }
      
      // Education
      if (profile.education && profile.education.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Education\n\n';
        }
        
        formatted += profile.education
          .map(edu => this.formatEducation(edu, formatField))
          .join('\n\n');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Education\n\n';
        }
        formatted += 'No education listed.\n\n';
      }
      
      // Projects
      if (profile.accomplishmentProjects && profile.accomplishmentProjects.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Projects\n\n';
        }
        
        formatted += profile.accomplishmentProjects
          .map(project => this.formatProject(project, formatField))
          .join('\n\n');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Projects\n\n';
        }
        formatted += 'No projects listed.\n\n';
      }
      
      // Publications
      if (profile.accomplishmentPublications && profile.accomplishmentPublications.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Publications\n\n';
        }
        
        formatted += profile.accomplishmentPublications
          .map(pub => this.formatPublication(pub, formatField))
          .join('\n\n');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Publications\n\n';
        }
        formatted += 'No publications listed.\n\n';
      }
      
      // Languages
      if (profile.languagesAndProficiencies && profile.languagesAndProficiencies.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Languages\n\n';
        }
        
        formatted += profile.languagesAndProficiencies
          .map(lang => this.formatLanguage(lang, formatField))
          .join('\n');
        formatted += '\n\n';
      } else if (profile.languages && profile.languages.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Languages\n\n';
        }
        
        formatted += profile.languages
          .map(lang => `- **${formatField(lang)}**\n`)
          .join('');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Languages\n\n';
        }
        formatted += 'No languages listed.\n\n';
      }
      
      // Volunteer work
      if (profile.volunteerWork && profile.volunteerWork.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Volunteer Work\n\n';
        }
        
        formatted += profile.volunteerWork
          .map(work => this.formatVolunteerWork(work, formatField))
          .join('\n\n');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Volunteer Work\n\n';
        }
        formatted += 'No volunteer work listed.\n\n';
      }
      
      // Awards
      if (profile.accomplishmentHonorsAwards && profile.accomplishmentHonorsAwards.length > 0) {
        if (includeSectionHeaders) {
          formatted += '## Awards\n\n';
        }
        
        formatted += profile.accomplishmentHonorsAwards
          .map(award => this.formatAward(award, formatField))
          .join('\n\n');
        formatted += '\n\n';
      } else if (includeEmptySections) {
        if (includeSectionHeaders) {
          formatted += '## Awards\n\n';
        }
        formatted += 'No awards listed.\n\n';
      }
      
      // Tags
      if (profile.tags && profile.tags.length > 0) {
        formatted += `**Tags:** ${profile.tags.map(tag => `#${tag}`).join(' ')}\n\n`;
      }
      
      return formatted.trim();
    } catch (error) {
      logger.error('Error formatting profile for display:', error);
      return 'Error formatting profile.';
    }
  }
  
  /**
   * Formats a date object into a readable string
   * 
   * @param date - Date object with year, month, day fields
   * @returns Formatted date string
   */
  private formatDate(date: { year: number | null; month: number | null; day: number | null }): string {
    if (!date) return '';
    
    const { year, month, day } = date;
    
    if (year && month && day) {
      // Full date with padding
      return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (year && month) {
      // Year and month
      return `${String(year)}-${String(month).padStart(2, '0')}`;
    } else if (year) {
      // Just year
      return String(year);
    }
    
    return '';
  }
  
  /**
   * Formats a work experience entry
   * 
   * @param experience - The experience to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted experience string
   */
  /**
   * Helper function to safely get a non-empty string or return undefined
   */
  private safeNonEmptyString(value: string | null | undefined): string | undefined {
    return isNonEmptyString(value) ? value : undefined;
  }

  private formatExperience(
    experience: ProfileExperience, 
    formatField: (value: string | null | undefined) => string,
  ): string {
    const title = this.safeNonEmptyString(experience.title);
    const company = this.safeNonEmptyString(experience.company);
    const startDate = this.formatDate(experience.starts_at || {});
    const endDate = experience.ends_at ? this.formatDate(experience.ends_at) : 'Present';
    const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
    const location = this.safeNonEmptyString(experience.location);
    const description = this.safeNonEmptyString(experience.description);
    
    let formatted = '';
    
    if (title && company) {
      formatted += `### ${formatField(title)} at ${formatField(company)}\n`;
    } else if (title) {
      formatted += `### ${formatField(title)}\n`;
    } else if (company) {
      formatted += `### Position at ${formatField(company)}\n`;
    } else {
      formatted += '### Work Experience\n';
    }
    
    if (dateRange) {
      formatted += `**${dateRange}**`;
      if (location) {
        formatted += ` | ${formatField(location)}`;
      }
      formatted += '\n\n';
    } else if (location) {
      formatted += `**${formatField(location)}**\n\n`;
    }
    
    if (description) {
      formatted += `${formatField(description)}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Formats an education entry
   * 
   * @param education - The education to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted education string
   */
  private formatEducation(
    education: ProfileEducation,
    formatField: (value: string | null | undefined) => string,
  ): string {
    const school = this.safeNonEmptyString(education.school);
    const degree = this.safeNonEmptyString(education.degree_name);
    const fieldOfStudy = this.safeNonEmptyString(education.field_of_study);
    const startDate = this.formatDate(education.starts_at || {});
    const endDate = education.ends_at ? this.formatDate(education.ends_at) : 'Present';
    const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
    const grade = this.safeNonEmptyString(education.grade);
    const activities = this.safeNonEmptyString(education.activities_and_societies);
    const description = this.safeNonEmptyString(education.description);
    
    let formatted = '';
    
    if (school) {
      formatted += `### ${formatField(school)}\n`;
    } else {
      formatted += '### Education\n';
    }
    
    if (degree && fieldOfStudy) {
      formatted += `**${formatField(degree)}** in **${formatField(fieldOfStudy)}**\n`;
    } else if (degree) {
      formatted += `**${formatField(degree)}**\n`;
    } else if (fieldOfStudy) {
      formatted += `**${formatField(fieldOfStudy)}**\n`;
    }
    
    if (dateRange) {
      formatted += `${dateRange}\n\n`;
    } else {
      formatted += '\n';
    }
    
    if (grade) {
      formatted += `Grade: ${formatField(grade)}\n\n`;
    }
    
    if (activities) {
      formatted += `Activities: ${formatField(activities)}\n\n`;
    }
    
    if (description) {
      formatted += `${formatField(description)}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Formats a project entry
   * 
   * @param project - The project to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted project string
   */
  private formatProject(
    project: ProfileProject,
    formatField: (value: string | null | undefined) => string,
  ): string {
    const name = this.safeNonEmptyString(project.title);
    const startDate = this.formatDate(project.starts_at || {});
    const endDate = project.ends_at ? this.formatDate(project.ends_at) : 'Present';
    const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
    const url = this.safeNonEmptyString(project.url);
    const description = this.safeNonEmptyString(project.description);
    
    let formatted = '';
    
    if (name) {
      formatted += `### ${formatField(name)}\n`;
    } else {
      formatted += '### Project\n';
    }
    
    if (dateRange) {
      formatted += `**${dateRange}**\n\n`;
    }
    
    if (url) {
      formatted += `URL: ${formatField(url)}\n\n`;
    }
    
    if (description) {
      formatted += `${formatField(description)}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Formats a publication entry
   * 
   * @param publication - The publication to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted publication string
   */
  private formatPublication(
    publication: ProfilePublication,
    formatField: (value: string | null | undefined) => string,
  ): string {
    const title = this.safeNonEmptyString(publication.name);
    const publisher = this.safeNonEmptyString(publication.publisher);
    const date = this.formatDate(publication.published_on || {});
    const url = this.safeNonEmptyString(publication.url);
    const description = this.safeNonEmptyString(publication.description);
    
    let formatted = '';
    
    if (title) {
      formatted += `### ${formatField(title)}\n`;
    } else {
      formatted += '### Publication\n';
    }
    
    if (publisher) {
      formatted += `**${formatField(publisher)}**`;
      if (date) {
        formatted += ` | ${date}`;
      }
      formatted += '\n\n';
    } else if (date) {
      formatted += `**${date}**\n\n`;
    }
    
    if (url) {
      formatted += `URL: ${formatField(url)}\n\n`;
    }
    
    if (description) {
      formatted += `${formatField(description)}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Formats a language proficiency entry
   * 
   * @param language - The language to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted language string
   */
  private formatLanguage(
    language: ProfileLanguageProficiency,
    formatField: (value: string | null | undefined) => string,
  ): string {
    const name = this.safeNonEmptyString(language.name);
    const proficiency = this.safeNonEmptyString(language.proficiency);
    
    if (name && proficiency) {
      return `- **${formatField(name)}**: ${formatField(proficiency)}\n`;
    } else if (name) {
      return `- **${formatField(name)}**\n`;
    } else {
      return '';
    }
  }
  
  /**
   * Formats a volunteer work entry
   * 
   * @param work - The volunteer work to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted volunteer work string
   */
  private formatVolunteerWork(
    work: ProfileVolunteerWork,
    formatField: (value: string | null | undefined) => string,
  ): string {
    const organization = this.safeNonEmptyString(work.company);
    const role = this.safeNonEmptyString(work.title);
    const startDate = this.formatDate(work.starts_at || {});
    const endDate = work.ends_at ? this.formatDate(work.ends_at) : 'Present';
    const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
    const description = this.safeNonEmptyString(work.description);
    
    let formatted = '';
    
    if (organization && role) {
      formatted += `### ${formatField(role)} at ${formatField(organization)}\n`;
    } else if (organization) {
      formatted += `### ${formatField(organization)}\n`;
    } else if (role) {
      formatted += `### ${formatField(role)}\n`;
    } else {
      formatted += '### Volunteer Work\n';
    }
    
    if (dateRange) {
      formatted += `**${dateRange}**\n\n`;
    }
    
    if (description) {
      formatted += `${formatField(description)}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Formats an award entry
   * 
   * @param award - The award to format
   * @param formatField - Function to format and truncate fields
   * @returns Formatted award string
   */
  private formatAward(
    award: ProfileAward,
    formatField: (value: string | null | undefined) => string,
  ): string {
    const title = this.safeNonEmptyString(award.title);
    const issuer = this.safeNonEmptyString(award.issuer);
    const date = this.formatDate(award.issued_on || {});
    const description = this.safeNonEmptyString(award.description);
    
    let formatted = '';
    
    if (title) {
      formatted += `### ${formatField(title)}\n`;
    } else {
      formatted += '### Award\n';
    }
    
    if (issuer) {
      formatted += `**${formatField(issuer)}**`;
      if (date) {
        formatted += ` | ${date}`;
      }
      formatted += '\n\n';
    } else if (date) {
      formatted += `**${date}**\n\n`;
    }
    
    if (description) {
      formatted += `${formatField(description)}\n`;
    }
    
    return formatted;
  }
}