#!/usr/bin/env bun
import { marked } from 'marked';
import * as sdk from 'matrix-js-sdk';
import { ClientEvent } from 'matrix-js-sdk';
import type { MatrixEvent, Room, RoomMember } from 'matrix-js-sdk';
import { MsgType } from 'matrix-js-sdk/lib/@types/event';
import { RoomEvent } from 'matrix-js-sdk/lib/models/room';
import { RoomMemberEvent } from 'matrix-js-sdk/lib/models/room-member';

import { BrainProtocol } from '@/mcp/protocol/brainProtocol';

import { CommandHandler } from '../commands';
import { MatrixRenderer } from '../commands/matrix-renderer';
import { getEnv } from '../utils/configUtils';
import logger from '../utils/logger';
import { sanitizeHtml } from '../utils/textUtils';



// Configuration constants - load from environment
interface MatrixConfig {
  homeserverUrl: string;
  accessToken: string;
  userId: string;
  roomIds: string[];
  commandPrefix: string;
}

export class MatrixBrainInterface {
  private client: sdk.MatrixClient;
  private brainProtocol: BrainProtocol;
  private commandHandler: CommandHandler;
  private renderer: MatrixRenderer;
  private isReady = false;
  private config: MatrixConfig;
  // Matrix is a specific interface type for conversation memory
  private interfaceType = 'matrix';
  
  // Store pending save note requests by roomId
  private pendingSaveNotes: Map<string, { conversationId: string, title: string }> = new Map();

  constructor() {
    // Load and validate configuration
    this.config = this.loadConfig();
    
    // Initialize Matrix client
    this.client = sdk.createClient({
      baseUrl: this.config.homeserverUrl,
      accessToken: this.config.accessToken,
      userId: this.config.userId,
    });

    // Initialize brain protocol and command handler using singleton pattern
    this.brainProtocol = BrainProtocol.getInstance({ interfaceType: 'matrix', roomId: this.config.roomIds[0] });
    this.commandHandler = new CommandHandler(this.brainProtocol);

    // Initialize renderer with message sending function
    this.renderer = new MatrixRenderer(
      this.config.commandPrefix,
      this.sendMessage.bind(this),
    );
    
    // Connect the command handler to the renderer for interactive commands
    this.renderer.setCommandHandler(this.commandHandler);
  }

  /**
   * Load config from environment with validation
   */
  private loadConfig(): MatrixConfig {
    const homeserverUrl = getEnv('MATRIX_HOMESERVER_URL', 'https://matrix.org');
    const accessToken = getEnv('MATRIX_ACCESS_TOKEN');
    const userId = getEnv('MATRIX_USER_ID');
    const roomIds = getEnv('MATRIX_ROOM_IDS', '').split(',').filter(Boolean);
    const commandPrefix = getEnv('COMMAND_PREFIX', '!brain');

    // Log configuration in non-production environments
    if (getEnv('NODE_ENV') !== 'production') {
      logger.debug(`MATRIX_HOMESERVER_URL: ${homeserverUrl}`);
      logger.debug(`MATRIX_USER_ID: ${userId}`);
      logger.debug(`MATRIX_ACCESS_TOKEN: ${accessToken ? 'Set (hidden)' : 'Not set'}`);
      logger.debug(`MATRIX_ROOM_IDS: ${roomIds.join(', ')}`);
      logger.debug(`COMMAND_PREFIX: ${commandPrefix}`);
    }

    // Validate required fields
    if (!accessToken || !userId) {
      logger.error('MATRIX_ACCESS_TOKEN and MATRIX_USER_ID environment variables are required');
      process.exit(1);
    }

    if (roomIds.length === 0) {
      logger.warn('No MATRIX_ROOM_IDS provided, the bot will not automatically join any rooms');
    }

    return {
      homeserverUrl,
      accessToken,
      userId,
      roomIds,
      commandPrefix,
    };
  }

