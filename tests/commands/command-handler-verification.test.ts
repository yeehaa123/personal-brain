import { describe, expect, test } from 'bun:test';

import { CommandHandler } from '@/commands/core/commandHandler';

describe('CommandHandler verification', () => {
  test('should have resetInstance static method', () => {
    // Verify that CommandHandler has the resetInstance method
    expect(typeof CommandHandler.resetInstance).toBe('function');
  });
});