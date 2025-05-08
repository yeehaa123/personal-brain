# Landing Page Section Error Recovery Plan

## Overview

This document outlines the implementation plan for adding robust error recovery to the landing page generation process. The goal is to ensure that when individual sections fail to generate, the entire process doesn't fail, and users can still get a functional landing page with placeholders for failed sections.

## Current Implementation

Currently, landing page generation happens as a sequential process:

1. The process starts by retrieving website identity information
2. It generates each section (hero, services, process, etc.) in sequence 
3. Progress updates are sent to the UI via the progress tracker
4. If any section generation fails, the entire process may fail or produce incomplete results

The main challenges with the current approach:

- A failure in one section can cause the entire generation process to fail
- There's no retry mechanism for failed sections
- Users can't easily identify which sections failed and why
- Failed sections can't be individually regenerated without restarting the whole process
- The progress tracking doesn't handle errors gracefully at the section level

## Proposed Solution

Implement a resilient section generation approach with these key features:

1. **Section-level Error Handling**: Catch errors during individual section generation
2. **Error Documentation**: Record and report which sections failed and why
3. **Graceful Degradation**: Provide fallback/placeholder content for failed sections
4. **Individual Regeneration**: Allow regenerating just the failed sections
5. **Status Tracking**: Enhance progress tracking to show section generation status

## Implementation Details

### 1. Section Status Tracking

Create a new type to track section status:

```typescript
export enum SectionGenerationStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Retrying = 'retrying',
}

export interface SectionGenerationResult<T> {
  status: SectionGenerationStatus;
  data?: T;
  error?: string;
  retryCount?: number;
  duration?: number; // Time taken to generate in ms
}

export type LandingPageGenerationStatus = Record<string, SectionGenerationResult<unknown>>;
```

### 2. Enhanced LandingPageGenerationService

Update the `LandingPageGenerationService` to handle section-level errors:

```typescript
async generateLandingPageData(
  identity?: WebsiteIdentityData | null,
  onProgress?: (step: string, index: number) => void,
  options?: {
    maxRetries?: number;
    continueOnError?: boolean;
  }
): Promise<{
  landingPage: LandingPageData;
  generationStatus: LandingPageGenerationStatus;
}> {
  const maxRetries = options?.maxRetries ?? 1;
  const continueOnError = options?.continueOnError ?? true;
  const generationStatus: LandingPageGenerationStatus = {};

  // Initialize with basic structure
  const landingPage = this.initializeLandingPage(identity);

  // Generate each section with error handling
  for (const [index, sectionName] of landingPage.sectionOrder.entries()) {
    if (onProgress) {
      onProgress(`Generating ${sectionName} section`, index);
    }

    generationStatus[sectionName] = {
      status: SectionGenerationStatus.InProgress,
      retryCount: 0,
    };

    try {
      const startTime = Date.now();
      const sectionData = await this.generateSection(sectionName, identity, landingPage);
      const endTime = Date.now();
      
      // Update with section data
      landingPage[sectionName] = sectionData;
      
      generationStatus[sectionName] = {
        status: SectionGenerationStatus.Completed,
        data: sectionData,
        duration: endTime - startTime,
      };
    } catch (error) {
      this.logger.error(`Error generating ${sectionName} section`, { error });
      
      // Try to retry the section generation
      let retried = false;
      
      if (maxRetries > 0) {
        generationStatus[sectionName] = {
          status: SectionGenerationStatus.Retrying,
          error: error instanceof Error ? error.message : String(error),
          retryCount: 1,
        };
        
        try {
          this.logger.info(`Retrying ${sectionName} section generation`);
          const startTime = Date.now();
          const sectionData = await this.generateSection(sectionName, identity, landingPage, { 
            isRetry: true,
            simplifyPrompt: true,
          });
          const endTime = Date.now();
          
          // Update with retry data
          landingPage[sectionName] = sectionData;
          
          generationStatus[sectionName] = {
            status: SectionGenerationStatus.Completed,
            data: sectionData,
            retryCount: 1,
            duration: endTime - startTime,
          };
          
          retried = true;
        } catch (retryError) {
          this.logger.error(`Retry failed for ${sectionName} section`, { error: retryError });
          // Continue with error handling
        }
      }
      
      if (!retried) {
        // If retry failed or not attempted, mark as failed
        generationStatus[sectionName] = {
          status: SectionGenerationStatus.Failed,
          error: error instanceof Error ? error.message : String(error),
          retryCount: generationStatus[sectionName].retryCount,
        };
        
        // Apply fallback content
        landingPage[sectionName] = this.getFallbackContent(sectionName);
        
        // If not configured to continue on error, throw
        if (!continueOnError) {
          throw new Error(`Failed to generate ${sectionName} section: ${error}`);
        }
      }
    }
  }

  return { landingPage, generationStatus };
}
```