  /**
   * Start the Matrix client and register event handlers
   */
  async start(): Promise<void> {
    logger.info(`Starting Matrix brain interface as ${this.config.userId}`);

    // Register event handlers
    this.client.on(RoomEvent.Timeline, this.handleRoomMessage.bind(this));
    this.client.on(RoomMemberEvent.Membership, this.handleMembership.bind(this));

    try {
      // Start the client
      await this.client.startClient({ initialSyncLimit: 10 });
      logger.info('Matrix client started, waiting for sync');

      // Wait for the client to sync
      return new Promise((resolve, reject) => {
        this.client.once(ClientEvent.Sync, (state: string) => {
          if (state === 'PREPARED') {
            logger.info('Client sync complete');
            this.isReady = true;

            // Auto-join configured rooms
            this.joinConfiguredRooms().then(() => {
              resolve();
            }).catch(reject);
          } else {
            const error = new Error(`Sync failed with state: ${state}`);
            logger.error(error.message);
            reject(error);
          }
        });
      });
    } catch (error) {
      logger.error('Failed to start Matrix client:', error);
      throw error;
    }
  }

  /**
   * Join all configured rooms
   */
  private async joinConfiguredRooms(): Promise<void> {
    if (this.config.roomIds.length === 0) return;

    logger.info(`Joining ${this.config.roomIds.length} configured rooms...`);

    // Join each room, collecting errors but not failing if some rooms can't be joined
    const errors: Error[] = [];
    
    for (const roomId of this.config.roomIds) {
      try {
        await this.client.joinRoom(roomId);
        logger.info(`Joined room ${roomId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to join room ${roomId}: ${errorMessage}`);
        errors.push(new Error(`Failed to join room ${roomId}: ${errorMessage}`));
      }
    }

    // If we couldn't join any rooms, that's potentially a problem
    if (errors.length === this.config.roomIds.length && this.config.roomIds.length > 0) {
      logger.error('Failed to join any of the configured rooms');
    }
  }

  /**
   * Handle membership changes in rooms
   */
  private async handleMembership(_event: MatrixEvent, member: RoomMember): Promise<void> {
    // Auto-accept invites for the bot
    if (member.userId === this.config.userId && member.membership === 'invite') {
      logger.info(`Received invite to room ${member.roomId}, auto-joining`);
      
      try {
        // Join the room
        await this.client.joinRoom(member.roomId);
        logger.info(`Successfully joined room ${member.roomId}`);

        // Send welcome message
        await this.sendMessage(
          member.roomId,
          `Hello! I'm your personal brain assistant. Type \`${this.config.commandPrefix} help\` to see available commands.`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to join room ${member.roomId}: ${errorMessage}`);
      }
    }
  }

  /**
   * Handle incoming room messages
   */
  private async handleRoomMessage(event: MatrixEvent, room: Room | undefined): Promise<void> {
    // Only process messages if the client is ready
    if (!this.isReady) {
      return;
    }

    // Ignore non-text messages 
    if (event.getType() !== 'm.room.message') {
      return;
    }

    if (!room) {
      logger.error('Room undefined for message event');
      return;
    }

    const content = event.getContent();

    // Only process text messages
    if (content.msgtype !== MsgType.Text) {
      return;
    }

    const text = content['body'].trim();
    
    // Check if the text starts with the command prefix
    if (text.startsWith(this.config.commandPrefix)) {
      // Extract command text after the prefix
      const commandText = text.substring(this.config.commandPrefix.length).trim();
      
      try {
        // Make sure we're using the correct room ID for this message
        // This is crucial for conversation memory to work properly
        if (this.interfaceType === 'matrix') {
          await this.brainProtocol.setCurrentRoom(room.roomId);
        }
        
        await this.processCommand(commandText, room.roomId, event);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error processing command: ${errorMessage}`);
        await this.sendMessage(room.roomId, `Error: ${errorMessage}`);
      }
    }
  }

