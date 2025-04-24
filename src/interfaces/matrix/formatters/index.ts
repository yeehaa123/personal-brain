/**
 * Matrix formatters index
 * 
 * Exports public matrix formatters for easy importing
 * without leaking implementation details
 */

// Import specific exports from each formatter
import { 
  getMarkdownFormatter,
  MatrixMarkdownFormatter,
  type MarkdownFormatterOptions 
} from './markdown-formatter';

import {
  getCitationFormatter,
  MatrixCitationFormatter
} from './citation-formatter';

import {
  getBlockBuilder,
  MatrixBlockBuilder,
  type BlockType, 
  type TextObject,
  type Block,
  type BlockElement,
  type BlockBuilderOptions
} from './block-formatter';

import {
  getResponseFormatter,
  MatrixResponseFormatter,
  type ResponseType,
  type ResponseFormatterOptions
} from './response-formatter';

import type { BlockContent } from './types';

// Only export the public API
export {
  // Markdown formatter
  getMarkdownFormatter,
  MarkdownFormatterOptions,
  MatrixMarkdownFormatter,
  
  // Citation formatter
  getCitationFormatter,
  MatrixCitationFormatter,
  
  // Block builder
  getBlockBuilder,
  BlockType,
  TextObject,
  Block,
  BlockElement,
  BlockBuilderOptions,
  MatrixBlockBuilder,
  BlockContent,
  
  // Response formatter
  getResponseFormatter,
  ResponseType,
  ResponseFormatterOptions,
  MatrixResponseFormatter
};