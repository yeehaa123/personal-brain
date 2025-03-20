#!/usr/bin/env bun
import * as sdk from 'matrix-js-sdk';
import { BrainProtocol } from '../mcp/protocol/brainProtocol';
import { NoteContext } from '../mcp/context/noteContext';
import type { Note } from '../models/note';

// Configuration
const HOMESERVER_URL = process.env.MATRIX_HOMESERVER_URL || 'https://matrix.org';
const ACCESS_TOKEN = process.env.MATRIX_ACCESS_TOKEN;
const USER_ID = process.env.MATRIX_USER_ID;
const ROOM_IDS = (process.env.MATRIX_ROOM_IDS || '').split(',').filter(Boolean);
const COMMAND_PREFIX = process.env.COMMAND_PREFIX || '!brain';

// Debug environment variables
console.log('Environment variables:');
console.log(`MATRIX_HOMESERVER_URL: ${HOMESERVER_URL}`);
console.log(`MATRIX_USER_ID: ${USER_ID}`);
console.log(`MATRIX_ACCESS_TOKEN: ${ACCESS_TOKEN ? 'Set (hidden)' : 'Not set'}`);
console.log(`MATRIX_ROOM_IDS: ${ROOM_IDS.join(', ')}`);
console.log(`COMMAND_PREFIX: ${COMMAND_PREFIX}`);

if (!ACCESS_TOKEN || !USER_ID) {
  console.error('Error: MATRIX_ACCESS_TOKEN and MATRIX_USER_ID environment variables are required');
  process.exit(1);
}

if (ROOM_IDS.length === 0) {
  console.error('Warning: No MATRIX_ROOM_IDS provided, the bot will not automatically join any rooms');
}

interface CommandHandler {
  command: string;
  description: string;
  handler: (args: string, roomId: string, event: any) => Promise<void>;
}

class MatrixBrainInterface {
  private client: sdk.MatrixClient;
  private brainProtocol: BrainProtocol;
  private context: NoteContext;
  private commandHandlers: CommandHandler[] = [];
  private isReady = false;

  constructor() {
    this.client = sdk.createClient({
      baseUrl: HOMESERVER_URL,
      accessToken: ACCESS_TOKEN,
      userId: USER_ID,
    });

    this.context = new NoteContext();
    this.brainProtocol = new BrainProtocol();

    // Register command handlers
    this.registerCommands();
  }

  private registerCommands() {
    this.commandHandlers = [
      {
        command: 'help',
        description: 'Show available commands',
        handler: this.handleHelp.bind(this)
      },
      {
        command: 'search',
        description: 'Search for notes: !brain search <query>',
        handler: this.handleSearch.bind(this)
      },
      {
        command: 'tags',
        description: 'List all tags in the system',
        handler: this.handleTags.bind(this)
      },
      {
        command: 'list',
        description: 'List all notes or notes with a specific tag: !brain list [tag]',
        handler: this.handleList.bind(this)
      },
      {
        command: 'note',
        description: 'Show a specific note by ID: !brain note <id>',
        handler: this.handleNote.bind(this)
      },
      {
        command: 'ask',
        description: 'Ask a question to your brain: !brain ask <question>',
        handler: this.handleAsk.bind(this)
      }
    ];
  }

