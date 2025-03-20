# Personal Brain with MCP Architecture

A personal knowledge management system built with TypeScript, Bun, and Drizzle ORM, using the Model-Context-Protocol (MCP) architecture to interact with your notes using AI.

## Features

- Store and manage markdown notes in a SQLite database
- Import existing markdown files with frontmatter support
- Search notes by content and tags
- MCP architecture for AI-powered interaction with your knowledge
- Simple CLI interface
- Matrix chat interface for interacting with your knowledge

## MCP Architecture

This project implements the Model-Context-Protocol (MCP) architecture:

- **Model**: Uses Claude from Anthropic API to process your queries
- **Context**: Manages the retrieval and storage of your notes
- **Protocol**: Handles the interaction between your notes and the AI model

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd personal-brain

# Install dependencies
bun install

# Set up the database
bun run db:generate
bun run db:migrate
```

## Usage

### Importing Markdown Files

```bash
# Import a single markdown file
bun run import ./path/to/your/note.md

# Import all markdown files in a directory
bun run import ./path/to/your/notes/
```

### Interactive Interfaces

#### Command Line Interface

```bash
# Start the CLI interface
bun run cli
```

CLI Commands:
- `list` - List all notes
- `search [query]` - Search for notes
- `ask [question]` - Ask a question to your brain (requires API key)
- `help` - Show available commands
- `exit` - Exit the program

#### Matrix Interface

You can use Matrix as a chat interface to interact with your personal brain:

1. Set up your Matrix credentials:
```bash
bun run matrix:setup <username> <password>
```

2. Copy the generated `.env.matrix` to `.env` and add any missing configuration values:
```bash
cp .env.matrix .env
# Edit .env to add your Anthropic API key and Matrix room IDs
```

3. Start the Matrix interface:
```bash
bun run matrix:start
```

Matrix Commands:
- `!brain help` - Show available commands
- `!brain list [tag]` - List all notes or notes with a specific tag
- `!brain search <query>` - Search for notes
- `!brain note <id>` - View a specific note
- `!brain tags` - List all tags
- `!brain ask <question>` - Ask a question to your brain

### Using the AI Features

To use the AI features, you need an Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your_api_key
bun run cli
```

## Project Structure

```
personal-brain/
├── src/
│   ├── db/              # Database setup and schema
│   ├── importers/       # Importers for markdown files
│   ├── models/          # Data models and validation
│   ├── mcp/             # MCP architecture components
│   │   ├── model/       # AI model integration (Claude)
│   │   ├── context/     # Context management for notes
│   │   └── protocol/    # Interaction protocol between model and context
│   ├── cli.ts           # CLI interface
│   ├── import.ts        # Import script
│   ├── delete.ts        # Delete script
│   └── index.ts         # Main application
├── articles/            # Directory for your markdown files
├── drizzle/             # Database migrations
│   └── 0000_rich_radioactive_man.sql
├── drizzle.config.ts    # Drizzle ORM configuration
└── package.json         # Project dependencies
```

## Development

```bash
# Run the main app
bun run dev

# Typecheck
bun run typecheck
```

## Deployment

The project includes GitHub Actions for deployment to a server. To use it:

1. Set up the following secrets in your GitHub repository:
   - `SSH_PRIVATE_KEY`: Your server's SSH private key
   - `SSH_USER`: Username for your VPS
   - `SSH_HOST`: Hostname/IP of your VPS
   - `PROJECT_PATH`: Path to project directory on server
   - `MATRIX_HOMESERVER_URL`: Your Matrix server URL
   - `MATRIX_USER_ID`: Your Matrix user ID
   - `MATRIX_ACCESS_TOKEN`: Your Matrix access token
   - `MATRIX_ROOM_IDS`: Comma-separated list of room IDs
   - `COMMAND_PREFIX`: Command prefix (default: !brain)
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

2. Push to the main branch to trigger deployment

3. For manual deployment:
   ```bash
   # Start the Matrix interface with PM2
   bun run start
   
   # Stop the bot
   bun run stop
   
   # Restart the bot
   bun run restart
   ```

PM2 will keep your bot running and restart it if it crashes.

## License

MIT