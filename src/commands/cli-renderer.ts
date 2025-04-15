/**
 * CLI Renderer for command results
 * This module handles formatting and displaying command results in the CLI
 * 
 * TODO: This class will be updated as part of the CLI/logger separation initiative
 * See planning/cli-logger-separation.md for the detailed plan
 */
/* global setTimeout */

import type { Note } from '../models/note';
import type { EnhancedProfile, ProfileExperience } from '../models/profile';
import { CLIInterface } from '../utils/cliInterface';
import { Logger } from '../utils/logger';
import { displayNotes } from '../utils/noteUtils';

import type { CommandHandler } from '.';
import type { CommandInfo, CommandResult } from './index';


/**
 * Render command results for the CLI
 */
export class CLIRenderer {
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
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

  private commandHandler?: CommandHandler;
  
  /**
   * Set the command handler for interactive confirmation
   */
  setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
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
      this.logger.info(`Searching for: ${result.query}`);

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
          ({ tag, count }) => `${CLIInterface.styles.tag(tag)} (${CLIInterface.styles.dim(count.toString())})`,
        );
      }
      break;

    case 'profile':
      this.renderProfile(result.profile as EnhancedProfile);
      break;

    case 'profile-related':
      this.renderProfile(result.profile as EnhancedProfile);

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

      if (result.citations && result.citations.length > 0) {
        CLIInterface.displayTitle('Sources');
        CLIInterface.displayList(
          result.citations,
          (citation) => `${CLIInterface.styles.subtitle(citation.noteTitle)} (${CLIInterface.formatId(citation.noteId)})`,
        );
      }

      if (result.externalSources && result.externalSources.length > 0) {
        CLIInterface.displayTitle('External Sources');
        CLIInterface.displayList(
          result.externalSources,
          (source) => {
            const title = CLIInterface.styles.subtitle(source.title);
            const sourceInfo = CLIInterface.styles.highlight(source.source);
            const url = CLIInterface.styles.url(source.url);
            return `${title} - ${sourceInfo}\n  ${url}`;
          },
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

    case 'external':
      if (result.enabled) {
        CLIInterface.success(result.message);
      } else {
        CLIInterface.warn(result.message);
      }
      break;
      
    case 'save-note-preview':
      this.renderSaveNotePreview(result);
      break;
      
    case 'save-note-confirm':
      this.renderSaveNoteConfirm(result);
      break;
      
    case 'conversation-notes':
      this.renderConversationNotes(result);
      break;
      
    // Website commands
    case 'website-config':
      if (result.success !== undefined) {
        CLIInterface.displayTitle('Updated Configuration');
        if (result.success) {
          CLIInterface.success(result.message);
        } else {
          CLIInterface.error(result.message);
        }
      } else {
        CLIInterface.displayTitle('Website Configuration');
      }
      
      if (result.config) {
        const configItems = Object.entries(result.config).map(([key, value]) => ({ 
          key, 
          value: typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value), 
        }));
        CLIInterface.displayList(configItems, item => `${CLIInterface.styles.subtitle(item.key)}: ${item.value}`);
      }
      break;
      
    case 'landing-page':
      if (result.success !== undefined && result.message) {
        if (result.success) {
          CLIInterface.success(result.message);
        } else {
          CLIInterface.error(result.message);
        }
      }
      
      if (result.data) {
        CLIInterface.displayTitle('Landing Page Content');
        
        // Display each field from the landing page data
        Object.entries(result.data).forEach(([key, value]) => {
          CLIInterface.displaySubtitle(key.charAt(0).toUpperCase() + key.slice(1));
          CLIInterface.print(String(value));
        });
      }
      break;
      
      
    case 'website-build':
      if (result.success) {
        CLIInterface.success(result.message);
        
        if (result.url) {
          CLIInterface.info('Website preview available at:');
          CLIInterface.print(result.url);
        }
        
        // Show helpful next steps
        CLIInterface.info('To promote to production:');
        CLIInterface.print('website-promote');
      } else {
        CLIInterface.error(result.message);
      }
      break;
      
    case 'website-promote':
      if (result.success) {
        CLIInterface.success(result.message);
        
        if (result.url) {
          CLIInterface.info('Production site available at:');
          CLIInterface.print(result.url);
        }
      } else {
        CLIInterface.error(result.message);
      }
      break;
      
    case 'website-status':
      if (result.success) {
        CLIInterface.displayTitle('Website Status');
        CLIInterface.success(result.message);
        
        if (result.data) {
          // Display detailed status information
          const { environment, buildStatus, fileCount, serverStatus, domain, accessStatus, url } = result.data;
          
          CLIInterface.printLabelValue('Environment', environment);
          CLIInterface.printLabelValue('Build Status', buildStatus);
          CLIInterface.printLabelValue('File Count', String(fileCount));
          CLIInterface.printLabelValue('Server Status', serverStatus);
          CLIInterface.printLabelValue('Domain', domain);
          CLIInterface.printLabelValue('Access Status', accessStatus);
          
          if (url) {
            CLIInterface.info('Website URL:');
            CLIInterface.print(url);
          }
        }
      } else {
        CLIInterface.error(result.message || 'Failed to check website status');
      }
      break;

    case 'status':
      CLIInterface.displayTitle('System Status');

      // API Connection
      CLIInterface.printLabelValue(
        'API Connection',
        result.status.apiConnected ? 'Connected' : 'Disconnected',
        { formatter: val => result.status.apiConnected ? CLIInterface.styles.success(val) : CLIInterface.styles.error(val) },
      );

      // Database Connection
      CLIInterface.printLabelValue(
        'Database',
        result.status.dbConnected ? 'Connected' : 'Disconnected',
        { formatter: val => result.status.dbConnected ? CLIInterface.styles.success(val) : CLIInterface.styles.error(val) },
      );

      // Note Count
      CLIInterface.printLabelValue('Notes', result.status.noteCount.toString());

      // External Sources Status
      CLIInterface.printLabelValue(
        'External Sources',
        result.status.externalSourcesEnabled ? 'Enabled' : 'Disabled',
        {
          formatter: val => result.status.externalSourcesEnabled ?
            CLIInterface.styles.success(val) : CLIInterface.styles.warn(val),
        },
      );

      // External Sources Availability
      if (Object.keys(result.status.externalSources).length > 0) {
        CLIInterface.displaySubtitle('Available External Sources');

        Object.entries(result.status.externalSources).forEach(([name, available]) => {
          CLIInterface.printLabelValue(
            name,
            available ? 'Available' : 'Unavailable',
            {
              formatter: val => available ?
                CLIInterface.styles.success(val) : CLIInterface.styles.error(val),
            },
          );
        });
      } else {
        CLIInterface.warn('No external sources configured');
      }
      break;
    }
  }

  /**
   * Render save-note preview with options to edit or confirm
   */
  private renderSaveNotePreview(result: { noteContent: string; title: string; conversationId: string }): void {
    CLIInterface.displayTitle('Note Preview');
    CLIInterface.printLabelValue('Title', result.title);
    
    CLIInterface.displaySubtitle('Content Preview');
    // Display first 300 characters of content
    const previewContent = result.noteContent.length > 300
      ? result.noteContent.substring(0, 297) + '...'
      : result.noteContent;
    CLIInterface.print(previewContent);
    
    CLIInterface.info('');
    CLIInterface.info('This is a preview of the note that will be created from your conversation.');
    CLIInterface.info('To save this note, type "y". To cancel, type "n".');
    CLIInterface.info('You can also edit the title by typing "title: New Title"');
    
    // Collect user input for confirmation
    // In a real implementation, we would set up an event listener for user input
    // and call confirmSaveNote when the user confirms
    // For demo purposes, we'll just provide instructions
    CLIInterface.print('');
    CLIInterface.info('Since this is a CLI interface, in a real implementation you would:');
    CLIInterface.info('1. Type "y" to confirm and save the note');
    CLIInterface.info('2. Type "n" to cancel');
    CLIInterface.info('3. Type "title: New Title" to change the title');
    
    // If we have a commandHandler, we can handle the confirmation directly
    // In a real implementation, this would be connected to user input handling
    if (this.commandHandler) {
      CLIInterface.print('');
      CLIInterface.info('For demo purposes, automatically confirming...');
      // Simulate confirmation by calling the confirmSaveNote method
      setTimeout(async () => {
        if (this.commandHandler) {
          const confirmResult = await this.commandHandler.confirmSaveNote(result.conversationId, result.title);
          this.render(confirmResult);
        }
      }, 2000); // Wait 2 seconds before auto-confirming
    }
  }
  
  /**
   * Render save-note confirmation
   */
  private renderSaveNoteConfirm(result: { noteId: string; title: string }): void {
    CLIInterface.success(`Note "${result.title}" saved successfully!`);
    CLIInterface.info(`Note ID: ${CLIInterface.formatId(result.noteId)}`);
    CLIInterface.info('To view the note, use the command:');
    CLIInterface.print(`  note ${result.noteId}`);
  }
  
  /**
   * Render conversation notes list
   */
  private renderConversationNotes(result: { notes: Note[] }): void {
    CLIInterface.displayTitle('Notes Created from Conversations');
    
    if (result.notes.length === 0) {
      CLIInterface.warn('No conversation notes found.');
      return;
    }
    
    displayNotes(result.notes);
  }

  /**
   * Render a note
   */
  private renderNote(note: Note): void {
    CLIInterface.displayTitle(note.title);

    // Print metadata using label-value formatting
    CLIInterface.printLabelValue('ID', note.id, { formatter: CLIInterface.formatId });
    CLIInterface.printLabelValue('Tags', note.tags as string[], { emptyText: 'None' });
    CLIInterface.printLabelValue('Created', CLIInterface.formatDate(new Date(note.createdAt)));
    CLIInterface.printLabelValue('Updated', CLIInterface.formatDate(new Date(note.updatedAt)));

    // Display content
    CLIInterface.displaySubtitle('Content');
    CLIInterface.print(note.content);
  }

  /**
   * Render profile information
   */
  private renderProfile(profile: EnhancedProfile): void {
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
      const experiences = profile.experiences as ProfileExperience[];
      const currentExperiences = experiences.filter(exp => !exp.ends_at);

      if (currentExperiences.length > 0) {
        currentExperiences.forEach((exp: ProfileExperience) => {
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
      CLIInterface.printLabelValue('Skills', profile.languages as string[]);
    }

    // Check for embedding
    CLIInterface.print('');
    if (profile.embedding) {
      CLIInterface.printLabelValue('Profile has embeddings', 'Yes', {
        formatter: val => CLIInterface.styles.success(val),
      });
    } else {
      CLIInterface.printLabelValue('Profile has embeddings', 'No', {
        formatter: val => CLIInterface.styles.error(val),
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
  }
}
