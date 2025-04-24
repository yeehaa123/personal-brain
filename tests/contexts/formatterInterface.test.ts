/**
 * Tests for the FormatterInterface
 * 
 * These tests validate that the interface can be implemented correctly
 * and that implementations behave as expected.
 */
import { describe, expect, test } from 'bun:test';

import type { 
  FormatterInterface,
  FormattingOptions,
} from '@/contexts/formatterInterface';

// Define sample input and output types for testing
interface TestInput {
  id: string;
  name: string;
  details: {
    created: Date;
    value: number;
    tags: string[];
  };
}

interface TestOutput {
  identifier: string;
  displayName: string;
  creationDate: string;
  value: string;
  tags: string;
  hasDetails: boolean;
}

// Extended formatting options for testing
interface TestFormattingOptions extends FormattingOptions {
  dateFormat?: 'short' | 'long';
  includeValue?: boolean;
  tagsFormat?: 'comma' | 'hash';
}

// Mock implementation of FormatterInterface for testing
class MockFormatter implements FormatterInterface<TestInput, TestOutput> {
  format(data: TestInput, options?: TestFormattingOptions): TestOutput {
    // Default options
    const dateFormat = options?.dateFormat || 'short';
    const includeValue = options?.includeValue !== undefined ? options?.includeValue : true;
    const tagsFormat = options?.tagsFormat || 'comma';
    
    // Format the date based on options
    let formattedDate = '';
    if (dateFormat === 'short') {
      formattedDate = data.details.created.toLocaleDateString();
    } else {
      formattedDate = data.details.created.toLocaleString();
    }
    
    // Format tags based on options
    let formattedTags = '';
    if (tagsFormat === 'comma') {
      formattedTags = data.details.tags.join(', ');
    } else {
      formattedTags = data.details.tags.map(tag => `#${tag}`).join(' ');
    }
    
    return {
      identifier: data.id,
      displayName: data.name,
      creationDate: formattedDate,
      value: includeValue ? `${data.details.value}` : 'hidden',
      tags: formattedTags,
      hasDetails: data.details !== undefined && Object.keys(data.details).length > 0,
    };
  }
}

describe('FormatterInterface', () => {
  const formatter = new MockFormatter();
  const testInput: TestInput = {
    id: 'test-123',
    name: 'Test Item',
    details: {
      created: new Date('2025-01-15T12:00:00Z'),
      value: 42,
      tags: ['important', 'test', 'example'],
    },
  };

  test('format should convert input to output using default options', () => {
    const result = formatter.format(testInput);
    
    expect(result).toHaveProperty('identifier', 'test-123');
    expect(result).toHaveProperty('displayName', 'Test Item');
    expect(result).toHaveProperty('creationDate');
    expect(result).toHaveProperty('value', '42');
    expect(result).toHaveProperty('tags', 'important, test, example');
    expect(result).toHaveProperty('hasDetails', true);
  });

  test('format should respect dateFormat option', () => {
    // With short date format (default)
    const resultShort = formatter.format(testInput, { dateFormat: 'short' });
    expect(resultShort.creationDate).toBe(testInput.details.created.toLocaleDateString());
    
    // With long date format
    const resultLong = formatter.format(testInput, { dateFormat: 'long' });
    expect(resultLong.creationDate).toBe(testInput.details.created.toLocaleString());
  });

  test('format should respect includeValue option', () => {
    // With value included (default)
    const resultWithValue = formatter.format(testInput, { includeValue: true });
    expect(resultWithValue.value).toBe('42');
    
    // With value hidden
    const resultWithoutValue = formatter.format(testInput, { includeValue: false });
    expect(resultWithoutValue.value).toBe('hidden');
  });

  test('format should respect tagsFormat option', () => {
    // With comma format (default)
    const resultComma = formatter.format(testInput, { tagsFormat: 'comma' });
    expect(resultComma.tags).toBe('important, test, example');
    
    // With hash format
    const resultHash = formatter.format(testInput, { tagsFormat: 'hash' });
    expect(resultHash.tags).toBe('#important #test #example');
  });

  test('format should combine multiple options correctly', () => {
    const result = formatter.format(testInput, {
      dateFormat: 'long',
      includeValue: false,
      tagsFormat: 'hash',
    });
    
    expect(result.creationDate).toBe(testInput.details.created.toLocaleString());
    expect(result.value).toBe('hidden');
    expect(result.tags).toBe('#important #test #example');
  });
});