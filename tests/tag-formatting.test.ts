import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { CLIInterface } from '../src/utils/cliInterface';

describe('Tag Formatting', () => {
  test('CLIInterface.styles.tag should format tags with # prefix', () => {
    const formattedTag = CLIInterface.styles.tag('#test-tag');
    // The actual styling is not important for this test, but it should contain the tag
    expect(formattedTag).toContain('#test-tag');
  });
  
  test('formatTags should handle array of tags correctly', () => {
    const tags = ['tag1', 'tag2', 'tag3'];
    const formatted = CLIInterface.formatTags(tags);
    
    // It should include all tags
    tags.forEach(tag => {
      expect(formatted).toContain(`#${tag}`);
    });
  });
  
  describe('printLabelValue with tag formatter', () => {
    let originalProcess;
    let capturedOutput = '';
    
    // Capture stdout without actually writing to the terminal
    beforeEach(() => {
      originalProcess = process.stdout.write;
      process.stdout.write = (str) => {
        capturedOutput += str;
        return true;
      };
      capturedOutput = '';
    });
    
    afterEach(() => {
      process.stdout.write = originalProcess;
    });
    
    test('should apply tag formatter to each tag in an array', () => {
      const tags = ['ecosystem', 'architecture', 'innovation'];
      const formatter = tag => `#${tag}`;
      
      CLIInterface.printLabelValue('Tags', tags, { formatter });
      
      // It should include all tags with # prefix
      tags.forEach(tag => {
        expect(capturedOutput).toContain(`#${tag}`);
      });
    });
    
    test('should handle empty tags array with emptyText', () => {
      CLIInterface.printLabelValue('Tags', [], { emptyText: 'none' });
      expect(capturedOutput).toContain('none');
    });
    
    test('should integrate tag styling with # prefix', () => {
      const formatter = tag => CLIInterface.styles.tag(`#${tag}`);
      CLIInterface.printLabelValue('Tags', ['test-tag'], { formatter });
      
      expect(capturedOutput).toContain('test-tag');
      expect(capturedOutput).toContain('#');
    });
  });
});