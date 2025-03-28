/**
 * CLI Renderer for command results
 * This module handles formatting and displaying command results in the CLI
 */

import type { CommandResult, CommandInfo } from './index';
import { displayNotes } from '../utils/noteUtils';
import { CLIInterface } from '../utils/cliInterface';
import chalk from 'chalk';
import logger from '../utils/logger';

/**
 * Render command results for the CLI
 */
export class CLIRenderer {
  /**
   * Render help command
   */
  renderHelp(commands: CommandInfo[]): void {
    CLIInterface.displayTitle('Available Commands');
    
    commands.forEach(cmd => {
      CLIInterface.print(CLIInterface.formatCommand(cmd.usage, cmd.description, cmd.examples));
    });
    
    CLIInterface.print(''); // Add space after commands
  }

  /**
   * Render a command result
   */
  render(result: CommandResult): void {
    switch (result.type) {
      case 'error':
        CLIInterface.error(result.message);
        break;
        
      case 'search':
        CLIInterface.displayTitle(`Search Results for "${result.query}"`);
        logger.info(`Searching for: ${result.query}`);
        
        if (result.notes.length === 0) {
          CLIInterface.warn('No results found.');
        } else {
          displayNotes(result.notes);
        }
        break;
        
      case 'notes':
        CLIInterface.displayTitle(result.title || 'Notes');
        
        if (result.notes.length === 0) {
          CLIInterface.warn('No notes found.');
        } else {
          displayNotes(result.notes);
        }
        break;
        
      case 'note':
        this.renderNote(result.note);
        break;
        
      case 'tags':
        CLIInterface.displayTitle('Available Tags');
        
        if (result.tags.length === 0) {
          CLIInterface.warn('No tags found in the system.');
        } else {
          CLIInterface.displayList(
            result.tags,
            ({ tag, count }) => `${CLIInterface.styles.tag(tag)} (${CLIInterface.styles.dim(count.toString())})`
          );
        }
        break;
        
      case 'profile':
        this.renderProfile(result.profile, result.keywords);
        break;
        
      case 'profile-related':
        this.renderProfile(result.profile, result.keywords);
        
        CLIInterface.info('Finding notes related to your profile...');
        CLIInterface.displayTitle('Notes Related to Your Profile');
        
        if (result.relatedNotes.length > 0) {
          // Explain how we found the notes
          let matchDescription = '';
          switch (result.matchType) {
            case 'tags':
              matchDescription = 'Matched by profile tags and semantic similarity';
              break;
            case 'semantic':
              matchDescription = 'Matched by semantic similarity';
              break;
            case 'keyword':
              matchDescription = 'Matched by keyword similarity';
              break;
          }
          CLIInterface.print(CLIInterface.styles.dim(`(${matchDescription})\n`));
          
          displayNotes(result.relatedNotes);
        } else {
          CLIInterface.warn('No related notes found. Try generating embeddings and tags for your notes and profile.');
          CLIInterface.info('You can run "bun run tag:profile" to generate profile tags.');
        }
        break;
        
      case 'ask':
        CLIInterface.displayTitle('Answer');
        CLIInterface.print(result.answer);
        
        if (result.citations.length > 0) {
          CLIInterface.displayTitle('Sources');
          CLIInterface.displayList(
            result.citations,
            (citation) => `${CLIInterface.styles.subtitle(citation.noteTitle)} (${CLIInterface.formatId(citation.noteId)})`
          );
        }
        
        if (result.relatedNotes.length > 0) {
          CLIInterface.displayTitle('Related Notes');
          displayNotes(result.relatedNotes);
        }
        
        // Display profile if it was included in the response
        if (result.profile) {
          CLIInterface.displayTitle('Profile Information');
          CLIInterface.printLabelValue('Name', result.profile.fullName);
          if (result.profile.occupation) CLIInterface.printLabelValue('Occupation', result.profile.occupation);
          if (result.profile.headline) CLIInterface.printLabelValue('Headline', result.profile.headline);
        }
        break;
    }
  }

