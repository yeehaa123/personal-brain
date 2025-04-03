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
- 🧩 Tiered conversation memory with AI-generated summaries

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
5. Maintain conversation history with tiered memory management

### MCP Inspector Integration

Personal Brain can be inspected and visualized with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) tool, which provides a web interface for exploring MCP implementations.

```bash
# Start the MCP Inspector with Personal Brain using stdin/stdout
bun run mcp:inspect

# Alternative: Use HTTP/SSE connection (more stable in some environments)
bun run mcp:server  # Start the HTTP server in one terminal
bun run mcp:inspect:http  # Connect inspector via HTTP in another terminal

# Run tests to validate MCP serialization
bun run mcp:test:stdio
```

For more details, see:
- [MCP implementation documentation](src/mcp/README.md)
- [MCP Inspector guide](src/mcp/INSPECTOR.md)

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

Personal Brain uses a centralized configuration system in `src/config.ts` that loads values from environment variables with sensible defaults:

```bash
# AI Model APIs
export ANTHROPIC_API_KEY=your_api_key
export OPENAI_API_KEY=your_api_key
export ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
export OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# External API keys
export NEWS_API_KEY=your_news_api_key

# Logging configuration
export LOG_CONSOLE_LEVEL=info  # 'error', 'warn', 'info', 'debug'
export LOG_FILE_LEVEL=debug
export ERROR_LOG_PATH=error.log
export COMBINED_LOG_PATH=combined.log

# Text processing settings
export DEFAULT_CHUNK_SIZE=512
export DEFAULT_CHUNK_OVERLAP=100
export DEFAULT_MAX_TAGS=7
```

#### Configuration Categories

The configuration is organized into the following categories:

- **Log Configuration**: Log levels, file paths for log outputs
- **AI Model Configuration**: API keys, model names, embedding dimensions
- **Text Processing**: Chunk sizes, tag limits, reading time calculations
- **External APIs**: Base URLs, API keys for external services
- **Application Paths**: Standard file locations for imports/profiles
- **Database Configuration**: Database connection settings
- **Conversation Memory**: Settings for tiered memory management, summarization

