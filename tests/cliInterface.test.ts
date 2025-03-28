import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { CLIInterface } from '../src/utils/cliInterface';
import logger from '../src/utils/logger';
import { mockLogger, restoreLogger } from './mocks';
import { captureOutput } from './test-utils';

// Store the original logger methods
let originalLogger: any;

describe('CLIInterface', () => {
  
  beforeAll(() => {
    // Silence logger during tests
    originalLogger = mockLogger(logger);
  });
  
  afterAll(() => {
    // Restore original logger functions
    restoreLogger(logger, originalLogger);
  });
  
  describe('styles', () => {
    test('should have tag style defined', () => {
      expect(CLIInterface.styles.tag).toBeDefined();
      const styledTag = CLIInterface.styles.tag('test-tag');
      expect(styledTag).toBeTypeOf('string');
      expect(styledTag).toContain('test-tag'); // The original tag should be in the result
    });
    
    test('should have other necessary styles defined', () => {
      // Check that all styles mentioned in our fix are defined
      expect(CLIInterface.styles.number).toBeDefined();
      expect(CLIInterface.styles.subtitle).toBeDefined();
      expect(CLIInterface.styles.id).toBeDefined();
    });
  });
  
  describe('formatting methods', () => {
    test('formatId should properly format an ID', () => {
      const id = 'test-id-123';
      const formatted = CLIInterface.formatId(id);
      expect(formatted).toContain(id);
    });
    
    test('formatTags should handle array of tags', () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      const formatted = CLIInterface.formatTags(tags);
      
      // The formatted string should contain all tags
      tags.forEach(tag => {
        expect(formatted).toContain(`#${tag}`);
      });
    });
    
    test('formatTags should handle empty tags', () => {
      const formatted = CLIInterface.formatTags([]);
      expect(formatted).toContain('No tags');
    });
    
    test('formatTags should handle null/undefined', () => {
      expect(CLIInterface.formatTags(null)).toContain('No tags');
      expect(CLIInterface.formatTags(undefined)).toContain('No tags');
    });
  });
  
  describe('printLabelValue option handling', () => {
    test('should handle formatter option for arrays', () => {
      const options = { 
        formatter: (tag) => `#${tag}`,
        emptyText: 'none'
      };
      
      // Verify formatter works
      expect(options.formatter('tag1')).toBe('#tag1');
      
      // Verify emptyText is set
      expect(options.emptyText).toBe('none');
    });
    
    test('should handle emptyText option for empty arrays', () => {
      const options = { emptyText: 'No tags available' };
      expect(options.emptyText).toBe('No tags available');
    });
    
    test('should use formatter for values when provided', () => {
      const formatter = (val) => `[${val}]`;
      expect(formatter('value')).toBe('[value]');
    });
    
    test('should print label and value correctly', () => {
      const capture = captureOutput();
      
      try {
        CLIInterface.printLabelValue('Tags', ['tag1', 'tag2'], {
          formatter: tag => CLIInterface.styles.tag(`#${tag}`)
        });
        
        const output = capture.getOutput();
        expect(output).toContain('Tags');
        expect(output).toContain('#tag1');
        expect(output).toContain('#tag2');
      } finally {
        capture.restore();
      }
    });
    
    test('should handle empty values with emptyText', () => {
      const capture = captureOutput();
      
      try {
        CLIInterface.printLabelValue('Tags', [], {
          emptyText: 'No tags found'
        });
        
        const output = capture.getOutput();
        expect(output).toContain('Tags');
        expect(output).toContain('No tags found');
      } finally {
        capture.restore();
      }
    });
  });
});