  /**
   * Process a command and generate a response
   */
  private async processCommand(commandText: string, roomId: string, _event: unknown): Promise<void> {
    // Handle empty command (just the prefix) as help
    if (!commandText) {
      await this.renderer.renderHelp(roomId, this.commandHandler.getCommands());
      return;
    }

    // Parse command and arguments
    const { command, args } = this.parseCommand(commandText);

    // Handle help command specially
    if (command === 'help') {
      await this.renderer.renderHelp(roomId, this.commandHandler.getCommands());
      return;
    }
    
    // Handle confirm command for save-note
    if (command === 'confirm') {
      await this.handleConfirmSaveNote(roomId, args);
      return;
    }
    
    // Handle cancel command for save-note
    if (command === 'cancel') {
      this.pendingSaveNotes.delete(roomId);
      await this.sendMessage(roomId, '❌ Note creation cancelled.');
      return;
    }

    // Process the command through our shared command handler
    try {
      // Special case for "ask" command to show "thinking" message
      if (command === 'ask' && args) {
        await this.sendMessage(roomId, `🤔 Thinking about: "${args}"...`);
      }

      const result = await this.commandHandler.processCommand(command, args);

      // Render the result using our Matrix renderer
      await this.renderer.render(roomId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error executing command ${command}: ${errorMessage}`);
      await this.sendMessage(roomId, `❌ Error executing command: ${errorMessage}`);
    }
  }

  /**
   * Parse a command into command name and arguments
   */
  private parseCommand(commandText: string): { command: string, args: string } {
    const parts = commandText.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    return { command, args };
  }
  
  /**
   * Handle confirmation of save-note command
   */
  private async handleConfirmSaveNote(roomId: string, newTitle?: string): Promise<void> {
    try {
      // Find the most recent save-note-preview message to extract the conversation ID
      const room = this.client.getRoom(roomId);
      if (!room) {
        await this.sendMessage(roomId, '❌ Error: Room not found.');
        return;
      }
      
      // Get recent timeline events
      const timeline = room.timeline;
      if (!timeline || timeline.length === 0) {
        await this.sendMessage(roomId, '❌ Error: No conversation history found.');
        return;
      }
      
      // Find the most recent message with a conversation ID
      let conversationId: string | null = null;
      let title: string | null = null;
      
      // Look for a message containing the conversation ID marker
      for (let i = timeline.length - 1; i >= 0; i--) {
        const event = timeline[i];
        if (event.getType() === 'm.room.message') {
          const content = event.getContent();
          if (content.msgtype === MsgType.Text) {
            const body = content['body'] as string;
            
            // Look for the hidden conversation ID in the message
            const match = body.match(/_Conversation ID: ([a-zA-Z0-9-_]+)_/);
            if (match && match[1]) {
              conversationId = match[1];
              
              // Extract the title from the same message
              const titleMatch = body.match(/\*\*Title\*\*: (.+)$/m);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
              }
              
              break;
            }
          }
        }
      }
      
      if (!conversationId) {
        await this.sendMessage(roomId, '❌ Error: No pending note to save. Please create a note first using the save-note command.');
        return;
      }
      
      // Use the new title if provided
      if (newTitle && newTitle.trim()) {
        // Remove quotation marks if present
        title = newTitle.trim().replace(/^"(.*)"$/, '$1');
      }
      
      // Confirm the save note using the command handler
      const result = await this.commandHandler.confirmSaveNote(conversationId, title || undefined);
      
      // Render the result
      await this.renderer.render(roomId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error confirming save note: ${errorMessage}`);
      await this.sendMessage(roomId, `❌ Error confirming note: ${errorMessage}`);
    }
  }

  /**
   * Send a message to a Matrix room with error handling
   */
  private async sendMessage(roomId: string, message: string): Promise<void> {
    try {
      // First try to send as plain text
      await this.client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: message,
      });
      
      logger.debug(`Sent plain text message to ${roomId}`);
    } catch (error) {
      logger.warn(`Error sending plain message to ${roomId}, trying HTML fallback:`, error);
      
      try {
        // Fallback to HTML message
        const htmlContent = await this.markdownToHtml(message);
        await this.client.sendHtmlMessage(roomId, message, htmlContent);
        logger.debug(`Sent HTML message to ${roomId}`);
      } catch (htmlError) {
        logger.error(`Failed to send message to ${roomId}:`, htmlError);
        throw htmlError;
      }
    }
  }

  /**
   * Convert markdown to HTML for Matrix messages
   */
  private async markdownToHtml(markdown: string): Promise<string> {
    try {
      // Use the marked library to convert markdown to HTML
      const html = marked.parse(markdown);
      // Sanitize the HTML to prevent XSS
      return sanitizeHtml(html as string);
    } catch (error) {
      logger.error('Error converting markdown to HTML:', error);
      
      // Fallback to basic conversion if marked fails
      return markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/^- (.*?)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '<br/><br/>');
    }
  }
}

async function main() {
  try {
    const matrixInterface = new MatrixBrainInterface();
    await matrixInterface.start();

    logger.info('Matrix brain interface is running');

    // Keep the process alive
    process.on('SIGINT', () => {
      logger.info('Shutting down...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Fatal error starting Matrix interface:', error);
    process.exit(1);
  }
}

// Only run the main function if this is the main module
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

