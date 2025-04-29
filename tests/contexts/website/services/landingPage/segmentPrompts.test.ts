import fs from 'fs';
import path from 'path';

import { describe, expect, test } from 'bun:test';

describe('Landing Page Segment Prompts', () => {
  const promptsPath = path.join(process.cwd(), 'src', 'contexts', 'website', 'services', 'prompts', 'segments');
  
  test('all segment prompts should exist', () => {
    const expectedPrompts = [
      'identity-segment.txt',
      'service-offering-segment.txt',
      'credibility-segment.txt',
      'conversion-segment.txt',
    ];
    
    for (const promptFile of expectedPrompts) {
      const promptPath = path.join(promptsPath, promptFile);
      expect(fs.existsSync(promptPath)).toBe(true);
    }
  });
  
  test('prompts should contain proper instructions', () => {
    const promptFiles = [
      'identity-segment.txt',
      'service-offering-segment.txt',
      'credibility-segment.txt',
      'conversion-segment.txt',
    ];
    
    for (const promptFile of promptFiles) {
      const promptPath = path.join(promptsPath, promptFile);
      const content = fs.readFileSync(promptPath, 'utf8');
      
      // Basic content checks
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('# ');
      expect(content).toContain('## ');
      expect(content).toContain('Response Format');
      
      // Check prompt-specific content
      if (promptFile === 'identity-segment.txt') {
        expect(content).toContain('identity');
        expect(content).toContain('hero');
      } else if (promptFile === 'service-offering-segment.txt') {
        expect(content).toContain('service');
        expect(content).toContain('process');
      } else if (promptFile === 'credibility-segment.txt') {
        expect(content).toContain('case stud');
        expect(content).toContain('expertise');
      } else if (promptFile === 'conversion-segment.txt') {
        expect(content).toContain('FAQ');
        expect(content).toContain('call-to-action');
      }
    }
  });
});