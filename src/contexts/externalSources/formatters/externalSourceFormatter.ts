/**
 * ExternalSourceFormatter implementation of the FormatterInterface
 * 
 * Provides formatting capabilities for ExternalSourceResult objects
 * into text, markdown, or other formats.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type { FormatterInterface, FormattingOptions } from '@/contexts/formatterInterface';

import type { ExternalSourceResult } from '../sources';

/**
 * Formatting options specific to external source results
 */
export interface ExternalSourceFormattingOptions extends FormattingOptions {
  /**
   * Format to output the results in
   */
  format?: 'text' | 'markdown' | 'html' | 'json';
  
  /**
   * Include source metadata in the output
   */
  includeMetadata?: boolean;
  
  /**
   * Include URL in the output
   */
  includeUrl?: boolean;
  
  /**
   * Include timestamp in the output
   */
  includeTimestamp?: boolean;
}

/**
 * Formatter for ExternalSourceResult objects
 */
export class ExternalSourceFormatter implements FormatterInterface<ExternalSourceResult[], string> {
  // Logger removed as it's not being used
  
  /** Singleton instance */
  private static instance: ExternalSourceFormatter | null = null;
  
  /**
   * Get the singleton instance of ExternalSourceFormatter
   * @returns Shared instance of ExternalSourceFormatter
   */
  public static getInstance(): ExternalSourceFormatter {
    if (!ExternalSourceFormatter.instance) {
      ExternalSourceFormatter.instance = new ExternalSourceFormatter();
    }
    return ExternalSourceFormatter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    ExternalSourceFormatter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * @returns A new ExternalSourceFormatter instance
   */
  public static createFresh(): ExternalSourceFormatter {
    return new ExternalSourceFormatter();
  }
  
  /**
   * Format external source results
   * 
   * @param data Array of ExternalSourceResult objects to format
   * @param options Formatting options
   * @returns Formatted string representation of the results
   */
  format(data: ExternalSourceResult[], options: ExternalSourceFormattingOptions = {}): string {
    if (!data || data.length === 0) {
      return 'No external source results found.';
    }
    
    const format = options.format || 'markdown';
    
    switch (format) {
    case 'text':
      return this.formatAsText(data, options);
    case 'html':
      return this.formatAsHtml(data, options);
    case 'json':
      return this.formatAsJson(data);
    case 'markdown':
    default:
      return this.formatAsMarkdown(data, options);
    }
  }
  
  /**
   * Format results as plain text
   */
  private formatAsText(results: ExternalSourceResult[], options: ExternalSourceFormattingOptions): string {
    const formatted = results.map(result => {
      let output = `${result.title}\n${'-'.repeat(result.title.length)}\n\n`;
      output += `${result.content}\n\n`;
      
      if (options.includeMetadata !== false) {
        output += `Source: ${result.source} (${result.sourceType})\n`;
      }
      
      if (options.includeUrl !== false) {
        output += `URL: ${result.url}\n`;
      }
      
      if (options.includeTimestamp) {
        output += `Retrieved: ${result.timestamp.toLocaleString()}\n`;
      }
      
      return output;
    });
    
    return formatted.join('\n' + '='.repeat(40) + '\n\n');
  }
  
  /**
   * Format results as Markdown
   */
  private formatAsMarkdown(results: ExternalSourceResult[], options: ExternalSourceFormattingOptions): string {
    const formatted = results.map(result => {
      let output = `## ${result.title}\n\n`;
      output += `${result.content}\n\n`;
      
      if (options.includeMetadata !== false) {
        output += `**Source:** ${result.source} (${result.sourceType})\n\n`;
      }
      
      if (options.includeUrl !== false) {
        output += `**URL:** [${result.title}](${result.url})\n\n`;
      }
      
      if (options.includeTimestamp) {
        output += `**Retrieved:** ${result.timestamp.toLocaleString()}\n\n`;
      }
      
      return output;
    });
    
    return formatted.join('---\n\n');
  }
  
  /**
   * Format results as HTML
   */
  private formatAsHtml(results: ExternalSourceResult[], options: ExternalSourceFormattingOptions): string {
    const formatted = results.map(result => {
      let output = '<div class="external-result">\n';
      output += `  <h2>${this.escapeHtml(result.title)}</h2>\n`;
      output += `  <div class="content">${this.escapeHtml(result.content)}</div>\n`;
      
      if (options.includeMetadata !== false) {
        output += '  <div class="metadata">\n';
        output += `    <p><strong>Source:</strong> ${this.escapeHtml(result.source)} (${this.escapeHtml(result.sourceType)})</p>\n`;
        
        if (options.includeUrl !== false) {
          output += `    <p><strong>URL:</strong> <a href="${this.escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(result.title)}</a></p>\n`;
        }
        
        if (options.includeTimestamp) {
          output += `    <p><strong>Retrieved:</strong> ${result.timestamp.toLocaleString()}</p>\n`;
        }
        
        output += '  </div>\n';
      }
      
      output += '</div>';
      return output;
    });
    
    return formatted.join('\n<hr />\n');
  }
  
  /**
   * Format results as JSON
   */
  private formatAsJson(results: ExternalSourceResult[]): string {
    // Convert Date objects to ISO strings for proper JSON serialization
    const sanitizedResults = results.map(result => ({
      ...result,
      timestamp: result.timestamp.toISOString(),
      // Don't include embeddings in JSON output (they're large and not useful for display)
      embedding: undefined,
    }));
    
    return JSON.stringify(sanitizedResults, null, 2);
  }
  
  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Format a single external source result
   */
  formatSingleResult(result: ExternalSourceResult, options: ExternalSourceFormattingOptions = {}): string {
    return this.format([result], options);
  }
}