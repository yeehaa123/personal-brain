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
      const usageText = cmd.usage.padEnd(20);
      CLIInterface.print(`  ${chalk.cyan(usageText)} - ${cmd.description}`);
      
      // Show examples if available
      if (cmd.examples && cmd.examples.length > 0) {
        CLIInterface.print(`    ${chalk.dim('Examples:')}`);
        cmd.examples.forEach(example => {
          CLIInterface.print(`    ${chalk.dim('>')} ${chalk.italic(example)}`);
        });
      }
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
            ({ tag, count }) => `${chalk.bold(tag)} (${count})`
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
          switch (result.matchType) {
            case 'tags':
              CLIInterface.print(chalk.dim('(Matched by profile tags and semantic similarity)\n'));
              break;
            case 'semantic':
              CLIInterface.print(chalk.dim('(Matched by semantic similarity)\n'));
              break;
            case 'keyword':
              CLIInterface.print(chalk.dim('(Matched by keyword similarity)\n'));
              break;
          }
          
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
            (citation) => `${chalk.bold(citation.noteTitle)} (${chalk.dim(citation.noteId)})`
          );
        }
        
        if (result.relatedNotes.length > 0) {
          CLIInterface.displayTitle('Related Notes');
          displayNotes(result.relatedNotes);
        }
        
        // Display profile if it was included in the response
        if (result.profile) {
          CLIInterface.displayTitle('Profile Information');
          CLIInterface.print(`${chalk.bold('Name:')} ${result.profile.fullName}`);
          if (result.profile.occupation) CLIInterface.print(`${chalk.bold('Occupation:')} ${result.profile.occupation}`);
          if (result.profile.headline) CLIInterface.print(`${chalk.bold('Headline:')} ${result.profile.headline}`);
        }
        break;
    }
  }

  /**
   * Render a note
   */
  private renderNote(note: any): void {
    CLIInterface.displayTitle(note.title);
    CLIInterface.print(`${chalk.bold('ID:')} ${note.id}`);
    
    if (note.tags && note.tags.length > 0) {
      CLIInterface.print(`${chalk.bold('Tags:')} ${note.tags.map(tag => chalk.cyan(tag)).join(', ')}`);
    } else {
      CLIInterface.print(`${chalk.bold('Tags:')} ${chalk.dim('None')}`);
    }
    
    CLIInterface.print(`${chalk.bold('Created:')} ${new Date(note.createdAt).toLocaleString()}`);
    CLIInterface.print(`${chalk.bold('Updated:')} ${new Date(note.updatedAt).toLocaleString()}`);
    
    CLIInterface.print('\n' + chalk.bold('Content:'));
    CLIInterface.print(note.content);
  }

  /**
   * Render profile information
   */
  private renderProfile(profile: any, keywords: string[]): void {
    CLIInterface.displayTitle('Profile Information');
    CLIInterface.print(`${chalk.bold('Name:')} ${profile.fullName}`);
    if (profile.headline) CLIInterface.print(`${chalk.bold('Headline:')} ${profile.headline}`);
    if (profile.occupation) CLIInterface.print(`${chalk.bold('Occupation:')} ${profile.occupation}`);
    
    // Display location
    const location = [profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ');
    if (location) CLIInterface.print(`${chalk.bold('Location:')} ${location}`);
    
    // Display summary
    if (profile.summary) {
      CLIInterface.print(`\n${chalk.bold('Summary:')}`);
      CLIInterface.print(profile.summary);
    }
    
    // Display current experience
    if (profile.experiences && profile.experiences.length > 0) {
      CLIInterface.print(`\n${chalk.bold('Current Work:')}`);
      const currentExperiences = profile.experiences.filter((exp: any) => !exp.endDate);
      if (currentExperiences.length > 0) {
        currentExperiences.forEach((exp: any) => {
          CLIInterface.print(`- ${chalk.bold(exp.title)} at ${chalk.cyan(exp.company)}`);
          if (exp.description) {
            // Trim long descriptions
            const desc = exp.description.length > 100 
              ? exp.description.substring(0, 100) + '...' 
              : exp.description;
            CLIInterface.print(`  ${chalk.dim(desc)}`);
          }
        });
      } else {
        CLIInterface.print(chalk.dim('No current work experiences found.'));
      }
    }
    
    // Display skills
    if (profile.languages && profile.languages.length > 0) {
      CLIInterface.print(`\n${chalk.bold('Languages:')}`);
      CLIInterface.print(profile.languages.map(lang => chalk.cyan(lang)).join(', '));
    }
    
    // Check for embedding
    CLIInterface.print('');
    if (profile.embedding) {
      CLIInterface.print(`${chalk.bold('Profile has embeddings:')} ${chalk.green('Yes')}`);
    } else {
      CLIInterface.print(`${chalk.bold('Profile has embeddings:')} ${chalk.red('No')}`);
      CLIInterface.print(chalk.dim('Run "bun run embed:profile" to generate embeddings.'));
    }
    
    // Display tags if available
    if (profile.tags && profile.tags.length > 0) {
      CLIInterface.print(`\n${chalk.bold('Profile Tags:')}`);
      CLIInterface.print(profile.tags.map(tag => chalk.cyan(tag)).join(', '));
    } else {
      CLIInterface.print(`\n${chalk.bold('Profile Tags:')} ${chalk.dim('None')}`);
      CLIInterface.print(chalk.dim('Run "bun run tag:profile" to generate tags.'));
    }
    
    // Show keywords
    CLIInterface.print(`\n${chalk.bold('Profile Keywords:')}`);
    CLIInterface.print(keywords.map(kw => chalk.cyan(kw)).join(', '));
  }
}