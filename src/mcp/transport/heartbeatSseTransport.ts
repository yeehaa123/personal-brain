/**
 * Custom SSE transport with heartbeat functionality
 * 
 * Extends the standard SSEServerTransport to add heartbeat support
 * and better connection management for Express applications.
 */

import type { Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// Interface for ExpressResponse to make TypeScript happy with our cast
interface ExpressResponse extends Response {
  flush?: () => void;
  writableEnded: boolean;
}

/**
 * Extends the standard SSEServerTransport to add heartbeat support
 * and better connection management for Express
 */
export class HeartbeatSSETransport extends SSEServerTransport {
  private heartbeatInterval: ReturnType<typeof globalThis.setInterval> | null = null;

  /**
   * Creates a new HeartbeatSSETransport instance
   * 
   * @param messagesEndpoint - The endpoint where messages should be POSTed
   * @param res - The Express response object
   * @param heartbeatIntervalMs - The interval between heartbeats in milliseconds (default: 30000)
   */
  constructor(
    messagesEndpoint: string, 
    res: Response, 
    heartbeatIntervalMs: number = 30000,
  ) {
    super(messagesEndpoint, res);

    // Setup heartbeat interval
    this.heartbeatInterval = globalThis.setInterval(
      () => this.sendHeartbeat(), 
      heartbeatIntervalMs,
    );

    // Ensure proper cleanup on connection close
    res.on('close', () => {
      if (this.heartbeatInterval) {
        globalThis.clearInterval(this.heartbeatInterval);
      }
    });
  }

  /**
   * Send a heartbeat to keep the connection alive
   */
  sendHeartbeat(): void {
    // Generate a timestamp
    const timestamp = new Date().toISOString();
    
    // Access the protected res property via private method
    this.sendCustomEvent('message', {
      type: 'heartbeat',
      transportType: 'sse',
      sessionId: this.getSessionId(),
      timestamp,
    });
  }
  
  /**
   * Helper method to access the protected sessionId property
   * This is used for testing and internal use
   */
  getSessionId(): string {
    return this['sessionId'] as string;
  }

  /**
   * Send a custom event with the specified event name and data
   * 
   * @param eventName - The SSE event name
   * @param data - The data to send
   */
  sendCustomEvent(eventName: string, data: unknown): void {
    const expressRes = this['res'] as ExpressResponse;
    if (!expressRes || expressRes.writableEnded) {
      return;
    }

    // Use the same format as standard transport but allow custom event name
    expressRes.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    
    // Flush the response if possible
    if (typeof expressRes.flush === 'function') {
      expressRes.flush();
    }
  }

  /**
   * Override close to clean up resources and match the expected return type
   */
  override async close(): Promise<void> {
    if (this.heartbeatInterval) {
      globalThis.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    await super.close();
  }
}