All configuration values have sensible defaults, but can be overridden with environment variables.

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
│   ├── commands/         # Command processing for CLI and Matrix
│   │   ├── cli-renderer.ts    # CLI-specific rendering
│   │   ├── index.ts           # Shared command logic
│   │   └── matrix-renderer.ts # Matrix-specific rendering
│   ├── db/               # Database setup and schema
│   │   ├── index.ts           # Database connection
│   │   ├── schema.ts          # Table definitions
│   │   └── migrate.ts         # Migration utilities
│   ├── importers/        # Importers for markdown files and profiles
│   │   ├── markdownImporter.ts # Import markdown files
│   │   └── profileImporter.ts  # Import profile YAML
│   ├── interfaces/       # User interfaces
│   │   ├── cli-app.ts         # CLI interface app
│   │   ├── matrix.ts          # Matrix chat interface
│   │   ├── matrix-setup.ts    # Matrix authentication setup
│   │   └── mcp-cli.ts         # MCP command-line interface
│   ├── mcp/              # Model Context Protocol implementation
│   │   ├── contexts/        # Context providers
│   │   │   ├── notes/             # Note context
│   │   │   ├── profiles/          # Profile context
│   │   │   └── externalSources/   # External knowledge sources
│   │   ├── model/           # AI model integration
│   │   │   ├── claude.ts         # Claude API integration
│   │   │   └── embeddings.ts     # Embeddings service
│   │   ├── protocol/        # Protocol components
│   │   │   ├── brainProtocol.ts  # Main orchestration class
│   │   │   ├── components/       # Protocol service components
│   │   │   ├── memory/           # Conversation memory system
│   │   │   ├── schemas/          # Data validation schemas
│   │   │   └── types.ts          # Protocol type definitions
│   │   ├── MIGRATION.md     # MCP integration docs
│   │   └── README.md        # MCP architecture docs
│   ├── models/           # Data models and validation
│   │   ├── note.ts           # Note data model
│   │   └── profile.ts        # Profile data model
│   ├── services/         # Service implementations
│   │   ├── notes/           # Note-related services
│   │   │   ├── noteRepository.ts      # Database operations
│   │   │   ├── noteEmbeddingService.ts # Embedding operations
│   │   │   └── noteSearchService.ts   # Search functionality
│   │   └── profiles/        # Profile-related services 
│   │       ├── profileRepository.ts    # Database operations
│   │       ├── profileEmbeddingService.ts # Embedding operations
│   │       ├── profileTagService.ts    # Tag generation
│   │       └── profileSearchService.ts # Search functionality
│   ├── utils/            # Shared utility functions
│   │   ├── cliInterface.ts    # CLI formatting utilities
│   │   ├── configUtils.ts     # Configuration helpers
│   │   ├── errorUtils.ts      # Error handling
│   │   ├── logger.ts          # Logging system
│   │   ├── noteUtils.ts       # Note utilities
│   │   ├── tagExtractor.ts    # Tag extraction utilities
│   │   └── textUtils.ts       # Text processing utilities
│   ├── cli.ts            # CLI entry point
│   ├── config.ts         # Application configuration
│   ├── embed.ts          # Embedding generation script
│   ├── import.ts         # Import entry point
│   ├── delete.ts         # Delete script
│   └── index.ts          # Main application
├── tests/                # Unit tests
├── articles/             # Directory for markdown files
├── drizzle/              # Database migrations
├── scripts/              # Utility scripts
├── .github/workflows/    # GitHub Actions workflow definitions
│   └── deploy.yml        # Deployment workflow
├── drizzle.config.ts     # Drizzle ORM configuration
├── CLAUDE.md             # Claude-specific guidelines
└── package.json          # Project dependencies
```

## Architecture

The project uses a service-oriented architecture following the Single Responsibility Principle:

1. **Facade Pattern**: The Context classes serve as facades over specialized services
2. **Repository Pattern**: Data access is abstracted through repository classes
3. **Service Layer**: Business logic is contained in focused service classes
4. **MCP Architecture**: The overall system uses Model-Context-Protocol architecture
5. **Tiered Memory Pattern**: Conversation history uses active, summary, and archive tiers

### Recent Architectural Improvements

The codebase has been significantly enhanced with new architectural patterns:

- **Service-Oriented Refactoring**: Transformed monolithic context classes into lightweight facades
  - **NoteContext**: Previously 896 lines, now a lightweight facade over specialized services
  - **ProfileContext**: Converted to a facade over repository, embedding, tag, and search services
  - **Services**: Focused classes with single responsibilities for better maintainability and testing

- **Tiered Memory System**: Implemented a sophisticated conversation memory system
  - **Active Tier**: Maintains recent conversation turns in full detail
  - **Summary Tier**: Stores AI-generated summaries of older conversation segments
  - **Archive Tier**: Preserves original turns that have been summarized
  - **Automatic Summarization**: Uses AI to condense older conversations to optimize token usage
  - **Memory Management**: Configurable thresholds for tier transitions
  - [Detailed documentation](docs/TIERED_MEMORY.md) available

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

# MCP-related commands
bun run mcp:server       # Run the HTTP server for MCP
bun run mcp:stdio        # Run the stdio server for MCP Inspector
bun run mcp:inspect      # Run the MCP Inspector with Personal Brain using stdio
bun run mcp:inspect:http # Run the MCP Inspector with Personal Brain using HTTP/SSE
bun run mcp:inspect:kill # Kill any running MCP Inspector instances
bun run mcp:test         # Run HTTP server tests
bun run mcp:test:stdio   # Run stdio server tests
```

## Implementation Metrics

The development of the Personal Brain system has been carefully tracked to understand resource utilization and efficiency:

| Metric | Value |
|--------|-------|
| Total development cost | $60.72 |
| Total API interaction time | 2h 30m 9s |
| Total development time | 20h 14m 28s |
| Code changes | 9,179 lines added, 2,098 lines removed |
| Total test count | 297 tests across 41 files |

These metrics demonstrate the efficiency of leveraging AI-assisted development for complex architectural features.

## Roadmap

The Personal Brain project is focused on enhancing personal knowledge management with AI conversations. Here's our planned development path:

### Recently Completed
1. ✅ **Tiered Memory System**: Implemented sophisticated conversation memory with three tiers for optimized token usage
2. ✅ **Conversation Summarization**: Added AI-powered summarization of older conversation turns
3. ✅ **Enhanced Context Management**: Improved context handling with automatic tier transitions
4. ✅ **ESLint Configuration**: Updated linting rules to better handle error handling patterns

