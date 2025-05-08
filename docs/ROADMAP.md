# Personal Brain Development Roadmap

This document outlines the development plan for the Personal Brain project, focusing on enhancing personal knowledge management with AI conversations and website generation.

## Recently Completed

1. ✅ **BrainProtocol Architecture**: Modularized and implemented Component Interface Standardization pattern
2. ✅ **Tiered Memory System**: Implemented sophisticated conversation memory with three tiers for optimized token usage
3. ✅ **Protocol Response Simplification**: Simplified BrainProtocol output using Claude's schema capabilities
4. ✅ **Website Context Architecture**: Implemented WebsiteContext with Component Interface Standardization pattern
5. ✅ **Astro Integration**: Set up Astro project with content collections for website generation
6. ✅ **Landing Page Generation**: Implemented landing page generation from profile data
7. ✅ **Deployment Architecture**: Implemented Caddy-based deployment for flexible hosting
8. ✅ **MCP Architecture Refactoring**: Completed standardization of component interfaces and messaging
9. ✅ **Landing Page Refinements**: Added section-level quality assessment, improved content generation

## Current Priorities

> **Note:** The current development focus is on the MVP implementation plan. For the most up-to-date status and detailed timeline, please refer to the [MVP Implementation Plan](/planning/mvp-implementation-plan.md).

1. **Website Identity Service**: Create a dedicated service for managing website identity information
   - Implement WebsiteIdentityService following Component Interface Standardization pattern
   - Create WebsiteIdentityNoteAdapter for persistent storage
   - Separate factual profile data from generated creative content
   - Integrate with landing page generation and website context
   - See detailed plan in [`planning/website-identity-service.md`](/planning/website-identity-service.md)

2. **Landing Page Customization**: Enhance landing page with additional customization options
   - Add preview capability in CLI and Matrix interfaces
   - Improve responsive design for mobile compatibility
   - Add export options for different formats
   - Complete final integration testing

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

6. **Matrix Interface Enhancements**: Continue improving the Matrix interface
   - Support Markdown rendering in Matrix
   - Add image embedding in responses
   - Improve formatting of citations and external sources
   - Create visually distinct bot messages
   - Implement Matrix "slack-like blocks" if viable
   - See detailed plan in [`planning/matrix-interface-improvements.md`](/planning/matrix-interface-improvements.md)

## Post-MVP Priorities

1. **Blog Publishing System**: Implement blog capabilities
   - Create note-to-blog-post conversion pipeline
   - Implement Markdown processing with full feature support
   - Set up URL structure and permalinks
   - Create template for blog post pages
   - See full roadmap in [`planning/website-integration-roadmap.md`](/planning/website-integration-roadmap.md)

2. **Vercel AI SDK MCP Integration**: Integrate our MCP implementation with Vercel AI SDK
   - Evaluate phased integration vs. complete migration approaches
   - Standardize AI model interactions using Vercel's implementation
   - Future-proof our architecture as Vercel's MCP support matures
   - See detailed plan in [`planning/vercel-ai-sdk-mcp-integration.md`](/planning/vercel-ai-sdk-mcp-integration.md)

3. **Integration with PKM Tools**: Add support for other personal knowledge management tools
   - Implement import/export for tools like Obsidian or Logseq
   - Support standard markdown formats with frontmatter
   - Create bidirectional linking capabilities
   - See detailed plan in [`planning/import-export-capabilities.md`](/planning/import-export-capabilities.md)

4. **Knowledge Navigation Enhancements**: Improve discovery and browsing experience
   - Implement advanced search with filters for tags and content types
   - Improve preview formatting for search results
   - Add "Related notes" suggestions when viewing content
   - Create multiple navigation paths (tags, similarity, timeline)
   - See detailed plan in [`planning/knowledge-navigation-enhancements.md`](/planning/knowledge-navigation-enhancements.md)

## Future Development

### Website Integration (Post-MVP Phases)

1. **Series and Content Organization**: Add series functionality for related content
   - Design series data model as an Astro content collection
   - Create UI for series pages
   - Implement navigation between series posts
   - Add series overview page

2. **Website Deployment and SEO**: Add professional publishing capabilities
   - Implement deployment adapters for other platforms
   - Create additional self-hosted deployment options
   - Set up CI/CD pipeline for automated builds
   - Add advanced SEO features (structured data, sitemaps, etc.)

3. **Content Scheduling and Analytics**: Complete the publishing workflow
   - Add content scheduling system
   - Integrate with privacy-focused analytics
   - Implement social media sharing capabilities

### Knowledge Enhancement

1. **Knowledge Graph Visualization**: Create visualizations of connections between notes and concepts
   - Implement relationship tracking between notes
   - Create a simple graph visualization component
   - Support filtering and exploration of the knowledge graph

2. **Cross-reference Discovery**: Automatically identify and suggest connections between related notes
   - Implement semantic similarity detection between notes
   - Add suggestion system for related notes during note creation
   - Support manual confirmation of suggested connections

3. **Advanced External Sources**: Integrate additional knowledge sources beyond Wikipedia and News API
   - Add support for research papers and preprints
   - Integrate with specialized knowledge bases
   - Implement better source filtering and relevance detection

4. **Multimodal Support**: Add ability to store and reference non-text content
   - Implement image storage in the database
   - Add image references in note content
   - Support basic image viewing in the CLI and Matrix interfaces
   - Add PDF and audio file support

This roadmap will evolve as development progresses and new priorities emerge. The immediate focus is on completing the MVP with the Website Identity Service to ensure a cohesive and high-quality landing page generation experience.