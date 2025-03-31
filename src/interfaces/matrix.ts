#!/usr/bin/env bun
import * as sdk from 'matrix-js-sdk';
import type { MatrixEvent, Room, RoomMember } from 'matrix-js-sdk';
import { ClientEvent } from 'matrix-js-sdk';
import { RoomEvent } from 'matrix-js-sdk/lib/models/room';
import { RoomMemberEvent } from 'matrix-js-sdk/lib/models/room-member';
import { MsgType } from 'matrix-js-sdk/lib/@types/event';
import { BrainProtocol } from '../mcp/protocol/brainProtocol';
import { CommandHandler } from '../commands';
import { MatrixRenderer } from '../commands/matrix-renderer';
import logger from '../utils/logger';
import { marked } from 'marked';
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

  constructor() {
    // Load and validate configuration
    this.config = this.loadConfig();
    
    // Initialize Matrix client
    this.client = sdk.createClient({
      baseUrl: this.config.homeserverUrl,
      accessToken: this.config.accessToken,
      userId: this.config.userId,
    });

    // Initialize brain protocol and command handler
    this.brainProtocol = new BrainProtocol();
    this.commandHandler = new CommandHandler(this.brainProtocol);

    // Initialize renderer with message sending function
    this.renderer = new MatrixRenderer(
      this.config.commandPrefix,
      this.sendMessage.bind(this),
    );
  }

  /**
   * Load config from environment with validation
   */
  private loadConfig(): MatrixConfig {
    const homeserverUrl = process.env.MATRIX_HOMESERVER_URL || 'https://matrix.org';
    const accessToken = process.env.MATRIX_ACCESS_TOKEN;
    const userId = process.env.MATRIX_USER_ID;
    const roomIds = (process.env.MATRIX_ROOM_IDS || '').split(',').filter(Boolean);
    const commandPrefix = process.env.COMMAND_PREFIX || '!brain';

    // Log configuration in non-production environments
    if (process.env.NODE_ENV !== 'production') {
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

    const text = content.body.trim();
    
    // Check if the text starts with the command prefix
    if (text.startsWith(this.config.commandPrefix)) {
      // Extract command text after the prefix
      const commandText = text.substring(this.config.commandPrefix.length).trim();
      
      try {
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

