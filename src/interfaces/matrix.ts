#!/usr/bin/env bun
import * as sdk from 'matrix-js-sdk';
import { ClientEvent } from 'matrix-js-sdk';
import { RoomEvent } from 'matrix-js-sdk/lib/models/room';
import { RoomMemberEvent } from 'matrix-js-sdk/lib/models/room-member';
import { MsgType } from 'matrix-js-sdk/lib/@types/event';
import { BrainProtocol } from '../mcp/protocol/brainProtocol';
import { CommandHandler } from '../commands';
import { MatrixRenderer } from '../commands/matrix-renderer';

// Configuration
const HOMESERVER_URL = process.env.MATRIX_HOMESERVER_URL || 'https://matrix.org';
const ACCESS_TOKEN = process.env.MATRIX_ACCESS_TOKEN;
const USER_ID = process.env.MATRIX_USER_ID;
const ROOM_IDS = (process.env.MATRIX_ROOM_IDS || '').split(',').filter(Boolean);
const COMMAND_PREFIX = process.env.COMMAND_PREFIX || '!brain';

// Matrix environment variables check
if (process.env.NODE_ENV !== 'production') {
  console.debug(`MATRIX_HOMESERVER_URL: ${HOMESERVER_URL}`);
  console.debug(`MATRIX_USER_ID: ${USER_ID}`);
  console.debug(`MATRIX_ACCESS_TOKEN: ${ACCESS_TOKEN ? 'Set (hidden)' : 'Not set'}`);
  console.debug(`MATRIX_ROOM_IDS: ${ROOM_IDS.join(', ')}`);
  console.debug(`COMMAND_PREFIX: ${COMMAND_PREFIX}`);
}

if (!ACCESS_TOKEN || !USER_ID) {
  console.error('Error: MATRIX_ACCESS_TOKEN and MATRIX_USER_ID environment variables are required');
  process.exit(1);
}

if (ROOM_IDS.length === 0) {
  console.error('Warning: No MATRIX_ROOM_IDS provided, the bot will not automatically join any rooms');
}

class MatrixBrainInterface {
  private client: sdk.MatrixClient;
  private brainProtocol: BrainProtocol;
  private commandHandler: CommandHandler;
  private renderer: MatrixRenderer;
  private isReady = false;

  constructor() {
    this.client = sdk.createClient({
      baseUrl: HOMESERVER_URL,
      accessToken: ACCESS_TOKEN,
      userId: USER_ID,
    });

    this.brainProtocol = new BrainProtocol();
    this.commandHandler = new CommandHandler(this.brainProtocol);
    
    // Initialize renderer with message sending function
    this.renderer = new MatrixRenderer(
      COMMAND_PREFIX, 
      this.sendMessage.bind(this),
    );
  }

  async start() {
    console.log(`Starting Matrix brain interface as ${USER_ID}`);
    
    // Register event handlers
    this.client.on(RoomEvent.Timeline, this.handleRoomMessage.bind(this));
    this.client.on(RoomMemberEvent.Membership, this.handleMembership.bind(this));
    
    // Start the client
    await this.client.startClient({ initialSyncLimit: 10 });
    console.log('Matrix client started, waiting for sync');
    
    // Wait for the client to sync
    this.client.once(ClientEvent.Sync, (state: string) => {
      if (state === 'PREPARED') {
        console.log('Client sync complete');
        this.isReady = true;
        
        // Auto-join configured rooms
        this.joinConfiguredRooms();
      } else {
        console.error(`Sync failed with state: ${state}`);
        process.exit(1);
      }
    });
  }
  
  private async joinConfiguredRooms() {
    if (ROOM_IDS.length === 0) return;
    
    console.log(`Joining ${ROOM_IDS.length} configured rooms...`);
    
    for (const roomId of ROOM_IDS) {
      try {
        await this.client.joinRoom(roomId);
        console.log(`Joined room ${roomId}`);
      } catch (error: unknown) {
        console.error(`Failed to join room ${roomId}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  private async handleMembership(event: any, member: any) {
    // Auto-accept invites for the bot
    if (member.userId === USER_ID && member.membership === 'invite') {
      console.log(`Received invite to room ${member.roomId}, auto-joining`);
      try {
        await this.client.joinRoom(member.roomId);
        
        // Send welcome message
        this.sendMessage(
          member.roomId,
          `Hello! I'm your personal brain assistant. Type \`${COMMAND_PREFIX} help\` to see available commands.`,
        );
      } catch (error: unknown) {
        console.error(`Failed to join room ${member.roomId}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  private async handleRoomMessage(event: any, room: any) {
    
    // Only process messages if the client is ready
    if (!this.isReady) {
      return;
    }
    
    // Ignore non-text messages 
    if (event.getType() !== 'm.room.message') {
      return;
    }
    
    
    const content = event.getContent();
    
    // Only process text messages
    if (content.msgtype !== 'm.text') {
      return;
    }
    
    const text = content.body.trim();
    // Check if the text starts with the command prefix
    if (text.startsWith(COMMAND_PREFIX)) {
      
      const commandText = text.substring(COMMAND_PREFIX.length).trim();
      try {
        await this.processCommand(commandText, room.roomId, event);
      } catch (error: unknown) {
        console.error('Error processing command:', error instanceof Error ? error.message : String(error));
        this.sendMessage(room.roomId, `Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('=================================================');
  }
  
  private async processCommand(commandText: string, roomId: string, event: any) {
    // Handle empty command (just the prefix) as help
    if (!commandText) {
      this.renderer.renderHelp(roomId, this.commandHandler.getCommands());
      return;
    }
    
    // Split into command and arguments
    const parts = commandText.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    // Handle help command specially
    if (command === 'help') {
      this.renderer.renderHelp(roomId, this.commandHandler.getCommands());
      return;
    }
    
    // Process the command through our shared command handler
    try {
      // Special case for "ask" command to show "thinking" message
      if (command === 'ask' && args) {
        this.sendMessage(roomId, `🤔 Thinking about: "${args}"...`);
      }
      
      const result = await this.commandHandler.processCommand(command, args);
      
      // Render the result using our Matrix renderer
      this.renderer.render(roomId, result);
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      this.sendMessage(roomId, `❌ Error executing command: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Helper methods
  
  private sendMessage(roomId: string, message: string) {
    try {
      // First try sendMessage without HTML
      this.client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: message,
      }).catch((error: unknown) => {
        console.error(`Error sending plain message to ${roomId}:`, error instanceof Error ? error.message : String(error));
        
        // Fallback to HTML message
        this.client.sendHtmlMessage(roomId, message, this.markdownToHtml(message))
          .catch((htmlError: unknown) => console.error(`Error sending HTML message to ${roomId}:`, htmlError instanceof Error ? htmlError.message : String(htmlError)));
      });
    } catch (error: unknown) {
      console.error(`Exception in sendMessage to ${roomId}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  private markdownToHtml(markdown: string): string {
    // This is a very basic markdown to HTML conversion
    // In a production app, you would use a proper markdown parser
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

async function main() {
  const matrixInterface = new MatrixBrainInterface();
  await matrixInterface.start();
  
  console.log('Matrix brain interface is running');
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    process.exit(0);
  });
}

// Only run the main function if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MatrixBrainInterface };