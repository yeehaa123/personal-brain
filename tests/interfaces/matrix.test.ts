/**
 * Tests for MatrixBrainInterface using proper mocking pattern
 * 
 * Following best practices from CLAUDE.md:
 * 1. Using standard MockBrainProtocol from '@test/__mocks__/protocol/brainProtocol'
 * 2. Using test isolation patterns with resetInstance() in hooks
 * 3. Focusing on testable interfaces rather than implementation details
 * 4. Testing proper dependency injection
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type * as sdk from 'matrix-js-sdk';

import type { CommandHandler } from '@/commands';
import type { ServerManager } from '@/contexts/website/services/serverManager';
import { MatrixBrainInterface } from '@/interfaces/matrix';
import type { IBrainProtocol } from '@/protocol/types';
import type { Logger } from '@/utils/logger';
import { MockCommandHandler } from '@test/__mocks__/commands/commandHandler';
import { MockLogger } from '@test/__mocks__/core/logger';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';

describe('MatrixBrainInterface', () => {
  // Reset singletons before each test to ensure isolation
  beforeEach(() => {
    MatrixBrainInterface.resetInstance();
    MockBrainProtocol.resetInstance();
    MockCommandHandler.resetInstance();
    MockLogger.resetInstance();
    
    // Set up silent logger to avoid console noise during tests
    MockLogger.instance = MockLogger.createFresh({ silent: true, name: 'test-logger' });
    
    // Set necessary environment variables
    process.env['MATRIX_ACCESS_TOKEN'] = 'test-token';
    process.env['MATRIX_USER_ID'] = '@test:matrix.org';
    process.env['MATRIX_ROOM_IDS'] = 'room1,room2';
    process.env['NODE_ENV'] = 'test';
  });
  
  // Clean up after each test
  afterEach(() => {
    // Reset mocked singletons
    MatrixBrainInterface.resetInstance();
    MockBrainProtocol.resetInstance();
    MockCommandHandler.resetInstance();
    MockLogger.resetInstance();
    
    // Clean up environment variables
    delete process.env['MATRIX_ACCESS_TOKEN'];
    delete process.env['MATRIX_USER_ID'];
    delete process.env['MATRIX_ROOM_IDS'];
    delete process.env['NODE_ENV'];
  });

  test('Should create MatrixBrainInterface instance with dependencies', () => {
    // Create mock dependencies
    const mockClient = {
      startClient: mock(() => Promise.resolve()),
      on: mock(),
      once: mock(),
      joinRoom: mock(() => Promise.resolve()),
    } as unknown as sdk.MatrixClient;
    
    const mockBrainProtocol = MockBrainProtocol.createFresh() as unknown as IBrainProtocol;
    const mockCommandHandler = MockCommandHandler.createFresh() as unknown as CommandHandler;
    
    const mockConfig = {
      homeserverUrl: 'https://test.matrix.org',
      accessToken: 'test-token',
      userId: '@test:matrix.org',
      roomIds: ['room1', 'room2'],
      commandPrefix: '!brain',
    };
    
    const mockServerManager = {
      initialize: mock(() => Promise.resolve()),
      startServers: mock(() => Promise.resolve(true)),
      cleanup: mock(() => Promise.resolve()),
    } as unknown as ServerManager;
    
    // Create a fresh instance with explicit dependencies
    const matrixInterface = MatrixBrainInterface.createFresh(
      mockClient,
      mockBrainProtocol,
      mockCommandHandler,
      mockConfig,
      MockLogger.createFresh({ silent: true, name: 'test-instance-1' }) as unknown as Logger,
      mockServerManager,
    );
    
    // Verify instance was created
    expect(matrixInterface).toBeDefined();
  });
  
  test('Should maintain singleton instance', () => {
    // Get singleton instance
    const instance1 = MatrixBrainInterface.getInstance();
    const instance2 = MatrixBrainInterface.getInstance();
    
    // Verify both references point to the same instance
    expect(instance1).toBe(instance2);
    
    // Reset singleton
    MatrixBrainInterface.resetInstance();
    
    // Get new instance
    const instance3 = MatrixBrainInterface.getInstance();
    
    // Verify it's different from the original instance
    expect(instance1).not.toBe(instance3);
  });
  
  test('Should start without initializing server if specified', async () => {
    // Create mock dependencies
    const mockClient = {
      startClient: mock(() => Promise.resolve()),
      on: mock(),
      once: mock((event, callback) => {
        // Simulate successful sync
        if (event === 'sync') {
          callback('PREPARED');
        }
        return { removeListener: mock() };
      }),
      joinRoom: mock(() => Promise.resolve()),
    } as unknown as sdk.MatrixClient;
    
    const mockBrainProtocol = MockBrainProtocol.createFresh() as unknown as IBrainProtocol;
    mockBrainProtocol.initialize = mock(() => Promise.resolve());
    
    const mockCommandHandler = MockCommandHandler.createFresh() as unknown as CommandHandler;
    
    const mockConfig = {
      homeserverUrl: 'https://test.matrix.org',
      accessToken: 'test-token',
      userId: '@test:matrix.org',
      roomIds: ['room1'],
      commandPrefix: '!brain',
    };
    
    const mockServerManager = {
      initialize: mock(() => Promise.resolve()),
      startServers: mock(() => Promise.resolve(true)),
      cleanup: mock(() => Promise.resolve()),
    } as unknown as ServerManager;
    
    // Create a fresh instance with explicit dependencies
    const matrixInterface = MatrixBrainInterface.createFresh(
      mockClient,
      mockBrainProtocol,
      mockCommandHandler,
      mockConfig,
      MockLogger.createFresh({ silent: true, name: 'test-instance-2' }) as unknown as Logger,
      mockServerManager,
    );
    
    // Start the interface without initializing the server
    await matrixInterface.start(false);
    
    // Verify server was not initialized
    expect(mockServerManager.initialize).not.toHaveBeenCalled();
    
    // Verify client was started
    expect(mockClient.startClient).toHaveBeenCalled();
    
    // Verify brainProtocol was initialized
    expect(mockBrainProtocol.initialize).toHaveBeenCalled();
    
    // Verify room was joined
    expect(mockClient.joinRoom).toHaveBeenCalledTimes(1);
  });
  
  test('Basic protocol instantiation test', () => {
    // Create a protocol instance for testing
    const protocol = MockBrainProtocol.getInstance({
      interfaceType: 'matrix',
      roomId: 'test-room',
    });
    
    // Verify it was initialized correctly
    expect(protocol).toBeDefined();
    expect(protocol.getContextManager()).toBeDefined();
    expect(protocol.getConversationManager()).toBeDefined();
  });
});