### Near-term (Next 3 months)
1. **Integration with Note System**: Connect conversations with notes for a cohesive knowledge base
   - Convert key insights from conversations into notes
   - Reference relevant notes in conversation context
   - Create bidirectional links between notes and conversations
2. **Memory Usage Optimization**: Implement token counting for precise context management
3. **Knowledge Graph Visualization**: Create visualizations of connections between notes and concepts
4. **Matrix Interface Enhancements**: Add rich media support and improve response formatting
5. **Multimodal Support (Phase 1)**: Add ability to store and reference images within notes

### Mid-term (3-6 months)
1. **Cross-reference Discovery**: Automatically identify and suggest connections between related notes
2. **Advanced External Sources**: Integrate additional knowledge sources beyond Wikipedia and News API
3. **Semantic Navigation**: Navigate between related concepts and notes using semantic similarity
4. **Interactive Visualizations**: Add interactive knowledge maps that help discover relationships
5. **Multimodal Support (Phase 2)**: Add support for PDF documents and audio note references

### Long-term (6-12 months)
1. **Personal Knowledge Assistant**: Proactively suggest relevant notes and resources based on current work
2. **Embedded Media Processing**: Extract and index content from images and documents for search
3. **Timeline Views**: Visualize the evolution of knowledge and concepts over time
4. **Extended Matrix Features**: Add commands for knowledge organization and filtering
5. **Local-first Sync**: Ensure all operations work offline with reliable local storage and synchronization
6. **Database-backed Memory Storage**: Implement persistent storage for conversation memory

This roadmap prioritizes features that create a cohesive experience between conversations and notes, optimize memory usage, and enhance the overall knowledge management capabilities.

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

### Automatic Deployment with GitHub Actions

The project includes a GitHub Actions workflow for automated deployment to a VPS or dedicated server. This allows you to host your Personal Brain bot with continuous deployment on every push to the main branch.

#### Setting Up GitHub Actions Deployment

1. **Configure GitHub Secrets**
   
   Go to your repository Settings → Secrets and variables → Actions, and add the following secrets:

   | Secret Name | Description |
   |-------------|-------------|
   | `SSH_PRIVATE_KEY` | Your server's SSH private key (the content of your `id_rsa` file) |
   | `SSH_USER` | Username for your server (e.g., `ubuntu`, `root`) |
   | `SERVER_IP` | Hostname or IP address of your server |
   | `MATRIX_HOMESERVER_URL` | Your Matrix homeserver URL (e.g., `https://matrix.org`) |
   | `MATRIX_USER_ID` | Your bot's Matrix user ID (e.g., `@personalbot:matrix.org`) |
   | `MATRIX_ACCESS_TOKEN` | Your Matrix access token (from `bun run matrix:setup`) |
   | `MATRIX_ROOM_IDS` | Comma-separated list of room IDs where the bot should be active |
   | `COMMAND_PREFIX` | Command prefix for the bot (default: `!brain`) |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude |
   | `OPENAI_API_KEY` | Your OpenAI API key for embeddings (optional) |

2. **Workflow Details**

   The GitHub Action workflow will:
   - Connect to your server via SSH using the provided credentials
   - Clone or update the repository at `/opt/personal-brain` (created automatically)
   - Install Bun runtime if not already installed
   - Set up all environment variables from the GitHub secrets
   - Run database migrations and generate embeddings automatically
   - Start or restart the application using PM2

3. **Triggering Deployment**

   The deployment is triggered automatically on every push to the `main` branch. You can also manually trigger the workflow from the Actions tab in your repository.

### How the GitHub Actions Workflow Works

The workflow executes the following steps on your server:

1. Sets up an SSH connection to your server
2. Creates the project directory if it doesn't exist
3. Clones or updates the repository with the latest code
4. Installs Bun if not already installed
5. Installs project dependencies
6. Creates a `.env` file with all your secrets and configuration
7. Runs database migrations
8. Generates embeddings for all notes
9. Starts or restarts the application

### Manual Deployment Commands

For manual operations on your server, you can use these commands:

```bash
# Start the Personal Brain Matrix bot
bun run start

# Stop the bot
bun run stop

# Restart the bot (after code changes)
bun run restart

# Check the bot's status
bun run status

# View logs
bun run logs
```

The bot is managed by PM2, which ensures it stays running and automatically restarts if it crashes.

### Server Requirements

- Ubuntu 20.04+ or similar Linux distribution
- At least 1GB RAM and 10GB storage
- Open outbound connections (for API calls)
- SSH access for deployment

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