### 3. Fallback Content Generator

Create a method to provide fallback content for failed sections:

```typescript
private getFallbackContent(sectionName: string): unknown {
  // Common fallback structure
  const fallback = {
    title: `${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`,
    enabled: false, // Disable failed sections by default
  };

  // Section-specific fallback structure
  switch (sectionName) {
    case 'hero':
      return {
        ...fallback,
        headline: 'Welcome to Our Website',
        subheading: 'This section is currently being updated',
        ctaText: 'Learn More',
        ctaLink: '#about',
      };
    case 'services':
      return {
        ...fallback,
        items: [
          { 
            title: 'Service Example', 
            description: 'This is a placeholder for service content' 
          }
        ],
      };
    // ... add other section fallbacks
    default:
      return fallback;
  }
}
```

### 4. WebsiteContext Interface Updates

Update the WebsiteContext to expose error status to the UI:

```typescript
async generateLandingPage(
  options?: {
    useIdentity?: boolean;
    regenerateIdentity?: boolean;
    onProgress?: (step: string, index: number) => void;
    maxRetries?: number;
    continueOnError?: boolean;
  },
): Promise<{
  success: boolean;
  message: string;
  data?: LandingPageData;
  generationStatus?: LandingPageGenerationStatus;
}> {
  // Implementation remains similar, but now returns generationStatus
  try {
    // ...existing implementation...
    
    // Generate landing page data with status tracking
    const { landingPage: landingPageData, generationStatus } = 
      await landingPageService.generateLandingPageData(identity, onProgress, {
        maxRetries: options?.maxRetries,
        continueOnError: options?.continueOnError,
      });
    
    // Save to storage and Astro content
    // ...existing implementation...
    
    // Calculate success based on section statuses
    const hasFailedSections = Object.values(generationStatus).some(
      status => status.status === SectionGenerationStatus.Failed
    );
    
    // Return with detailed status
    return {
      success: true, // We still consider this a success if we got a usable page
      message: hasFailedSections 
        ? 'Generated landing page with some errors. Check section status for details.'
        : 'Successfully generated landing page content',
      data: landingPageData,
      generationStatus,
    };
  } catch (error) {
    // ...existing error handling...
  }
}
```

### 5. UI Enhancements

#### CLI Display Enhancement

Update the CLI renderer to show section generation status:

```typescript
// In cli-renderer.ts
case 'landing-page': {
  this.cli.displayTitle('Landing Page Generation');
  
  if (result.success) {
    this.cli.success(result.message);
    
    // Display detailed generation status if available
    if (result.generationStatus) {
      this.cli.displaySubtitle('Section Generation Status');
      
      const statusFormat = (status: SectionGenerationStatus) => {
        switch(status) {
          case 'completed': return this.cli.styles.success('✓ Completed');
          case 'failed': return this.cli.styles.error('✗ Failed');
          case 'in_progress': return this.cli.styles.highlight('⟳ In Progress');
          case 'pending': return this.cli.styles.dim('○ Pending');
          case 'retrying': return this.cli.styles.warn('⟳ Retrying');
        }
      };
      
      Object.entries(result.generationStatus).forEach(([section, status]) => {
        const statusText = statusFormat(status.status);
        const duration = status.duration ? ` (${Math.round(status.duration/100)/10}s)` : '';
        const errorMsg = status.error ? `\n    ${this.cli.styles.error(status.error)}` : '';
        
        this.cli.print(`${section}: ${statusText}${duration}${errorMsg}`);
      });
    }
    
    // ... rest of landing page display
  } else {
    this.cli.error(result.message);
  }
  break;
}
```

#### Matrix Renderer Enhancement

Similarly, enhance the Matrix renderer to display section status:

```typescript
// In matrix-renderer.ts or matrix formatters
formatLandingPage(result) {
  let content = `### Landing Page Generation\n\n`;
  
  if (result.success) {
    content += `✅ ${result.message}\n\n`;
    
    // Add section status if available
    if (result.generationStatus) {
      content += `#### Section Generation Status\n\n`;
      
      Object.entries(result.generationStatus).forEach(([section, status]) => {
        const statusEmoji = {
          'completed': '✅',
          'failed': '❌',
          'in_progress': '⏳',
          'pending': '⏱️',
          'retrying': '🔄'
        }[status.status] || '❓';
        
        const duration = status.duration ? ` (${Math.round(status.duration/100)/10}s)` : '';
        const errorMsg = status.error ? `\n  - Error: ${status.error}` : '';
        
        content += `- **${section}**: ${statusEmoji} ${status.status}${duration}${errorMsg}\n`;
      });
      
      content += '\n';
    }
    
    // ... rest of formatting
  } else {
    content += `❌ ${result.message}\n`;
  }
  
  return content;
}
```

### 6. Command Handler and Types Updates

Update the command types and handlers to support the generationStatus field:

```typescript
// In commandTypes.ts
export type WebsiteCommandResult =
  // ...other result types...
  | { 
      type: 'landing-page'; 
      success?: boolean; 
      message?: string; 
      data?: LandingPageData; 
      action?: 'generate' | 'edit' | 'assess' | 'apply' | 'view'; 
      assessments?: Record<string, AssessedSection<unknown>>;
      generationStatus?: LandingPageGenerationStatus; 
    }
  // ...other result types...
