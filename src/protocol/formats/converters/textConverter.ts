/**
 * Text Converter
 * 
 * This converter handles conversion between structured message formats
 * and plain text representations for display or logging.
 */

import type { CommandMessage, EventMessage, ProtocolMessage, QueryMessage, ResponseMessage } from '../messageFormats';

/**
 * Converter for text message formats
 */
export class TextConverter {
  /**
   * Convert a protocol message to a human-readable text representation
   * 
   * @param message The message to convert
   * @returns Text representation of the message
   */
  static toText(message: ProtocolMessage): string {
    const timestamp = message.timestamp.toISOString();
    const header = `${message.type.toUpperCase()} [${timestamp}] ${message.source}`;
    
    switch (message.type) {
    case 'query':
      return this.formatQueryMessage(header, message as QueryMessage);
    case 'command':
      return this.formatCommandMessage(header, message as CommandMessage);
    case 'event':
      return this.formatEventMessage(header, message as EventMessage);
    case 'response':
      return this.formatResponseMessage(header, message as ResponseMessage);
    default:
      return `${header} (Unknown message type)`;
    }
  }
  
  /**
   * Format a query message as text
   * 
   * @param header Message header
   * @param message Query message
   * @returns Formatted text
   */
  private static formatQueryMessage(header: string, message: QueryMessage): string {
    return `${header}\nQuery: ${message.content}`;
  }
  
  /**
   * Format a command message as text
   * 
   * @param header Message header
   * @param message Command message
   * @returns Formatted text
   */
  private static formatCommandMessage(header: string, message: CommandMessage): string {
    const args = message.args ? `\nArgs: ${JSON.stringify(message.args)}` : '';
    return `${header}\nCommand: ${message.command}${args}`;
  }
  
  /**
   * Format an event message as text
   * 
   * @param header Message header
   * @param message Event message
   * @returns Formatted text
   */
  private static formatEventMessage(header: string, message: EventMessage): string {
    return `${header}\nEvent: ${message.event}\nPayload: ${JSON.stringify(message.payload)}`;
  }
  
  /**
   * Format a response message as text
   * 
   * @param header Message header
   * @param message Response message
   * @returns Formatted text
   */
  private static formatResponseMessage(header: string, message: ResponseMessage): string {
    const errorText = message.error 
      ? `\nError: ${message.error.code} - ${message.error.message}` 
      : '';
      
    return `${header}\nStatus: ${message.status}${errorText}\nData: ${JSON.stringify(message.data, null, 2)}`;
  }
  
  /**
   * Create a simple text summary of a message (for logging)
   * 
   * @param message The message to summarize
   * @returns Brief text summary
   */
  static toSummary(message: ProtocolMessage): string {
    // Validate the message type with type guards
    if (!message || typeof message !== 'object') {
      return 'Invalid message format';
    }
    
    // Use type narrowing with a type assertion
    const msgType = message.type as string;
    
    switch (msgType) {
    case 'query':
      return `Query: ${(message as QueryMessage).content.substring(0, 30)}...`;
    case 'command':
      return `Command: ${(message as CommandMessage).command}`;
    case 'event':
      return `Event: ${(message as EventMessage).event}`;
    case 'response':
      return `Response: ${(message as ResponseMessage).status}`;
    default:
      // Handle unknown type more safely
      return `Unknown message type: ${String(msgType)}`;
    }
  }
}
