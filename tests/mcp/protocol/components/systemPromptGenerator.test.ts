import { describe, expect, test } from 'bun:test';

import { relevanceConfig } from '@/config';
import { SystemPromptGenerator } from '@/mcp/protocol/components';

describe('SystemPromptGenerator', () => {
  const systemPromptGenerator = new SystemPromptGenerator();

  test('should generate a default system prompt', () => {
    const systemPrompt = systemPromptGenerator.getSystemPrompt();
    
    // Default prompt should be for notes only
    expect(systemPrompt).toContain('personal knowledge base');
    expect(systemPrompt).toContain('based on the user\'s notes');
    expect(systemPrompt).toContain('only the provided context');
    expect(systemPrompt).not.toContain('profile');
    expect(systemPrompt).not.toContain('external');
  });

  test('should generate a profile-focused prompt for profile queries', () => {
    const systemPrompt = systemPromptGenerator.getSystemPrompt(true); // isProfileQuery = true
    
    // Should be a profile-focused prompt
    expect(systemPrompt).toContain('profile information');
    expect(systemPrompt).toContain('Address the user directly');
    expect(systemPrompt).not.toContain('external');
  });

  test('should generate a prompt with external sources', () => {
    const systemPrompt = systemPromptGenerator.getSystemPrompt(
      false, // not a profile query
      0.1,   // low profile relevance
      true,   // has external sources
    );
    
    // Should be externally-focused
    expect(systemPrompt).toContain('external knowledge sources');
    expect(systemPrompt).toContain('Cite external sources');
    expect(systemPrompt).not.toContain('expertise');
  });

  test('should generate a combined prompt for profile query with external sources', () => {
    const systemPrompt = systemPromptGenerator.getSystemPrompt(
      true,  // profile query
      0.9,   // high profile relevance
      true,   // has external sources
    );
    
    // Should have both profile and external focus
    expect(systemPrompt).toContain('profile');
    expect(systemPrompt).toContain('external');
    expect(systemPrompt).toContain('Address the user directly');
    expect(systemPrompt).toContain('Cite external sources');
  });

  test('should handle high profile relevance for non-profile queries', () => {
    const systemPrompt = systemPromptGenerator.getSystemPrompt(
      false, // not explicitly a profile query
      0.8,    // but high profile relevance
    );
    
    // Should still emphasize profile
    expect(systemPrompt).toContain('professional background');
    expect(systemPrompt).toContain('expertise and experience');
  });

  test('should handle medium profile relevance', () => {
    const mediumRelevance = relevanceConfig.mediumProfileRelevanceThreshold + 0.05;
    
    const systemPrompt = systemPromptGenerator.getSystemPrompt(
      false,           // not explicitly a profile query
      mediumRelevance,  // medium profile relevance
    );
    
    // Should mention profile but focus on notes
    expect(systemPrompt).toContain('profile information');
    expect(systemPrompt).toContain('primarily on the user\'s notes');
    expect(systemPrompt).toContain('background knowledge');
  });

  test('should add external source guidelines for medium profile relevance with external sources', () => {
    const mediumRelevance = relevanceConfig.mediumProfileRelevanceThreshold + 0.05;
    
    const withoutExternal = systemPromptGenerator.getSystemPrompt(
      false,           // not a profile query
      mediumRelevance, // medium profile relevance
      false,            // no external sources
    );
    
    const withExternal = systemPromptGenerator.getSystemPrompt(
      false,           // not a profile query
      mediumRelevance, // medium profile relevance
      true,             // with external sources
    );
    
    // Should have more guidelines with external sources
    expect(withExternal.length).toBeGreaterThan(withoutExternal.length);
    expect(withExternal).toContain('external');
    expect(withExternal).toContain('source');
    expect(withoutExternal).not.toContain('external');
  });
});