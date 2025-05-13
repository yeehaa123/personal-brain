# Import/Export Capabilities Plan

## Overview

This document outlines a plan to enhance the Personal Brain system with robust import and export capabilities. These features will enable seamless integration with popular PKM (Personal Knowledge Management) tools, support standardized data formats, and facilitate data portability.

## Current Limitations

1. **Limited Import Sources**: Currently only supports basic imports from a few sources
2. **No Standardized Markdown Support**: Lacks support for common markdown frontmatter formats
3. **Missing Batch Operations**: No way to import or export collections of notes at once
4. **No Bidirectional Links**: Cannot properly import/export bidirectional links
5. **Format Incompatibilities**: Different PKM tools use varying conventions and metadata

## Goals

1. **Standard Markdown Support**: Implement support for markdown files with frontmatter
2. **PKM Tool Integration**: Add direct import/export with tools like Obsidian and Logseq
3. **Batch Operations**: Enable importing and exporting collections of notes
4. **Bidirectional Linking**: Support importing and exporting bidirectional links
5. **Format Conversion**: Convert between different PKM tool formats

## Implementation Plan

### 1. Standard Markdown Support

Implement comprehensive support for markdown files with frontmatter:

1. **Frontmatter Parser**:
   ```typescript
   type FrontmatterFormat = 'yaml' | 'toml' | 'json';
   
   interface FrontmatterOptions {
     format?: FrontmatterFormat;
     delimiters?: {
       open: string;
       close: string;
     };
     strict?: boolean;
   }
   
   class FrontmatterParser {
     parse(content: string, options?: FrontmatterOptions): {
       frontmatter: Record<string, any>;
       content: string;
     } {
       // Parse frontmatter based on format and delimiters
     }
     
     stringify(
       content: string,
       frontmatter: Record<string, any>,
       options?: FrontmatterOptions
     ): string {
       // Serialize frontmatter and combine with content
     }
   }
   ```

2. **Markdown Schema Mapping**:
   - Create a mapping system between frontmatter fields and note properties
   - Support common schemas used by popular PKM tools
   - Implement validation for required and optional fields

3. **Customizable Field Mappings**:
   - Allow users to define custom mappings between fields
   - Create presets for common PKM tools
   - Handle field transformation and normalization

4. **Markdown Format Preservation**:
   - Maintain original markdown formatting during import/export
   - Preserve custom syntax elements when possible
   - Handle tool-specific extensions gracefully

### 2. PKM Tool Integration

Add direct import/export capabilities for popular PKM tools:

1. **Tool-Specific Adapters**:
   ```typescript
   interface PkmToolAdapter {
     name: string;
     importNote(source: string): Note;
     exportNote(note: Note): string;
     importVault(sourcePath: string): Note[];
     exportVault(notes: Note[], targetPath: string): void;
     supportsFormat(content: string): boolean;
   }
   
   class ObsidianAdapter implements PkmToolAdapter {
     name = 'Obsidian';
     
     importNote(source: string): Note {
       // Convert Obsidian markdown to Note
     }
     
     exportNote(note: Note): string {
       // Convert Note to Obsidian markdown
     }
     
     importVault(sourcePath: string): Note[] {
       // Import entire Obsidian vault
     }
     
     exportVault(notes: Note[], targetPath: string): void {
       // Export notes as Obsidian vault
     }
     
     supportsFormat(content: string): boolean {
       // Check if content looks like Obsidian format
     }
   }
   
   // Similar adapters for Logseq, Roam, etc.
   ```

2. **Vault Structure Handling**:
   - Create tools to analyze and recreate vault structures
   - Support folder hierarchies and organization schemes
   - Handle attachments and media files

3. **Tool Detection**:
   - Automatically detect source PKM tool formats
   - Suggest appropriate adapter based on content analysis
   - Provide format conversion recommendations

4. **Tool-Specific Extensions**:
   - Support Obsidian canvas files
   - Handle Logseq's page properties
   - Process Roam's block references

### 3. Batch Operations

Enable importing and exporting collections of notes:

1. **Batch Processor**:
   ```typescript
   interface BatchOptions {
     concurrency: number;
     onProgress?: (completed: number, total: number) => void;
     continueOnError?: boolean;
     errorHandler?: (error: Error, item: any) => void;
     transformations?: Array<(item: any) => any>;
   }
   
   class BatchProcessor {
     async processBatch<T, R>(
       items: T[],
       processor: (item: T) => Promise<R>,
       options?: BatchOptions
     ): Promise<R[]> {
       // Process items in batches with progress reporting
     }
   }
   ```

2. **Directory Scanner**:
   - Recursively scan directories for importable files
   - Filter files based on extensions and patterns
   - Create file maps for bulk processing

3. **Validation and Error Handling**:
   - Validate imported notes before committing to database
   - Provide detailed error reports for failed imports
   - Implement recovery and retry mechanisms

4. **Progress Tracking**:
   - Show progress indicators for long-running operations
   - Provide estimated completion times
   - Allow cancellation of batch operations

