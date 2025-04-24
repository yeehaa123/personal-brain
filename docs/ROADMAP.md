# Personal Brain Development Roadmap

This document outlines the development plan for the Personal Brain project, focusing on enhancing personal knowledge management with AI conversations.

## Recently Completed

1. ✅ **BrainProtocol Refactoring**: Modularized the BrainProtocol into specialized components with clear responsibilities
2. ✅ **Tiered Memory System**: Implemented sophisticated conversation memory with three tiers for optimized token usage
3. ✅ **Conversation Summarization**: Added AI-powered summarization of older conversation turns
4. ✅ **Enhanced Context Management**: Improved context handling with automatic tier transitions
5. ✅ **Conversation to Notes Integration**: Implemented functionality to convert conversations to permanent notes
6. ✅ **Matrix Interface Improvements**: Enhanced the Matrix chat interface (ongoing)
7. ✅ **Claude Model Migration**: Migrated from direct Anthropic SDK to the more generic Vercel AI SDK

## Current Priorities

> **Note:** The current development focus is on the MVP implementation plan. For the most up-to-date status and detailed timeline, please refer to the [MVP Implementation Plan](/planning/mvp-implementation-plan.md).

1. **Protocol Response Simplification**: Simplify BrainProtocol output using model schema support
   - Delegate metadata generation to the Claude model using schemas
   - Create a standard response format for common queries
   - Add support for custom schemas for specialized use cases
   - Significantly reduce code complexity in the protocol layer
   - See detailed plan in [`planning/protocol-response-simplification.md`](/planning/protocol-response-simplification.md)

2. **Website Integration MVP**: 
   - Currently in Phase 1 of implementation
   - Website Context architecture implemented
   - Basic Astro integration complete
   - Working on Command Interface Integration
   - GitHub Pages deployment upcoming
   - See full details and current status in the [MVP Implementation Plan](/planning/mvp-implementation-plan.md)

3. **CLI Interface Improvements**: Separate logger output from CLI content
   - Create clear visual distinction between logs and actual content
   - Add option to control log visibility (hide/show/log level)
   - Implement consistent formatting across output types
   - Part of MVP Phase 2 (See [MVP Implementation Plan](/planning/mvp-implementation-plan.md))

4. **Conversation Schema Refactoring**: Remove direct access to conversation turns data
   - Eliminate direct access to conversation history data through Conversation object properties
   - Establish the TieredMemoryManager as the single source of truth for conversation history
   - Create a cleaner, more maintainable architecture with clear responsibilities
   - Prevent potential bugs from inconsistent access patterns
   - See detailed plan in [`planning/conversation-schema-refactoring.md`](/planning/conversation-schema-refactoring.md)

5. **Database-backed Memory Storage**: Implement persistent storage for conversation memory
   - Move from in-memory to database storage
   - Support archiving and retrieval of old conversations
   - Implement cross-conversation knowledge transfer

5. **Memory Usage Optimization**: Implement token counting for precise context management
   - Add token counting to replace turn counting for memory management
   - Optimize prompt formatting based on token usage
   - Add intelligent context selection based on relevance and token limits

6. **Matrix Interface Enhancements**: Continue improving the Matrix interface
   - Support Markdown rendering in Matrix
   - Add image embedding in responses
   - Improve formatting of citations and external sources
   - Create visually distinct bot messages
   - Implement Matrix "slack-like blocks" if viable
   - See detailed plan in [`planning/matrix-interface-improvements.md`](/planning/matrix-interface-improvements.md)

7. **Integration with PKM Tools**: Add support for other personal knowledge management tools
   - Implement import/export for tools like Obsidian or Logseq
   - Support standard markdown formats with frontmatter
   - Create bidirectional linking capabilities
   - See detailed plan in [`planning/import-export-capabilities.md`](/planning/import-export-capabilities.md)