  /**
   * Render a note
   */
  private renderNote(note: any): void {
    CLIInterface.displayTitle(note.title);
    
    // Print metadata using label-value formatting
    CLIInterface.printLabelValue('ID', note.id, { formatter: CLIInterface.formatId });
    CLIInterface.printLabelValue('Tags', note.tags, { emptyText: 'None' });
    CLIInterface.printLabelValue('Created', new Date(note.createdAt), { formatter: CLIInterface.formatDate });
    CLIInterface.printLabelValue('Updated', new Date(note.updatedAt), { formatter: CLIInterface.formatDate });
    
    // Display content
    CLIInterface.displaySubtitle('Content');
    CLIInterface.print(note.content);
  }

  /**
   * Render profile information
   */
  private renderProfile(profile: any, keywords: string[]): void {
    CLIInterface.displayTitle('Profile Information');
    
    // Print basic information using label-value formatting
    CLIInterface.printLabelValue('Name', profile.fullName);
    if (profile.headline) CLIInterface.printLabelValue('Headline', profile.headline);
    if (profile.occupation) CLIInterface.printLabelValue('Occupation', profile.occupation);
    
    // Display location
    const location = [profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ');
    if (location) CLIInterface.printLabelValue('Location', location);
    
    // Display summary
    if (profile.summary) {
      CLIInterface.displaySubtitle('Summary');
      CLIInterface.print(profile.summary);
    }
    
    // Display current experience
    if (profile.experiences && profile.experiences.length > 0) {
      CLIInterface.displaySubtitle('Current Work');
      const currentExperiences = profile.experiences.filter((exp: any) => !exp.endDate);
      
      if (currentExperiences.length > 0) {
        currentExperiences.forEach((exp: any) => {
          const title = CLIInterface.styles.subtitle(exp.title);
          const company = CLIInterface.styles.highlight(exp.company);
          CLIInterface.print(`- ${title} at ${company}`);
          
          if (exp.description) {
            // Trim long descriptions
            const desc = exp.description.length > 100 
              ? exp.description.substring(0, 100) + '...' 
              : exp.description;
            CLIInterface.print(`  ${CLIInterface.styles.dim(desc)}`);
          }
        });
      } else {
        CLIInterface.print(CLIInterface.styles.dim('No current work experiences found.'));
      }
    }
    
    // Display skills
    if (profile.languages && profile.languages.length > 0) {
      CLIInterface.displaySubtitle('Languages');
      CLIInterface.printLabelValue('Skills', profile.languages);
    }
    
    // Check for embedding
    CLIInterface.print('');
    if (profile.embedding) {
      CLIInterface.printLabelValue('Profile has embeddings', 'Yes', { 
        formatter: val => CLIInterface.styles.success(val) 
      });
    } else {
      CLIInterface.printLabelValue('Profile has embeddings', 'No', { 
        formatter: val => CLIInterface.styles.error(val) 
      });
      CLIInterface.print(CLIInterface.styles.dim('Run "bun run embed:profile" to generate embeddings.'));
    }
    
    // Display tags if available
    CLIInterface.displaySubtitle('Profile Tags');
    if (profile.tags && profile.tags.length > 0) {
      CLIInterface.printLabelValue('Tags', profile.tags);
    } else {
      CLIInterface.printLabelValue('Tags', '', { emptyText: 'None' });
      CLIInterface.print(CLIInterface.styles.dim('Run "bun run tag:profile" to generate tags.'));
    }
    
    // Show keywords
    CLIInterface.displaySubtitle('Profile Keywords');
    if (keywords.length > 0) {
      CLIInterface.print(keywords.map(kw => CLIInterface.styles.tag(kw)).join(' '));
    } else {
      CLIInterface.print(CLIInterface.styles.dim('No keywords found.'));
    }
  }
}