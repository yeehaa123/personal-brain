/**
 * Protocol Adapter Interface
 * 
 * This module defines the interface for protocol adapters, which convert
 * between the protocol's message formats and external formats.
 */

import type { ProtocolMessage, ResponseMessage } from '@/protocol/formats/messageFormats';

/**
 * Base interface for protocol adapters
 */
export interface ProtocolAdapter<ExternalMessageType> {
  /**
   * Convert from an external message format to the protocol format
   * 
   * @param externalMessage The external message to convert
   * @returns A protocol message
   */
  fromExternalFormat(externalMessage: ExternalMessageType): ProtocolMessage;
  
  /**
   * Convert from the protocol format to an external message format
   * 
   * @param protocolMessage The protocol message to convert
   * @returns An external message
   */
  toExternalFormat(protocolMessage: ResponseMessage): ExternalMessageType;
}