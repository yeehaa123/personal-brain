# Personal Brain

A knowledge management system built with TypeScript that uses AI to interact with your personal knowledge base.

## Core Features

- 📝 Store and search markdown notes with semantic embeddings
- 🧠 Query your knowledge using natural language conversations
- 🔍 Semantic search with automatic tagging and categorization
- 🔄 Multiple interfaces: CLI and Matrix chat
- 🌐 Augment knowledge with external sources (Wikipedia, news)
- 👤 Profile-aware contextual responses
- 🧩 Tiered conversation memory with AI-generated summaries

## Architecture

Personal Brain uses a modular, service-oriented architecture based on the Model-Context-Protocol (MCP) pattern. For comprehensive technical documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

Key architectural patterns:
- **MCP Architecture**: AI model integration via Model-Context-Protocol ([details](docs/BRAIN_PROTOCOL_ARCHITECTURE.md))
- **Tiered Memory**: Optimize conversation context with active, summary, and archive tiers ([details](docs/TIERED_MEMORY.md))
- **Facade Pattern**: Context classes as lightweight facades over specialized services
- **Repository Pattern**: Data access through focused repositories
- **Service Layer**: Single-responsibility business logic components

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
# Required
ANTHROPIC_API_KEY=your_api_key

# Optional
OPENAI_API_KEY=your_api_key
NEWS_API_KEY=your_news_api_key
LOG_LEVEL=info
```

### Basic Usage

```bash
# Import content
bun run import ./path/to/your/notes/
bun run import profile ./path/to/profile.yaml

# Generate embeddings
bun run embed

# Start CLI interface
bun run cli
```

## CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `ask <question>` | Ask your knowledge base a question | `ask "What are the principles of ecosystem architecture?"` |
| `search <query>` | Search for notes | `search "personal knowledge"` |
| `list [tag]` | List all notes or notes with a tag | `list ecosystem` |
| `note <id>` | Show a specific note | `note abc123` |
| `profile [related]` | View profile or related notes | `profile related` |
| `tags` | List all tags | `tags` |
| `external <on/off>` | Toggle external sources | `external on` |

## Matrix Integration

Set up Matrix integration:

```bash
# Configure Matrix credentials
bun run matrix:setup <username> <password>

# Start Matrix interface
bun run matrix:start
```

Use the same commands in Matrix chat with `!brain` prefix (e.g., `!brain ask "What is..."`)

## Development

```bash
# Run tests
bun test

# Typecheck
bun run typecheck

# Format code
bun run fmt

# Lint code
bun run lint

# Start MCP Inspector
bun run mcp:inspect
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [BrainProtocol Documentation](docs/BRAIN_PROTOCOL_ARCHITECTURE.md)
- [Tiered Memory System](docs/TIERED_MEMORY.md)
- [Test Architecture](docs/TEST_ARCHITECTURE.md)
- [MCP Implementation](src/mcp/README.md)
- [Protocol Components](src/mcp/protocol/README.md)

## Project Structure

```
personal-brain/
├── src/                # Source code
│   ├── commands/       # Command processing
│   ├── db/             # Database setup and schema
│   ├── interfaces/     # User interfaces (CLI, Matrix)
│   ├── mcp/            # Model-Context-Protocol components
│   │   ├── contexts/   # Context providers (notes, profile, external)
│   │   ├── model/      # AI model integration
│   │   └── protocol/   # Protocol orchestration
│   ├── models/         # Data models
│   ├── services/       # Business logic services
│   └── utils/          # Utility functions
├── tests/              # Test suite
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

## License

MIT