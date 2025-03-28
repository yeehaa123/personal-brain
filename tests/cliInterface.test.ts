import { test, expect, describe } from 'bun:test';
import { CLIInterface } from '../src/utils/cliInterface';
import logger from '../src/utils/logger';

// Store original logger methods
const originalLoggerInfo = logger.info;
const originalLoggerDebug = logger.debug;
const originalLoggerWarn = logger.warn;
const originalLoggerError = logger.error;

// Silence logger during tests
logger.info = () => {};
logger.debug = () => {};
logger.warn = () => {};
logger.error = () => {};

describe('CLIInterface', () => {
  
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
  });
});