  async start() {
    console.log(`Starting Matrix brain interface as ${USER_ID}`);
    
    // Register event handlers
    this.client.on('Room.timeline', this.handleRoomMessage.bind(this));
    this.client.on('RoomMember.membership', this.handleMembership.bind(this));
    
    // Start the client
    await this.client.startClient({ initialSyncLimit: 10 });
    console.log('Matrix client started, waiting for sync');
    
    // Wait for the client to sync
    this.client.once('sync', (state: any) => {
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
      } catch (error) {
        console.error(`Failed to join room ${roomId}:`, error);
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
          `Hello! I'm your personal brain assistant. Type \`${COMMAND_PREFIX} help\` to see available commands.`
        );
      } catch (error) {
        console.error(`Failed to join room ${member.roomId}:`, error);
      }
    }
  }
  
  private async handleRoomMessage(event: any, room: any) {
    console.log("=========== DEBUGGING MESSAGE RECEIPT ===========");
    console.log(`Room ID: ${room.roomId}`);
    console.log(`Event type: ${event.getType()}`);
    console.log(`Sender: ${event.getSender()}`);
    
    if (event.getType() === 'm.room.message') {
      const content = event.getContent();
      console.log(`Message type: ${content.msgtype}`);
      if (content.msgtype === 'm.text') {
        console.log(`Message content: "${content.body}"`);
      }
    }
    
    // Only process messages if the client is ready
    if (!this.isReady) {
      console.log("Client not ready yet");
      return;
    }
    
    // Ignore non-text messages 
    if (event.getType() !== 'm.room.message') {
      console.log("Ignoring non-message event");
      return;
    }
    
    // Debug sender info but don't filter out bot messages
    if (event.getSender() === USER_ID) {
      console.log("Message from self detected - processing anyway");
    }
    
    const content = event.getContent();
    
    // Only process text messages
    if (content.msgtype !== 'm.text') {
      console.log("Ignoring non-text message");
      return;
    }
    
    const text = content.body.trim();
    console.log(`Processing text: "${text}"`);
    console.log(`Command prefix: "${COMMAND_PREFIX}"`);
    
    // Try a simpler approach - just check if the text starts with the prefix
    if (text.startsWith(COMMAND_PREFIX)) {
      console.log("Command detected!");
      
      // Always send a confirmation message for debugging
      this.sendMessage(room.roomId, `I received your command: ${text}`);
      
      const commandText = text.substring(COMMAND_PREFIX.length).trim();
      try {
        await this.processCommand(commandText, room.roomId, event);
      } catch (error) {
        console.error("Error processing command:", error);
        this.sendMessage(room.roomId, `Error: ${error.message}`);
      }
    } else {
      console.log("Not a command");
    }
    
    console.log("=================================================");
  }
  
  private async processCommand(commandText: string, roomId: string, event: any) {
    console.log(`Processing command text: "${commandText}"`);
    
    // Handle empty command (just the prefix) as help
    if (!commandText) {
      console.log("Empty command - showing help");
      await this.handleHelp('', roomId, event);
      return;
    }
    
    // Split into command and arguments
    const parts = commandText.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    console.log(`Command: "${command}", Args: "${args}"`);
    
    // Find and execute the matching command handler
    const handler = this.commandHandlers.find(h => h.command === command);
    
    if (handler) {
      console.log(`Found handler for command: ${command}`);
      try {
        await handler.handler(args, roomId, event);
      } catch (error) {
        console.error(`Error executing command ${command}:`, error);
        this.sendMessage(roomId, `❌ Error executing command: ${error.message}`);
      }
    } else {
      console.log(`Unknown command: ${command}`);
      this.sendMessage(
        roomId,
        `Unknown command: ${command}. Type \`${COMMAND_PREFIX} help\` to see available commands.`
      );
    }
  }
  
  // Command Handlers
  
  private async handleHelp(args: string, roomId: string, event: any) {
    const helpText = [
      '### Personal Brain Commands',
      '',
      ...this.commandHandlers.map(handler => `- \`${COMMAND_PREFIX} ${handler.command}\`: ${handler.description}`)
    ].join('\n');
    
    this.sendMessage(roomId, helpText);
  }
  
  private async handleSearch(query: string, roomId: string, event: any) {
    if (!query) {
      this.sendMessage(roomId, `Please provide a search query: \`${COMMAND_PREFIX} search <query>\``);
      return;
    }
    
    this.sendMessage(roomId, `🔍 Searching for: ${query}`);
    
    try {
      const notes = await this.context.searchNotes({ query, limit: 5 });
      
      if (notes.length === 0) {
        this.sendMessage(roomId, 'No results found.');
        return;
      }
      
      const results = [
        `### Search Results for "${query}"`,
        '',
        ...notes.map((note, index) => this.formatNotePreview(note, index + 1))
      ].join('\n');
      
      this.sendMessage(roomId, results);
    } catch (error) {
      console.error('Search error:', error);
      this.sendMessage(roomId, `❌ Error searching notes: ${error.message}`);
    }
  }
  
  private async handleTags(args: string, roomId: string, event: any) {
    try {
      // Get all notes
      const allNotes = await this.context.searchNotes({ limit: 1000 });
      
      // Extract and count all tags
      const tagCounts: { [tag: string]: number } = {};
      
      allNotes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      // Sort tags by count
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => `- \`${tag}\` (${count})`);
      
      if (sortedTags.length === 0) {
        this.sendMessage(roomId, 'No tags found in the system.');
        return;
      }
      
      const message = [
        '### Available Tags',
        '',
        ...sortedTags
      ].join('\n');
      
      this.sendMessage(roomId, message);
    } catch (error) {
      console.error('Tags error:', error);
      this.sendMessage(roomId, `❌ Error retrieving tags: ${error.message}`);
    }
  }
  
  private async handleList(tagFilter: string, roomId: string, event: any) {
    try {
      let notes: Note[];
      
      if (tagFilter) {
        // List notes with the specific tag
        notes = await this.context.searchNotes({ 
          tags: [tagFilter], 
          limit: 10 
        });
        
        if (notes.length === 0) {
          this.sendMessage(roomId, `No notes found with tag: ${tagFilter}`);
          return;
        }
      } else {
        // List all notes
        notes = await this.context.searchNotes({ limit: 10 });
        
        if (notes.length === 0) {
          this.sendMessage(roomId, 'No notes found in the system.');
          return;
        }
      }
      
      const message = [
        tagFilter ? `### Notes with tag: ${tagFilter}` : '### Recent Notes',
        '',
        ...notes.map((note, index) => this.formatNotePreview(note, index + 1))
      ].join('\n');
      
      this.sendMessage(roomId, message);
    } catch (error) {
      console.error('List error:', error);
      this.sendMessage(roomId, `❌ Error listing notes: ${error.message}`);
    }
  }
  
  private async handleNote(noteId: string, roomId: string, event: any) {
    if (!noteId) {
      this.sendMessage(roomId, `Please provide a note ID: \`${COMMAND_PREFIX} note <id>\``);
      return;
    }
    
    try {
      const note = await this.context.getNoteById(noteId);
      
      if (!note) {
        this.sendMessage(roomId, `Note with ID ${noteId} not found.`);
        return;
      }
      
      // Format the note content
      const formattedContent = note.content
        // Remove source comment if present
        .replace(/<!--\s*source:[^>]+-->\n?/, '')
        // Ensure the content has proper newlines
        .trim();
      
      const tags = note.tags && note.tags.length > 0
        ? `Tags: ${note.tags.map(tag => `\`${tag}\``).join(', ')}`
        : 'No tags';
      
      const message = [
        `## ${note.title}`,
        '',
        tags,
        `ID: \`${note.id}\``,
        `Created: ${new Date(note.createdAt).toLocaleString()}`,
        `Updated: ${new Date(note.updatedAt).toLocaleString()}`,
        '',
        '---',
        '',
        formattedContent
      ].join('\n');
      
      this.sendMessage(roomId, message);
    } catch (error) {
      console.error('Note error:', error);
      this.sendMessage(roomId, `❌ Error retrieving note: ${error.message}`);
    }
  }
  
  private async handleAsk(question: string, roomId: string, event: any) {
    if (!question) {
      this.sendMessage(roomId, `Please provide a question: \`${COMMAND_PREFIX} ask <question>\``);
      return;
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      this.sendMessage(
        roomId, 
        '❌ No Anthropic API key found. Set the ANTHROPIC_API_KEY environment variable to use this feature.'
      );
      return;
    }
    
    this.sendMessage(roomId, `🤔 Thinking about: "${question}"...`);
    
    try {
      const result = await this.brainProtocol.processQuery(question);
      
      let message = [
        '### Answer',
        '',
        result.answer,
      ];
      
      if (result.citations.length > 0) {
        message.push('', '#### Sources');
        result.citations.forEach(citation => {
          message.push(`- ${citation.noteTitle} (\`${citation.noteId}\`)`);
        });
      }
      
      if (result.relatedNotes.length > 0) {
        message.push('', '#### Related Notes');
        result.relatedNotes.forEach((note, index) => {
          message.push(this.formatNotePreview(note, index + 1, false));
        });
      }
      
      this.sendMessage(roomId, message.join('\n'));
    } catch (error) {
      console.error('Ask error:', error);
      this.sendMessage(roomId, `❌ Error processing question: ${error.message}`);
    }
  }
  
  // Helper methods
  
  private formatNotePreview(note: Note, index: number, includeNewlines = true): string {
    const nl = includeNewlines ? '\n' : ' ';
    const title = `**${index}. ${note.title}**`;
    const id = `ID: \`${note.id}\``;
    
    const tags = note.tags && note.tags.length > 0
      ? `Tags: ${note.tags.map(tag => `\`${tag}\``).join(', ')}`
      : 'No tags';
    
    // Extract a content preview
    const contentWithoutSource = note.content.replace(/<!--\s*source:[^>]+-->\n?/, '');
    const preview = contentWithoutSource.length > 100
      ? contentWithoutSource.substring(0, 100) + '...'
      : contentWithoutSource;
    
    return `${title}${nl}${id} - ${tags}${nl}${preview}`;
  }
  
  private sendMessage(roomId: string, message: string) {
    console.log(`Sending message to ${roomId}: "${message.substring(0, 50)}..."`);
    
    try {
      // First try sendMessage without HTML
      this.client.sendMessage(roomId, {
        msgtype: 'm.text',
        body: message
      }).catch(error => {
        console.error(`Error sending plain message to ${roomId}:`, error);
        
        // Fallback to HTML message
        this.client.sendHtmlMessage(roomId, message, this.markdownToHtml(message))
          .catch(htmlError => console.error(`Error sending HTML message to ${roomId}:`, htmlError));
      });
    } catch (error) {
      console.error(`Exception in sendMessage to ${roomId}:`, error);
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