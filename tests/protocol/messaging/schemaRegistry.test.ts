/**
 * Schema Registry Smoke Tests
 * 
 * This file contains simple smoke tests to verify that the schema registry
 * contains all the necessary schemas and that they can be accessed correctly.
 * We don't test individual schema validation behavior, as those are already
 * tested by Zod itself.
 */

import { describe, expect, it } from 'bun:test';

import { DataRequestType, NotificationType } from '@/protocol/messaging/messageTypes';
import { 
  hasSchemaForNotificationType,
  hasSchemaForRequestType,
  isDataRequestMessage,
  isNotificationMessage,
  MessageSchemaRegistry,
} from '@/protocol/messaging/schemaRegistry';

describe('Schema Registry', () => {
  describe('MessageSchemaRegistry', () => {
    it('should contain schemas for all contexts', () => {
      // Check that the registry contains schemas
      expect(Object.keys(MessageSchemaRegistry).length).toBeGreaterThan(0);
    });

    describe('Notes Context Schemas', () => {
      it('should have schemas for note request types', () => {
        expect(MessageSchemaRegistry[DataRequestType.NOTE_BY_ID]).toBeDefined();
        expect(MessageSchemaRegistry[DataRequestType.NOTES_SEARCH]).toBeDefined();
        expect(MessageSchemaRegistry[DataRequestType.NOTES_SEMANTIC_SEARCH]).toBeDefined();
      });
      
      it('should have schemas for note notification types', () => {
        expect(MessageSchemaRegistry[NotificationType.NOTE_CREATED]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.NOTE_UPDATED]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.NOTE_DELETED]).toBeDefined();
      });
    });

    describe('Conversation Context Schemas', () => {
      it('should have schema for conversation history request', () => {
        expect(MessageSchemaRegistry[DataRequestType.CONVERSATION_HISTORY]).toBeDefined();
      });
  
      it('should have schemas for conversation notifications', () => {
        expect(MessageSchemaRegistry[NotificationType.CONVERSATION_STARTED]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.CONVERSATION_CLEARED]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.CONVERSATION_TURN_ADDED]).toBeDefined();
      });
  
      it('should have schemas for conversation tools', () => {
        expect(MessageSchemaRegistry['conversation.create']).toBeDefined();
        expect(MessageSchemaRegistry['conversation.addTurn']).toBeDefined();
      });
    });
  
    describe('Profiles Context Schemas', () => {
      it('should have schema for profile request types', () => {
        expect(MessageSchemaRegistry[DataRequestType.PROFILE_DATA]).toBeDefined();
      });
  
      it('should have schemas for profile notifications', () => {
        expect(MessageSchemaRegistry[NotificationType.PROFILE_UPDATED]).toBeDefined();
      });
  
      it('should have schemas for profile tools', () => {
        expect(MessageSchemaRegistry['profile.update']).toBeDefined();
        expect(MessageSchemaRegistry['profile.migrateLinkedIn']).toBeDefined();
      });
    });
  
    describe('Website Context Schemas', () => {
      it('should have schema for website request types', () => {
        expect(MessageSchemaRegistry[DataRequestType.WEBSITE_STATUS]).toBeDefined();
      });
  
      it('should have schemas for website notifications', () => {
        expect(MessageSchemaRegistry[NotificationType.WEBSITE_GENERATED]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.WEBSITE_DEPLOYED]).toBeDefined();
      });
  
      it('should have schemas for website tools', () => {
        expect(MessageSchemaRegistry['website.updateIdentity']).toBeDefined();
        expect(MessageSchemaRegistry['website.generateContent']).toBeDefined();
      });
    });
  
    describe('External Source Context Schemas', () => {
      it('should have schema for external source request types', () => {
        expect(MessageSchemaRegistry[DataRequestType.EXTERNAL_SOURCES]).toBeDefined();
        expect(MessageSchemaRegistry['externalSources.status']).toBeDefined();
      });
  
      it('should have schemas for external source notifications', () => {
        expect(MessageSchemaRegistry[NotificationType.EXTERNAL_SOURCES_STATUS]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.EXTERNAL_SOURCES_AVAILABILITY]).toBeDefined();
        expect(MessageSchemaRegistry[NotificationType.EXTERNAL_SOURCES_SEARCH]).toBeDefined();
      });
    });
  });
  
  describe('hasSchemaForRequestType', () => {
    it('should return true for registered request types', () => {
      expect(hasSchemaForRequestType(DataRequestType.NOTE_BY_ID)).toBe(true);
      expect(hasSchemaForRequestType(DataRequestType.NOTES_SEARCH)).toBe(true);
      expect(hasSchemaForRequestType(DataRequestType.NOTES_SEMANTIC_SEARCH)).toBe(true);
    });
    
    it('should return false for unregistered request types', () => {
      expect(hasSchemaForRequestType('unknown.request.type')).toBe(false);
    });
  });
  
  describe('hasSchemaForNotificationType', () => {
    it('should return true for registered notification types', () => {
      expect(hasSchemaForNotificationType(NotificationType.NOTE_CREATED)).toBe(true);
      expect(hasSchemaForNotificationType(NotificationType.NOTE_UPDATED)).toBe(true);
      expect(hasSchemaForNotificationType(NotificationType.NOTE_DELETED)).toBe(true);
    });
    
    it('should return false for unregistered notification types', () => {
      expect(hasSchemaForNotificationType('unknown.notification.type')).toBe(false);
    });
  });
  
  describe('isDataRequestMessage', () => {
    it('should return true for valid data request messages', () => {
      const message = {
        id: 'test-id',
        timestamp: new Date(),
        source: 'test-source',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'request',
        dataType: DataRequestType.NOTE_BY_ID,
        parameters: { id: 'test-note-id' },
      };
      
      expect(isDataRequestMessage(message)).toBe(true);
    });
    
    it('should return false for non-data-request messages', () => {
      const notification = {
        id: 'test-id',
        timestamp: new Date(),
        source: 'test-source',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'notification',
        notificationType: NotificationType.NOTE_CREATED,
        payload: { noteId: 'test-note-id', title: 'Test Note' },
      };
      
      expect(isDataRequestMessage(notification)).toBe(false);
      // Non-object values should return false
      expect(isDataRequestMessage(null as unknown)).toBe(false);
      expect(isDataRequestMessage(undefined as unknown)).toBe(false);
      expect(isDataRequestMessage({})).toBe(false);
    });
  });
  
  describe('isNotificationMessage', () => {
    it('should return true for valid notification messages', () => {
      const message = {
        id: 'test-id',
        timestamp: new Date(),
        source: 'test-source',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'notification',
        notificationType: NotificationType.NOTE_CREATED,
        payload: { noteId: 'test-note-id', title: 'Test Note' },
      };
      
      expect(isNotificationMessage(message)).toBe(true);
    });
    
    it('should return false for non-notification messages', () => {
      const request = {
        id: 'test-id',
        timestamp: new Date(),
        source: 'test-source',
        sourceContext: 'test-context',
        targetContext: 'notes',
        category: 'request',
        dataType: DataRequestType.NOTE_BY_ID,
        parameters: { id: 'test-note-id' },
      };
      
      expect(isNotificationMessage(request)).toBe(false);
      expect(isNotificationMessage(null as unknown)).toBe(false);
      expect(isNotificationMessage(undefined as unknown)).toBe(false);
      expect(isNotificationMessage({})).toBe(false);
    });
  });
});