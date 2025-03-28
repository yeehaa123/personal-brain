import { describe, test, expect } from 'bun:test';
import { BrainProtocol } from '../src/mcp/protocol/brainProtocol';

describe('BrainProtocol External Sources', () => {
  test('should initialize correctly with external sources', () => {
    const protocol = new BrainProtocol();
    expect(protocol).toBeDefined();
  });
  
  test('should allow toggling external sources', () => {
    // Create the protocol with default settings (false)
    const protocol = new BrainProtocol();
    
    // Verify useExternalSources is false by default
    expect(protocol['useExternalSources']).toBe(false);
    
    // Disable
    protocol.setUseExternalSources(false);
    expect(protocol['useExternalSources']).toBe(false);
    
    // Enable again
    protocol.setUseExternalSources(true);
    expect(protocol['useExternalSources']).toBe(true);
  });
  
  test('should provide access to external source context', () => {
    const protocol = new BrainProtocol();
    
    // Make sure we can access the external context
    const externalContext = protocol.getExternalSourceContext();
    expect(externalContext).toBeDefined();
  });
});