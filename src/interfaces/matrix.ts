#!/usr/bin/env bun
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
        
        // Format error message with simple HTML that Element can render well
        const formattedErrorMessage = [
          '<h4>❌ Error Processing Command</h4>',
          `<p><strong>${errorMessage}</strong></p>`,
        ].join('\n');
        
        await this.sendMessage(room.roomId, formattedErrorMessage);
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

      // Add debugging to make sure we have a proper userId before processing the command
      // This ensures that assistant responses will be properly identified
      const userId = this.config.userId || 'matrix-user';
      logger.debug(`Processing command with userId: ${userId} (should not start with 'assistant')`);

      const result = await this.commandHandler.processCommand(command, args);

      // Special handling for save-note preview - store conversation ID for later confirmation
      if (result.type === 'save-note-preview') {
        // Store the conversation ID and title for later retrieval
        this.pendingSaveNotes.set(roomId, {
          conversationId: result.conversationId,
          title: result.title,
        });
        logger.debug(`Stored pending note for room ${roomId} with conversation ID ${result.conversationId}`);
      }

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
      // Make sure we're using the correct room ID for this confirmation
      // This is crucial for conversation memory to work properly
      if (this.interfaceType === 'matrix') {
        await this.brainProtocol.setCurrentRoom(roomId);
      }
      
      // Get the pending save note from our map (stored during save-note command)
      const pendingSaveNote = this.pendingSaveNotes.get(roomId);
      
      if (!pendingSaveNote) {
        logger.debug(`No pending note found for room ${roomId}`);
        await this.sendMessage(roomId, '❌ Error: No pending note to save. Please create a note first using the save-note command.');
        return;
      }
      
      // Extract conversation ID and title from the stored data
      const conversationId = pendingSaveNote.conversationId;
      let title = pendingSaveNote.title;
      
      logger.debug(`Found pending note with conversation ID: ${conversationId} and title: ${title}`);
      
      // Use the new title if provided
      if (newTitle && newTitle.trim()) {
        // Remove quotation marks if present
        title = newTitle.trim().replace(/^"(.*)"$/, '$1');
      }
      
      // Log the conversation ID and title for debugging
      logger.debug(`Confirming save note with conversation ID: ${conversationId} and title: ${title || 'default title'}`);
      
      // Confirm the save note using the command handler
      const result = await this.commandHandler.confirmSaveNote(conversationId, title || undefined);
      
      // Render the result
      await this.renderer.render(roomId, result);
      
      // Clear the pending note after successful save
      this.pendingSaveNotes.delete(roomId);
      
      logger.debug('Save note confirmation successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error confirming save note: ${errorMessage}`);
      
      // Format error message with simple HTML that Element can render well
      const formattedErrorMessage = [
        '<h4>❌ Error Saving Note</h4>',
        `<p><strong>${errorMessage}</strong></p>`,
      ].join('\n');
      
      await this.sendMessage(roomId, formattedErrorMessage);
    }
  }

  /**
   * Send a message to a Matrix room with error handling
   */
  private async sendMessage(roomId: string, message: string): Promise<void> {
    try {
      // IMPORTANT: We're now using plain markdown without HTML conversion
      // This ensures we don't have HTML content in our messages that could
      // get stored in conversation memory
      logger.debug(`Sending markdown message to ${roomId}`);
      
      // Send as plain text (markdown)
      await this.client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: message,
      });
      
      logger.debug(`Sent plain markdown message to ${roomId}`);
    } catch (error) {
      logger.error(`Failed to send message to ${roomId}:`, error);
      
      try {
        // We're already using plain text, but try a simplified version as fallback
        // Remove any markdown formatting that might be causing issues
        const simplifiedMessage = message
          .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
          .replace(/\*(.*?)\*/g, '$1')      // Remove italic
          .replace(/`(.*?)`/g, '$1')        // Remove code
          .replace(/#### (.*?)$/gm, '$1')   // Remove h4
          .replace(/### (.*?)$/gm, '$1')    // Remove h3
          .replace(/## (.*?)$/gm, '$1')     // Remove h2
          .replace(/# (.*?)$/gm, '$1');     // Remove h1
          
        await this.client.sendMessage(roomId, {
          msgtype: MsgType.Text,
          body: simplifiedMessage,
        });
        logger.debug(`Sent simplified fallback message to ${roomId}`);
      } catch (fallbackError) {
        logger.error(`Complete failure sending message to ${roomId}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  // Note: markdownToHtml method is removed since we're using plain markdown now
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

