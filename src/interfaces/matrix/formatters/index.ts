/**
 * Matrix formatters index
 * 
 * Exports public matrix formatters for easy importing
 * without leaking implementation details
 */

// Import specific exports from each formatter
import {
  type Block,
  type BlockBuilderOptions,
  type BlockElement, 
  type BlockType,
  getBlockBuilder,
  MatrixBlockBuilder,
  type TextObject,
} from './block-formatter';
import {
  getCitationFormatter,
  MatrixCitationFormatter,
} from './citation-formatter';
import { 
  getMarkdownFormatter,
  type MarkdownFormatterOptions,
  MatrixMarkdownFormatter, 
} from './markdown-formatter';
import {
  getResponseFormatter,
  MatrixResponseFormatter,
  type ResponseFormatterOptions,
  type ResponseType,
} from './response-formatter';
import type { BlockContent } from './types';

// Only export the public API - value exports
export {
  // Markdown formatter
  getMarkdownFormatter,
  MatrixMarkdownFormatter,
  
  // Citation formatter
  getCitationFormatter,
  MatrixCitationFormatter,
  
  // Block builder
  getBlockBuilder,
  MatrixBlockBuilder,
  
  // Response formatter
  getResponseFormatter,
  MatrixResponseFormatter,
};

// Type exports
export type {
  // Markdown formatter
  MarkdownFormatterOptions,
  
  // Block builder
  BlockType,
  TextObject,
  Block,
  BlockElement,
  BlockBuilderOptions,
  BlockContent,
  
  // Response formatter
  ResponseType,
  ResponseFormatterOptions,
};