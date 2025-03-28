/**
 * CLI Renderer for command results
 * This module handles formatting and displaying command results in the CLI
 */

import type { CommandResult, CommandInfo } from './index';
import { displayNotes } from '../utils/noteUtils';

/**
 * Render command results for the CLI
 */
export class CLIRenderer {
  /**
   * Render help command
   */
  renderHelp(commands: CommandInfo[]): void {
    console.log('\nAvailable commands:');
    commands.forEach(cmd => {
      console.log(`  ${cmd.usage.padEnd(20)} - ${cmd.description}`);
    });
  }

  /**
   * Render a command result
   */
  render(result: CommandResult): void {
    switch (result.type) {
      case 'error':
        console.log(`\nError: ${result.message}`);
        break;
        
      case 'search':
        console.log(`\nSearching for: ${result.query}`);
        displayNotes(result.notes);
        break;
        
      case 'notes':
        console.log(`\n${result.title || 'Notes'}:`);
        displayNotes(result.notes);
        break;
        
      case 'note':
        this.renderNote(result.note);
        break;
        
      case 'tags':
        console.log('\nAvailable Tags:');
        result.tags.forEach(({ tag, count }) => {
          console.log(`- ${tag} (${count})`);
        });
        break;
        
      case 'profile':
        this.renderProfile(result.profile, result.keywords);
        break;
        
      case 'profile-related':
        this.renderProfile(result.profile, result.keywords);
        
        console.log('\nFinding notes related to your profile...');
        console.log('\nNotes related to your profile:');
        
        if (result.relatedNotes.length > 0) {
          // Explain how we found the notes
          switch (result.matchType) {
            case 'tags':
              console.log('(Matched by profile tags and semantic similarity)\n');
              break;
            case 'semantic':
              console.log('(Matched by semantic similarity)\n');
              break;
            case 'keyword':
              console.log('(Matched by keyword similarity)\n');
              break;
          }
          
          displayNotes(result.relatedNotes);
        } else {
          console.log('No related notes found. Try generating embeddings and tags for your notes and profile.');
          console.log('You can run "bun run tag:profile" to generate profile tags.');
        }
        break;
        
      case 'ask':
        console.log('\nAnswer:');
        console.log(result.answer);
        
        if (result.citations.length > 0) {
          console.log('\nCitations:');
          result.citations.forEach(citation => {
            console.log(`- ${citation.noteTitle} (${citation.noteId})`);
          });
        }
        
        if (result.relatedNotes.length > 0) {
          console.log('\nRelated Notes:');
          displayNotes(result.relatedNotes);
        }
        
        // Display profile if it was included in the response
        if (result.profile) {
          console.log('\nProfile Information:');
          console.log(`Name: ${result.profile.fullName}`);
          if (result.profile.occupation) console.log(`Occupation: ${result.profile.occupation}`);
          if (result.profile.headline) console.log(`Headline: ${result.profile.headline}`);
        }
        break;
    }
  }

  /**
   * Render a note
   */
  private renderNote(note: any): void {
    console.log(`\n# ${note.title}`);
    console.log(`ID: ${note.id}`);
    
    if (note.tags && note.tags.length > 0) {
      console.log(`Tags: ${note.tags.join(', ')}`);
    } else {
      console.log('Tags: None');
    }
    
    console.log(`Created: ${new Date(note.createdAt).toLocaleString()}`);
    console.log(`Updated: ${new Date(note.updatedAt).toLocaleString()}`);
    
    console.log('\nContent:');
    console.log(note.content);
  }

  /**
   * Render profile information
   */
  private renderProfile(profile: any, keywords: string[]): void {
    console.log('\nProfile Information:');
    console.log(`Name: ${profile.fullName}`);
    if (profile.headline) console.log(`Headline: ${profile.headline}`);
    if (profile.occupation) console.log(`Occupation: ${profile.occupation}`);
    
    // Display location
    const location = [profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ');
    if (location) console.log(`Location: ${location}`);
    
    // Display summary
    if (profile.summary) {
      console.log('\nSummary:');
      console.log(profile.summary);
    }
    
    // Display current experience
    if (profile.experiences && profile.experiences.length > 0) {
      console.log('\nCurrent Work:');
      const currentExperiences = profile.experiences.filter((exp: any) => !exp.endDate);
      if (currentExperiences.length > 0) {
        currentExperiences.forEach((exp: any) => {
          console.log(`- ${exp.title} at ${exp.company}`);
          if (exp.description) {
            // Trim long descriptions
            const desc = exp.description.length > 100 
              ? exp.description.substring(0, 100) + '...' 
              : exp.description;
            console.log(`  ${desc}`);
          }
        });
      } else {
        console.log('No current work experiences found.');
      }
    }
    
    // Display skills
    if (profile.languages && profile.languages.length > 0) {
      console.log('\nLanguages:');
      console.log(profile.languages.join(', '));
    }
    
    // Check for embedding
    if (profile.embedding) {
      console.log('\nProfile has embeddings: Yes');
    } else {
      console.log('\nProfile has embeddings: No');
      console.log('Run "bun run embed:profile" to generate embeddings.');
    }
    
    // Display tags if available
    if (profile.tags && profile.tags.length > 0) {
      console.log('\nProfile Tags:');
      console.log(profile.tags.join(', '));
    } else {
      console.log('\nProfile Tags: None');
      console.log('Run "bun run tag:profile" to generate tags.');
    }
    
    // Show keywords
    console.log('\nProfile Keywords:');
    console.log(keywords.join(', '));
  }
}