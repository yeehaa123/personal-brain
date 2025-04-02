import { describe, test, expect } from 'bun:test';
import { BrainProtocol } from '@/mcp/protocol';

describe('BrainProtocol API', () => {
  test('should initialize correctly', () => {
    const protocol = new BrainProtocol();
    expect(protocol).toBeDefined();
  });
  
  test('should allow toggling external sources', () => {
    // Create the protocol with default settings (false)
    const protocol = new BrainProtocol();
    
    // Verify useExternalSources is false by default
    expect(protocol['useExternalSources']).toBe(false);
    expect(protocol.getUseExternalSources()).toBe(false);
    
    // Disable
    protocol.setUseExternalSources(false);
    expect(protocol['useExternalSources']).toBe(false);
    expect(protocol.getUseExternalSources()).toBe(false);
    
    // Enable again
    protocol.setUseExternalSources(true);
    expect(protocol['useExternalSources']).toBe(true);
    expect(protocol.getUseExternalSources()).toBe(true);
  });
  
  test('should provide access to external source context', () => {
    const protocol = new BrainProtocol();
    
    // Make sure we can access the external context
    const externalContext = protocol.getExternalSourceContext();
    expect(externalContext).toBeDefined();
  });
});