### 4. Bidirectional Linking

Support for importing and exporting bidirectional links:

1. **Link Parser and Analyzer**:
   ```typescript
   interface Link {
     source: string; // Note ID or path
     target: string; // Note ID or path
     anchor?: string; // Optional anchor text
     type: 'explicit' | 'implicit' | 'backlink';
     context?: string; // Surrounding text
   }
   
   class LinkAnalyzer {
     extractLinks(content: string, noteId: string): Link[] {
       // Extract all links from content
     }
     
     resolveLinks(links: Link[], noteMap: Map<string, Note>): Link[] {
       // Resolve link targets to actual note IDs
     }
     
     generateBacklinks(links: Link[]): Link[] {
       // Generate reverse links for all forward links
     }
   }
   ```

2. **Link Format Conversion**:
   - Convert between different link formats ([[wiki-links]], [markdown](links), etc.)
   - Preserve anchors and display text
   - Handle special link types (embeds, transclusions)

3. **Graph Reconstruction**:
   - Rebuild note graphs during import
   - Maintain link integrity across imports
   - Detect and resolve circular references

4. **Conflict Resolution**:
   - Detect link conflicts during import
   - Provide options for resolving conflicts
   - Preserve backlink context where possible

### 5. Format Conversion

Convert between different PKM tool formats:

1. **Format Converter**:
   ```typescript
   interface ConversionOptions {
     sourceFormat: string;
     targetFormat: string;
     preserveStructure?: boolean;
     handleAttachments?: boolean;
     linkStyle?: 'wiki' | 'markdown' | 'html';
   }
   
   class FormatConverter {
     private adapters: Map<string, PkmToolAdapter>;
     
     constructor(adapters: PkmToolAdapter[]) {
       this.adapters = new Map();
       for (const adapter of adapters) {
         this.adapters.set(adapter.name.toLowerCase(), adapter);
       }
     }
     
     async convertNote(note: Note, options: ConversionOptions): Promise<string> {
       // Convert note between formats
       const sourceAdapter = this.adapters.get(options.sourceFormat.toLowerCase());
       const targetAdapter = this.adapters.get(options.targetFormat.toLowerCase());
       
       if (!sourceAdapter || !targetAdapter) {
         throw new Error(`Unsupported format conversion: ${options.sourceFormat} -> ${options.targetFormat}`);
       }
       
       // Convert using adapters
       const intermediate = sourceAdapter.exportNote(note);
       return targetAdapter.importNote(intermediate);
     }
     
     async convertVault(
       sourcePath: string,
       targetPath: string,
       options: ConversionOptions
     ): Promise<void> {
       // Convert entire vault between formats
     }
   }
   ```

2. **Syntax Transformation**:
   - Convert between different markdown dialects
   - Transform tool-specific syntax extensions
   - Preserve formatting and structure where possible

3. **Metadata Normalization**:
   - Standardize metadata fields across formats
   - Create common field mappings for frequently used fields
   - Handle custom fields with user-defined mappings

4. **Attachment Handling**:
   - Relocate and relink attachments during conversion
   - Convert between attachment storage schemes
   - Update links to point to new attachment locations

## Testing Strategy

1. **Format Compatibility Tests**:
   - Test importing from and exporting to various PKM tools
   - Verify correct handling of tool-specific features
   - Ensure round-trip conversion preserves content and metadata

2. **Performance Testing**:
   - Test with large collections of notes (1000+ notes)
   - Measure import/export times and resource usage
   - Optimize batch processing for performance

3. **Edge Case Testing**:
   - Test with malformed or non-standard markdown
   - Verify handling of unusual link structures
   - Test with mixed content types and attachments

4. **User Workflow Testing**:
   - Simulate common import/export scenarios
   - Test migration between different PKM tools
   - Verify that typical user workflows are supported

## Implementation Phases

### Phase 1: Standard Markdown Support

- Implement frontmatter parser
- Create schema mappings for common formats
- Add support for customizable field mappings
- Ensure markdown format preservation

### Phase 2: Basic PKM Tool Integration

- Implement Obsidian adapter
- Add Logseq adapter
- Create basic tool detection
- Add support for common tool-specific extensions

### Phase 3: Batch Operations

- Build batch processor
- Implement directory scanner
- Add validation and error handling
- Create progress tracking system

### Phase 4: Bidirectional Linking

- Develop link parser and analyzer
- Implement link format conversion
- Add graph reconstruction capabilities
- Create conflict resolution system

### Phase 5: Format Conversion and Additional Tools

- Build format converter
- Implement syntax transformation
- Add metadata normalization
- Create attachment handling system
- Add support for additional PKM tools

## Success Criteria

1. Users can seamlessly import from and export to Obsidian and Logseq
2. Standard markdown files with frontmatter are fully supported
3. Collections of notes can be imported and exported efficiently
4. Bidirectional links are properly preserved during import/export
5. Format conversion produces high-fidelity results
6. User feedback indicates the import/export process is intuitive and reliable