/**
 * Tests for Validation Utilities
 * 
 * This file contains tests for the validation utilities for message schemas.
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';
import type { DataRequestMessage, NotificationMessage } from '@/protocol/messaging/messageTypes';
import {
  validateNotificationPayload,
  validateRequestParams,
} from '@/protocol/messaging/validation';
import { MockLogger } from '@test/__mocks__/core/logger';

describe('Validation Utilities', () => {
  // Setup test logger to avoid console output during tests
  let mockLogger: ReturnType<typeof MockLogger.createFresh>;

  beforeEach(() => {
    MockLogger.resetInstance();
    mockLogger = MockLogger.createFresh();
  });

  describe('validateRequestParams', () => {
    it('should successfully validate valid parameters', () => {
      const message: DataRequestMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'request',
        dataType: DataRequestType.NOTE_BY_ID,
        parameters: { id: 'test-note-id' },
      };

      const result = validateRequestParams(message, { logger: mockLogger });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'test-note-id' });
    });

    it('should fail validation for invalid parameters', () => {
      const message: DataRequestMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'request',
        dataType: DataRequestType.NOTE_BY_ID,
        parameters: {}, // Missing required id field
      };

      const result = validateRequestParams(message, {
        logger: mockLogger,
        logErrors: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('id');
    });

    it('should throw error when throwOnError is true', () => {
      const message: DataRequestMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'request',
        dataType: DataRequestType.NOTE_BY_ID,
        parameters: {}, // Missing required id field
      };

      expect(() => {
        validateRequestParams(message, {
          throwOnError: true,
          logger: mockLogger,
          logErrors: false,
        });
      }).toThrow();
    });

    it('should handle unknown request types', () => {
      const message: DataRequestMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'request',
        dataType: 'unknown.request.type' as DataRequestType,
        parameters: { id: 'test-note-id' },
      };

      const result = validateRequestParams(message, {
        logger: mockLogger,
        logErrors: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No schema defined');
    });
  });

  describe('validateNotificationPayload', () => {
    it('should successfully validate valid payload', () => {
      const message: NotificationMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'notification',
        notificationType: NotificationType.NOTE_CREATED,
        payload: {
          noteId: 'test-note-id',
          title: 'Test Note',
        },
      };

      const result = validateNotificationPayload(message, { logger: mockLogger });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        noteId: 'test-note-id',
        title: 'Test Note',
      });
    });

    it('should fail validation for invalid payload', () => {
      const message: NotificationMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'notification',
        notificationType: NotificationType.NOTE_CREATED,
        payload: {
          // Missing required noteId and title fields
        },
      };

      const result = validateNotificationPayload(message, {
        logger: mockLogger,
        logErrors: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle unknown notification types', () => {
      const message: NotificationMessage = {
        id: 'test-id',
        timestamp: new Date(),
        type: 'context',
        source: 'test-source',
        target: 'notes',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'notification',
        notificationType: 'unknown.notification.type' as NotificationType,
        payload: { noteId: 'test-note-id' },
      };

      const result = validateNotificationPayload(message, {
        logger: mockLogger,
        logErrors: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No schema defined');
    });
  });
});
