# Personal Brain

A knowledge management system built with TypeScript that uses AI to interact with your personal knowledge base through semantic search and natural language conversations.

## Core Features

- 📝 Store and search markdown notes with semantic embeddings
- 🧠 Query your knowledge using natural language conversations
- 🔍 Semantic search with automatic tagging and categorization
- 🔄 Multiple interfaces: CLI and Matrix chat
- 🌐 Augment knowledge with external sources (Wikipedia, news)
- 👤 Profile-aware contextual responses
- 🧩 Tiered conversation memory with AI-generated summaries
- 📃 Convert conversation insights to permanent notes

## Getting Started

### Installation

```bash
# Clone and install
git clone <repo-url>
cd personal-brain
bun install

# Set up database
bun run db:generate
bun run db:migrate
```

### Configuration

Set environment variables or create a `.env` file:

```
# Required for AI functionality
ANTHROPIC_API_KEY=your_api_key  # Required for conversation features
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219  # Default model

# Optional for embedding generation (if not provided, falls back to dummy embeddings)
OPENAI_API_KEY=your_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional for external sources 
NEWS_API_KEY=your_news_api_key  # For accessing news API

# Logging configuration
LOG_CONSOLE_LEVEL=info  # 'error', 'warn', 'info', 'debug'
LOG_FILE_LEVEL=debug
ERROR_LOG_PATH=error.log
COMBINED_LOG_PATH=combined.log

# Text processing settings
DEFAULT_CHUNK_SIZE=512
DEFAULT_CHUNK_OVERLAP=100
DEFAULT_MAX_TAGS=7
```

### Basic Usage

```bash
# Import content
bun run import ./path/to/your/notes/  # Import markdown files
bun run import profile ./path/to/profile.yaml  # Import profile

# Generate embeddings (required for semantic search)
bun run embed  # Generate for both notes and profile
bun run embed:notes  # Only generate for notes
bun run embed:profile  # Only generate for profile

# Generate tags (optional)
bun run tag  # Generate tags for both notes and profile
bun run tag:notes  # Only generate for notes
bun run tag:profile  # Only generate for profile

# Start CLI interface
bun run cli
```

## CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `ask <question>` | Ask a question to your knowledge base | `ask "What are the principles of ecosystem architecture?"` |
| `search <query>` | Search for notes | `search "personal knowledge"` |
| `list [tag]` | List all notes or notes with a tag | `list ecosystem` |
| `note <id>` | Show a specific note | `note abc123` |
| `tags` | List all tags in the system | `tags` |
| `profile [related]` | View profile or related notes | `profile related` |
| `external <on/off>` | Toggle external knowledge sources | `external on` |
| `status` | Check system status | `status` |
| `save-note [title]` | Save conversation to note | `save-note "Key Insights"` |
| `conversation-notes` | List notes created from conversations | `conversation-notes` |
| `help` | Show command list | `help` |
| `exit` | Exit the program | `exit` |

## Matrix Integration

Set up Matrix integration for chat-based interaction:

```bash
# Configure Matrix credentials
bun run matrix:setup <username> <password>

# Start Matrix interface
bun run matrix:start
```

Use the same commands in Matrix chat with `!brain` prefix (e.g., `!brain ask "What is ecosystem architecture?"`)

## MCP Inspector Integration

Personal Brain implements the Model-Context-Protocol (MCP) architecture, which can be visualized with the MCP Inspector tool:

```bash
# Start the MCP Inspector with Personal Brain (stdin/stdout mode)
bun run mcp:inspect

# Alternative: Use HTTP/SSE connection (more stable)
bun run mcp:server  # Start HTTP server in one terminal
bun run mcp:inspect:http  # Connect inspector in another terminal
```

## Architecture

Personal Brain uses a modular, service-oriented architecture based on the Model-Context-Protocol (MCP) pattern. For comprehensive technical documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

Key architectural patterns:
- **MCP Architecture**: Orchestrates model, context, and protocol components ([details](docs/BRAIN_PROTOCOL_ARCHITECTURE.md))
- **Tiered Memory**: Optimizes conversation context with active, summary, and archive tiers ([details](docs/TIERED_MEMORY.md))
- **Facade Pattern**: Context classes as lightweight facades over specialized services
- **Repository Pattern**: Data access through focused repositories
- **Service Layer**: Single-responsibility business logic components

## Development

```bash
# Run the main app
bun run dev

# Run tests
bun test
bun test tests/specific-file.test.ts  # Run specific test

# Type checking
bun run typecheck

# Linting and formatting
bun run lint
bun run lint:fix
bun run fmt

# Check test coverage
bun run test:coverage
```

## Project Structure

```
personal-brain/
├── src/
│   ├── commands/           # Command handlers for CLI and Matrix
│   │   ├── core/           # Core command handling framework
│   │   └── handlers/       # Specialized command handlers
│   ├── db/                 # Database connection and schema
│   ├── interfaces/         # User interfaces (CLI, Matrix)
│   ├── mcp/                # Model-Context-Protocol implementation
│   │   ├── contexts/       # Context providers (notes, profile, external)
│   │   ├── model/          # AI model integration (Claude, embeddings)
│   │   └── protocol/       # Protocol orchestration
│   │       ├── components/ # Specialized service components
│   │       ├── config/     # Configuration management
│   │       ├── core/       # Core orchestration layer
│   │       ├── managers/   # Specialized context managers
│   │       ├── memory/     # Conversation memory system
│   │       ├── pipeline/   # Query processing pipeline
│   │       └── types/      # Interface and type definitions
│   ├── models/             # Data models and validation
│   ├── services/           # Business logic services
│   │   ├── common/         # Shared service functionality
│   │   ├── interfaces/     # Service interfaces
│   │   ├── notes/          # Note-related services
│   │   └── profiles/       # Profile-related services
│   └── utils/              # Utility functions
├── tests/                  # Test suite
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [BrainProtocol Documentation](docs/BRAIN_PROTOCOL_ARCHITECTURE.md)
- [Tiered Memory System](docs/TIERED_MEMORY.md)
- [Development Roadmap](docs/ROADMAP.md)
- [Test Architecture](docs/TEST_ARCHITECTURE.md)
- [Conversation to Notes Design](docs/CONVERSATION_TO_NOTES.md)
- [Conversation Context Design](docs/CONVERSATION_CONTEXT_DESIGN.md)
- [MCP Implementation](src/mcp/README.md)
- [Protocol Components](src/mcp/protocol/README.md)

## Deployment

For production deployment, Personal Brain can be run as a service:

```bash
# Start the Personal Brain Matrix bot
bun run start  # Uses PM2 process manager

# Stop the bot
bun run stop

# Restart the bot (after code changes)
bun run restart

# Check the bot's status
pm2 status personal-brain

# View logs
pm2 logs personal-brain
```

## License

MIT