8. **Knowledge Navigation Enhancements**: Improve discovery and browsing experience
   - Implement advanced search with filters for tags and content types
   - Improve preview formatting for search results
   - Add "Related notes" suggestions when viewing content
   - Create multiple navigation paths (tags, similarity, timeline)
   - See detailed plan in [`planning/knowledge-navigation-enhancements.md`](/planning/knowledge-navigation-enhancements.md)

## Post-MVP Priorities

1. **CLI Interface Improvements**: Separate logger output from CLI content
   - Create clear visual distinction between logs and actual content
   - Add option to control log visibility (hide/show/log level)
   - Implement consistent formatting across output types
   - See detailed plan in [`planning/cli-logger-separation.md`](/planning/cli-logger-separation.md)
   
2. **Vercel AI SDK MCP Integration**: Integrate our MCP implementation with Vercel AI SDK
   - Evaluate phased integration vs. complete migration approaches
   - Standardize AI model interactions using Vercel's implementation
   - Future-proof our architecture as Vercel's MCP support matures
   - See detailed plan in [`planning/vercel-ai-sdk-mcp-integration.md`](/planning/vercel-ai-sdk-mcp-integration.md)

## Future Development

### Website Integration (Phases 2-4)

1. **Blog Publishing System**: Implement blog capabilities (moved from MVP to post-MVP)
   - Create note-to-blog-post conversion pipeline
   - Implement Markdown processing with full feature support
   - Set up URL structure and permalinks
   - Create template for blog post pages
   - See full roadmap in [`planning/website-integration-roadmap.md`](/planning/website-integration-roadmap.md)

2. **Series and Content Organization**: Add series functionality for related content
   - Design series data model as an Astro content collection
   - Create UI for series pages
   - Implement navigation between series posts
   - Add series overview page

3. **Website Deployment and SEO**: Add professional publishing capabilities
   - Implement deployment adapters for common platforms
   - Create self-hosted deployment option
   - Set up CI/CD pipeline for automated builds
   - Add advanced SEO features (structured data, sitemaps, etc.)

4. **Content Scheduling and Analytics**: Complete the publishing workflow
   - Add content scheduling system
   - Integrate with privacy-focused analytics
   - Implement social media sharing capabilities

### Knowledge Visualization

1. **Knowledge Graph Visualization**: Create visualizations of connections between notes and concepts
   - Implement relationship tracking between notes
   - Create a simple graph visualization component
   - Support filtering and exploration of the knowledge graph

2. **Cross-reference Discovery**: Automatically identify and suggest connections between related notes
   - Implement semantic similarity detection between notes
   - Add suggestion system for related notes during note creation
   - Support manual confirmation of suggested connections

3. **Semantic Navigation**: Navigate between related concepts and notes using semantic similarity
   - Create concept nodes from notes and conversations
   - Implement semantic-based navigation commands
   - Support "similar to this" and "related to" queries

### Content Enhancements

1. **Advanced External Sources**: Integrate additional knowledge sources beyond Wikipedia and News API
   - Add support for research papers and preprints
   - Integrate with specialized knowledge bases
   - Implement better source filtering and relevance detection

2. **Multimodal Support**: Add ability to store and reference non-text content
   - Implement image storage in the database
   - Add image references in note content
   - Support basic image viewing in the CLI and Matrix interfaces
   - Add PDF and audio file support

3. **Data Management Features**: Add capabilities for data maintenance
   - Implement data export functionality
   - Add backup and restore capabilities
   - Create data migration tools

### Long-term Vision

1. **Personal Knowledge Assistant**: Proactively suggest relevant notes based on context
   - Monitor active work context
   - Implement anticipatory suggestions
   - Support contextual awareness across sessions

2. **Timeline Views**: Visualize the evolution of knowledge and concepts over time
   - Track concept development over time
   - Create timeline visualization of note creation and updates
   - Support versioning of knowledge

This roadmap will evolve as development progresses and new priorities emerge. The focus remains on creating a cohesive experience between conversations and notes, optimizing memory usage, and enhancing the overall knowledge management capabilities.