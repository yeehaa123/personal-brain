/**
 * Enhanced Matrix Renderer for command results
 * 
 * This module handles formatting and displaying command results in Matrix
 * with improved formatting, distinct bot messages, and better visual structure
 * 
 * Features:
 * - Markdown rendering
 * - Rich, visually distinct citations
 * - Bot message styling
 * - Support for MSC2398 blocks (with fallback)
 */

import { getResponseFormatter } from '../interfaces/matrix/formatters';
import type { NotePreview } from '../interfaces/matrix/formatters/types';
import logger from '../utils/logger';

import type { CommandHandler } from '.';
import type { CommandInfo, CommandResult } from './index';

/**
 * Render command results for Matrix with enhanced formatting
 */
export class MatrixRenderer {
  private commandPrefix: string;
  private sendMessageFn: (roomId: string, message: string) => void;
  // private member used in methods called by tests
  private commandHandler?: CommandHandler;
  // Response formatter with consistent styling
  private formatter = getResponseFormatter();

  constructor(commandPrefix: string, sendMessageFn: (roomId: string, message: string) => void) {
    this.commandPrefix = commandPrefix;
    this.sendMessageFn = sendMessageFn;
    // Initialize formatter with command prefix
    this.formatter = getResponseFormatter({ commandPrefix });
  }
  
  /**
   * Set the command handler for interactive confirmation
   */
  setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
    // Validate the command handler has the required methods
    if (!this.commandHandler || typeof this.commandHandler.confirmSaveNote !== 'function') {
      throw new Error('Command handler must implement confirmSaveNote');
    }
  }

  /**
   * Render help command
   */
  renderHelp(roomId: string, commands: CommandInfo[]): void {
    const helpText = [
      '### Personal Brain Commands',
      '',
      ...commands.map(cmd => {
        // Format with markdown for better rendering
        const usage = `\`${this.commandPrefix} ${cmd.usage}\``;
        return `- ${usage} - ${cmd.description}`;
      }),
    ].join('\n');

    this.sendMessageFn(roomId, helpText);
  }

  /**
   * Render a command result with enhanced formatting
   */
  render(roomId: string, result: CommandResult): void {
    try {
      switch (result.type) {
      case 'error': {
        this.sendMessageFn(roomId, this.formatter.formatError(result.message));
        break;
      }

      case 'search': {
        if (result.notes.length === 0) {
          this.sendMessageFn(roomId, 'No results found.');
          return;
        }

        this.sendMessageFn(roomId, this.formatter.formatSearchResults(result.query, result.notes as unknown as NotePreview[]));
        break;
      }

      case 'notes': {
        if (result.notes.length === 0) {
          this.sendMessageFn(roomId, 'No notes found.');
          return;
        }

        this.sendMessageFn(roomId, this.formatter.formatNotesList(result.notes as unknown as NotePreview[], result.title));
        break;
      }

      case 'note': {
        // Cast to NotePreview to satisfy the more flexible type system used by formatters
        this.sendMessageFn(roomId, this.formatter.formatNote(result.note as unknown as NotePreview));
        break;
      }

      case 'tags': {
        this.sendMessageFn(roomId, this.formatter.formatTags(result.tags));
        break;
      }

      case 'profile': {
        this.sendMessageFn(roomId, this.formatter.formatProfile(result.profile));
        break;
      }

      case 'profile-related': {
        this.sendMessageFn(
          roomId,
          this.formatter.formatProfileRelated(result.profile, result.relatedNotes as unknown as NotePreview[], result.matchType),
        );
        break;
      }

      case 'ask': {
        // DEBUG: Log the raw answer from the command handler
        logger.debug(`[DEBUG RENDERER] Received answer in renderer: ${result.answer.substring(0, 100)}...`);
        
        this.sendMessageFn(
          roomId, 
          this.formatter.formatAnswer(result.answer, result.citations, result.relatedNotes as unknown as NotePreview[]),
        );
        break;
      }

      case 'status': {
        this.sendMessageFn(roomId, this.formatter.formatStatus(result.status));
        break;
      }

      case 'external': {
        const externalStatusIcon = result.enabled ? '✅' : '⚠️';
        const externalMsg = `${externalStatusIcon} ${result.message}`;
        this.sendMessageFn(roomId, externalMsg);
        break;
      }
      
      case 'save-note-preview': {
        this.sendMessageFn(roomId, this.formatter.formatSaveNotePreview(result));
        break;
      }
      
      case 'save-note-confirm': {
        this.sendMessageFn(roomId, this.formatter.formatSaveNoteConfirm(result));
        break;
      }
      
      case 'conversation-notes': {
        this.sendMessageFn(roomId, this.formatter.formatConversationNotes(result.notes as unknown as (NotePreview & { createdAt: string | Date })[]));
        break;
      }
      
      // Website commands
      case 'website-help': {
        this.sendMessageFn(roomId, this.formatter.formatWebsiteHelp(result));
        break;
      }
      
      case 'website-init': {
        this.sendMessageFn(roomId, this.formatter.formatWebsiteInit(result));
        break;
      }
      
      case 'website-config': {
        this.sendMessageFn(roomId, this.formatter.formatWebsiteConfig(result));
        break;
      }
      
      case 'landing-page': {
        this.sendMessageFn(roomId, this.formatter.formatLandingPage(result));
        break;
      }
      
      case 'website-preview': {
        this.sendMessageFn(roomId, this.formatter.formatWebsitePreview(result));
        break;
      }
      
      case 'website-preview-stop': {
        this.sendMessageFn(roomId, this.formatter.formatWebsitePreviewStop(result));
        break;
      }
      
      case 'website-build': {
        this.sendMessageFn(roomId, this.formatter.formatWebsiteBuild(result));
        break;
      }
      
      case 'website-deploy': {
        // Format website deployment result with detailed logs
        const message = [
          `### ${result.success ? '✅ Deployment Successful' : '❌ Deployment Failed'}`,
          '',
          result.message,
        ];
        
        if (result.url) {
          message.push('', `**Website URL**: ${result.url}`);
        }
        
        if (result.logs) {
          message.push('', '#### Deployment Logs', '', '```', result.logs, '```');
        }
        
        this.sendMessageFn(roomId, message.join('\n'));
        break;
      }
      
      case 'website-deployment-status': {
        const icon = result.isDeployed ? '✅' : '⚠️';
        const message = [
          '### Website Deployment Status',
          '',
          `${icon} ${result.message}`,
        ];
        
        if (result.provider) {
          message.push(`**Provider**: ${result.provider}`);
        }
        
        if (result.isDeployed && result.url) {
          message.push('', `**Website URL**: ${result.url}`);
        }
        
        this.sendMessageFn(roomId, message.join('\n'));
        break;
      }
      }
    } catch (error) {
      logger.error('Error rendering Matrix result:', error);
      
      // Send a fallback error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendMessageFn(roomId, `❌ Error rendering result: ${errorMessage}`);
    }
  }
}