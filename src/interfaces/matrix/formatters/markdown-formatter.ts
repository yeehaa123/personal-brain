/**
 * Enhanced markdown formatter for Matrix messages
 * 
 * Provides richer formatting options for Matrix messages, including:
 * - Better markdown rendering
 * - Visual distinctions for bot messages
 * - Custom styling for different content types
 */

import { marked } from 'marked';

import { sanitizeHtml } from '@/utils/textUtils';

// Define formatter options
export interface MarkdownFormatterOptions {
  imageRendering?: boolean;
  applyBotStyling?: boolean;
  enableCustomStyles?: boolean;
}

// Default options
const DEFAULT_OPTIONS: MarkdownFormatterOptions = {
  imageRendering: true,
  applyBotStyling: true,
  enableCustomStyles: true,
};

/**
 * Matrix Markdown Formatter
 * 
 * Provides enhanced markdown formatting for Matrix messages
 */
export class MatrixMarkdownFormatter {
  private options: MarkdownFormatterOptions;
  private marked: typeof marked;

  constructor(options: Partial<MarkdownFormatterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Configure marked with default options
    this.marked = marked;
    
    // Set up standard marked options for code blocks
    this.marked.setOptions({
      gfm: true,        // GitHub Flavored Markdown
      breaks: true,     // Render line breaks as <br>
      pedantic: false,  // Conform to markdown.pl
      // Note: smartLists and smartypants options are not available in current marked type definition
    });
  }

  /**
   * Format markdown text to HTML with enhancements
   * 
   * @param markdown The markdown text to format
   * @returns Formatted HTML ready for Matrix display
   */
  format(markdown: string): string {
    // Convert markdown to HTML
    const markdownResult = this.marked.parse(markdown);
    let html = typeof markdownResult === 'string' 
      ? markdownResult 
      : markdownResult.toString();
    
    // Apply custom styling if enabled
    if (this.options.enableCustomStyles) {
      html = this.applyCustomStyles(html);
    }
    
    // Apply bot styling if enabled
    if (this.options.applyBotStyling) {
      html = this.applyBotStyling(html);
    }
    
    // Sanitize the HTML to prevent XSS
    return sanitizeHtml(html);
  }

  /**
   * Apply custom styles to the HTML
   * 
   * @param html HTML content
   * @returns Styled HTML
   */
  private applyCustomStyles(html: string): string {
    // Add custom CSS styles
    return `
      <style>
        .brain-message {
          border-left: 4px solid #2196F3;
          padding: 8px 12px;
          background-color: rgba(33, 150, 243, 0.05);
          margin: 8px 0;
        }
        .brain-message pre {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
        }
        .brain-message code {
          font-family: monospace;
          background-color: rgba(0, 0, 0, 0.05);
          padding: 2px 4px;
          border-radius: 3px;
        }
        .brain-message blockquote {
          border-left: 3px solid #9e9e9e;
          margin-left: 0;
          padding-left: 12px;
          color: #616161;
        }
        .brain-message img {
          max-width: 100%;
          height: auto;
        }
        .brain-message table {
          border-collapse: collapse;
          width: 100%;
        }
        .brain-message th, .brain-message td {
          border: 1px solid #e0e0e0;
          padding: 8px;
        }
        .brain-message th {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .source-citation {
          background-color: rgba(33, 150, 243, 0.1);
          border-left: 3px solid #2196F3;
          padding: 8px 12px;
          margin: 8px 0;
          font-style: italic;
        }
      </style>
      <div class="brain-message">${html}</div>
    `;
  }

  /**
   * Apply bot styling to make messages visually distinct
   * 
   * @param html HTML content
   * @returns HTML with bot styling
   */
  private applyBotStyling(html: string): string {
    // Add a bot header with styling
    return `
      <div class="bot-message">
        <div class="bot-header" style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #2196F3; display: flex; justify-content: center; align-items: center; margin-right: 8px;">
            <span style="color: white; font-weight: bold;">B</span>
          </div>
          <span style="font-weight: bold; color: #2196F3;">Brain Assistant</span>
        </div>
        ${html}
      </div>
    `;
  }

  /**
   * Format a code block with basic formatting
   * 
   * @param code Code content
   * @param language Programming language (optional, for reference only)
   * @returns Formatted HTML
   */
  formatCodeBlock(code: string, language?: string): string {
    // Create code block with language if provided
    const markdown = '```' + (language || '') + '\n' + code + '\n```';
    return this.format(markdown);
  }

  /**
   * Format a citation block
   * 
   * @param source Source name
   * @param text Citation text
   * @param url Optional URL
   * @returns Formatted HTML
   */
  formatCitation(source: string, text: string, url?: string): string {
    let citation = `<div class="source-citation">
      <strong>Source: ${source}</strong>
      <p>${text}</p>`;
    
    if (url) {
      citation += `<a href="${url}" target="_blank">Read more</a>`;
    }
    
    citation += '</div>';
    
    return citation;
  }

  /**
   * Format an image with caption
   * 
   * @param src Image source URL
   * @param alt Alt text
   * @param caption Optional caption
   * @returns Formatted HTML
   */
  formatImage(src: string, alt: string, caption?: string): string {
    let imageHtml = `<div class="image-container">
      <img src="${src}" alt="${alt}" style="max-width: 100%; height: auto;">`;
    
    if (caption) {
      imageHtml += `<div class="image-caption" style="text-align: center; font-style: italic; margin-top: 4px;">${caption}</div>`;
    }
    
    imageHtml += '</div>';
    
    return imageHtml;
  }
}

// Singleton instance
let formatter: MatrixMarkdownFormatter | null = null;

/**
 * Get the singleton instance of the formatter
 */
export function getMarkdownFormatter(options?: Partial<MarkdownFormatterOptions>): MatrixMarkdownFormatter {
  if (!formatter) {
    formatter = new MatrixMarkdownFormatter(options);
  }
  return formatter;
}