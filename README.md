# Personal Brain with MCP Architecture

A personal knowledge management system built with TypeScript, Bun, and Drizzle ORM, using the Model-Context-Protocol (MCP) architecture to interact with your notes using AI.

## Features

- 📝 Store and manage markdown notes in a SQLite database
- 📥 Import existing markdown files with frontmatter support
- 🔍 Search notes by content and tags
- 🧠 AI-powered interaction with your knowledge base
- 🔄 Semantic search with embeddings
- 💬 Multiple interfaces: CLI and Matrix chat
- 🌐 Optional integration with external knowledge sources
- 👤 Profile-aware contextual responses

## What is the MCP Architecture?

Personal Brain implements the Model-Context-Protocol (MCP) architecture for AI-powered knowledge management:

- **Model**: Uses AI models like Claude from Anthropic to process your queries
- **Context**: Manages the retrieval and storage of your notes and external knowledge
- **Protocol**: Orchestrates the interaction between your data and the AI model

This architecture allows the system to:
1. Retrieve relevant context based on your query
2. Format the context appropriately for the AI model
3. Process the response with proper attribution and citations
4. Adapt responses based on your personal profile and preferences

## Getting Started

### Installation

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

### Configuration

For AI features, you'll need to set up your API keys:

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_api_key

# Optional: Set News API key for external knowledge
export NEWS_API_KEY=your_news_api_key
```

## Usage

### Importing Content

```bash
# Import a single markdown file
bun run import ./path/to/your/note.md

# Import all markdown files in a directory
bun run import ./path/to/your/notes/

# Import your profile (YAML format)
bun run import profile ./path/to/profile.yaml
```

### Managing Notes

```bash
# Generate embeddings for semantic search
bun run embed:notes

# Generate tags automatically for your notes
bun run tag:notes

# Delete a note by ID
bun run delete note-id
```

### Interactive Interfaces

#### Command Line Interface

Start the CLI interface:

```bash
bun run cli
```

Available CLI Commands:

| Command | Description | Usage |
|---------|-------------|-------|
| `list [tag]` | List all notes or notes with a specific tag | `list ecosystem` |
| `search <query>` | Search for notes | `search "personal knowledge"` |
| `note <id>` | Show a specific note by ID | `note abc123` |
| `profile [related]` | View your profile or profile-related notes | `profile related` |
| `tags` | List all tags in the system | `tags` |
| `ask <question>` | Ask a question to your brain (requires API key) | `ask "What are the principles of ecosystem architecture?"` |
| `external <on/off>` | Enable or disable external knowledge sources | `external on` |
| `status` | Check system status and connections | `status` |
| `help` | Show available commands | `help` |
| `exit` | Exit the program | `exit` |

#### Matrix Chat Interface

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

Matrix Commands (prefix with `!brain`):

| Command | Description | Usage |
|---------|-------------|-------|
| `help` | Show available commands | `!brain help` |
| `list [tag]` | List all notes or notes with a specific tag | `!brain list ecosystem` |
| `search <query>` | Search for notes | `!brain search "personal knowledge"` |
| `note <id>` | View a specific note | `!brain note abc123` |
| `profile [related]` | View your profile information | `!brain profile related` |
| `tags` | List all tags | `!brain tags` |
| `ask <question>` | Ask a question to your brain | `!brain ask "What are the principles of ecosystem architecture?"` |
| `external <on/off>` | Enable or disable external knowledge sources | `!brain external on` |
| `status` | Check system status | `!brain status` |

## External Knowledge Sources

Personal Brain can optionally use external knowledge sources to supplement your notes when answering queries:

- **Wikipedia**: Retrieves information from Wikipedia articles
- **News API**: Fetches recent news articles related to your query (requires API key)

To enable external sources:

```bash
# In CLI interface
external on

# In Matrix chat
!brain external on
```

## Project Structure

```
personal-brain/
├── src/
│   ├── api/              # API integration
│   ├── commands/         # Command processing for CLI and Matrix
│   │   ├── cli-renderer.ts    # CLI-specific rendering
│   │   ├── index.ts           # Shared command logic
│   │   └── matrix-renderer.ts # Matrix-specific rendering
│   ├── db/               # Database setup and schema
│   ├── importers/        # Importers for markdown files and profiles
│   ├── interfaces/       # User interfaces
│   │   ├── matrix.ts          # Matrix chat interface
│   │   └── matrix-setup.ts    # Matrix authentication setup
│   ├── mcp/              # MCP architecture components
│   │   ├── model/           # AI model integration (Claude)
│   │   │   ├── claude.ts       # Claude API integration
│   │   │   └── embeddings.ts   # Embeddings service
│   │   ├── context/         # Context management for data
│   │   │   ├── noteContext.ts           # Note operations
│   │   │   ├── profileContext.ts        # Profile operations
│   │   │   ├── externalSourceContext.ts # External knowledge sources
│   │   │   └── sources/                 # External source implementations
│   │   └── protocol/        # Interaction protocol
│   │       └── brainProtocol.ts # Orchestrates model and context
│   ├── models/           # Data models and validation
│   ├── utils/            # Shared utility functions
│   ├── cli.ts            # CLI interface
│   ├── import.ts         # Import script
│   ├── delete.ts         # Delete script
│   └── index.ts          # Main application
├── tests/                # Unit tests
├── articles/             # Directory for your markdown files
├── drizzle/              # Database migrations
├── drizzle.config.ts     # Drizzle ORM configuration
└── package.json          # Project dependencies
```

## Development

```bash
# Run the main app
bun run dev

# Typecheck
bun run typecheck

# Format code
bun run fmt

# Run linter
bun run lint

# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

### Testing

The project uses Bun's built-in test runner. Tests are located in the `tests/` directory.

To run all tests:

```bash
bun test
```

To run a specific test:

```bash
bun test tests/embeddings.test.ts
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

## Advanced Features

### Embedding Generation

Embeddings allow for semantic search and better query processing:

```bash
# Generate embeddings for all notes
bun run embed:notes

# Generate embeddings for your profile
bun run embed:profile

# Generate embeddings for both notes and profile
bun run embed
```

### Automatic Tagging

The system can automatically generate tags for your content:

```bash
# Generate tags for notes
bun run tag:notes

# Generate tags for your profile
bun run tag:profile

# Generate tags for both notes and profile
bun run tag
```

## Troubleshooting

Common issues and solutions:

- **API Key Issues**: Ensure your Anthropic API key is set correctly in the environment
- **Database Errors**: Check that migrations have been run with `bun run db:migrate`
- **Matrix Connection Issues**: Verify your homeserver URL and access token in `.env`
- **Missing Embeddings**: Run `bun run embed` to generate embeddings for semantic search

## License

MIT