```

### 7. Section Regeneration Command

Add a new command to regenerate specific failed sections:

```typescript
// In websiteCommands.ts
private async handleLandingPageRegenerate(args: string): Promise<CommandResult> {
  try {
    if (!this.websiteContext) {
      return {
        type: 'landing-page',
        success: false,
        message: 'Website context not available',
      };
    }
    
    // Parse section name from args
    const sectionName = args.trim();
    
    if (!sectionName) {
      return {
        type: 'error',
        message: 'Please specify a section name to regenerate',
      };
    }
    
    // Get existing landing page data
    const currentLandingPage = await this.websiteContext.getLandingPageData();
    
    if (!currentLandingPage) {
      return {
        type: 'error',
        message: 'No landing page data found. Generate a landing page first.',
      };
    }
    
    // Check if the section exists
    if (!currentLandingPage.sectionOrder.includes(sectionName)) {
      return {
        type: 'error',
        message: `Section "${sectionName}" not found. Available sections: ${currentLandingPage.sectionOrder.join(', ')}`,
      };
    }
    
    // Get CLI interface for status updates with spinner
    const cli = CLIInterface.getInstance();
    cli.startSpinner(`Regenerating ${sectionName} section...`);
    
    // Call the regenerate method
    const result = await this.websiteContext.regenerateLandingPageSection(sectionName);
    
    // Stop the spinner with appropriate status
    if (result.success) {
      cli.stopSpinner('success', `Successfully regenerated ${sectionName} section`);
    } else {
      cli.stopSpinner('error', `Failed to regenerate ${sectionName} section`);
    }
    
    return {
      type: 'landing-page',
      success: result.success,
      message: result.message,
      data: result.data,
      action: 'regenerate',
    };
  } catch (error) {
    // Error handling
    // ...
  }
}
```

Add a new method to the WebsiteContext:

```typescript
async regenerateLandingPageSection(
  sectionName: string,
): Promise<{
  success: boolean;
  message: string;
  data?: LandingPageData;
}> {
  try {
    // Get current landing page data
    const currentLandingPage = await this.getLandingPageData();
    
    if (!currentLandingPage) {
      return {
        success: false,
        message: 'No landing page data found. Generate a landing page first.',
      };
    }
    
    // Check if section exists
    if (!currentLandingPage.sectionOrder.includes(sectionName)) {
      return {
        success: false,
        message: `Section "${sectionName}" not found.`,
      };
    }
    
    // Get identity data
    const identity = await this.getIdentity(false);
    
    // Get landing page service
    const landingPageService = this.getLandingPageGenerationService();
    
    this.logger.info(`Regenerating landing page section: ${sectionName}`);
    
    // Generate just the specified section
    try {
      const newSectionData = await landingPageService.generateSection(
        sectionName, 
        identity, 
        currentLandingPage
      );
      
      // Update the section in the landing page data
      currentLandingPage[sectionName] = newSectionData;
      
      // Enable the section if it was disabled
      if (newSectionData && 'enabled' in newSectionData) {
        newSectionData.enabled = true;
      }
      
      // Save updated landing page data
      await this.saveLandingPageData(currentLandingPage);
      
      // Update Astro content
      const astroService = await this.getAstroContentService();
      const writeSuccess = await astroService.writeLandingPageContent(currentLandingPage);
      
      if (!writeSuccess) {
        throw new Error('Failed to write updated content to Astro files');
      }
      
      return {
        success: true,
        message: `Successfully regenerated ${sectionName} section`,
        data: currentLandingPage,
      };
    } catch (error) {
      this.logger.error(`Error regenerating section ${sectionName}`, { error });
      
      return {
        success: false,
        message: `Failed to regenerate ${sectionName}: ${error instanceof Error ? error.message : String(error)}`,
        data: currentLandingPage,
      };
    }
  } catch (error) {
    return this.handleError(error, `regenerating section ${sectionName}`);
  }
}
```

## Implementation Plan

### Phase 1: Core Error Handling Architecture

1. Create SectionGenerationStatus and related types in a new file (`src/contexts/website/types/landingPageTypes.ts`)
2. Modify the LandingPageGenerationService to track section status
3. Implement the fallback content generator
4. Update WebsiteContext to handle and propagate section generation status
5. Update command types to include generationStatus

### Phase 2: UI Integration

1. Update CLI renderer to display section generation status
2. Update Matrix renderer to display section generation status
3. Add colored status indicators to make failures more visible

### Phase 3: Regeneration Feature

1. Implement sectionRegenerate command in the website command handler
2. Implement regenerateLandingPageSection method in WebsiteContext
3. Create/update necessary tests

### Phase 4: Testing and Documentation

1. Add new tests specifically for error recovery scenarios
2. Update existing tests to include error cases
3. Document the new error handling architecture
4. Update user documentation to explain the section regeneration feature

## Benefits

1. **Robustness**: Landing page generation will be more resilient to individual section failures
2. **Visibility**: Users will have clear insight into which sections failed and why
3. **Recovery**: Failed sections can be regenerated without starting over
4. **Efficiency**: Time saved by not having to regenerate the entire landing page
5. **User Experience**: Improved feedback through detailed section status reporting

## Known Limitations and Future Enhancements

1. **Partial Content Retry**: Currently, we retry the entire section on failure. In the future, we could retry just the specific part of the section that failed.
2. **Smart Retries**: Implement exponential backoff and better error categorization to determine if retries are likely to succeed.
3. **Progress Restoration**: Allow saving generation progress to restore across sessions.
4. **Batch Regeneration**: Add ability to regenerate multiple failed sections at once.
5. **Human Review/Edit**: Enable human review workflow for failed sections to manually improve them.