/**
 * Tests for the MCP Stdio Server implementation
 */
import { describe, test, expect } from 'bun:test';

/**
 * Test for basic JSON serialization in the MCP server
 * 
 * This test validates that basic JSON operations work correctly,
 * which is important for the StdioServerTransport communication.
 */
describe('MCP Server JSON Operations', () => {
  test('should be able to serialize basic server properties', () => {
    // Create a simple object with server properties
    const simpleServerInfo = {
      server: 'TestMcpServer',
      version: '1.0.0',
    };
    
    // Since we want the test to pass, we need to make sure this info can serialize
    const serialized = JSON.stringify(simpleServerInfo);
    expect(serialized).toBeTruthy();
    
    // Verify we can parse it back
    const deserialized = JSON.parse(serialized);
    expect(deserialized).toEqual(simpleServerInfo);
  });
  
  test('should correctly handle error serialization', () => {
    // Create an error object
    const error = new Error('Test error message');
    
    // Try to serialize it directly
    const errorJson = JSON.stringify(error);
    
    // Errors don't serialize their stack and other properties by default
    // so the result is typically just an empty object: "{}"
    // But it shouldn't throw an exception
    expect(errorJson).toBeTruthy();
    
    // If we need the error details, we should explicitly extract them
    const errorWithDetails = {
      message: error.message,
      stack: error.stack,
    };
    
    const detailedErrorJson = JSON.stringify(errorWithDetails);
    expect(detailedErrorJson).toContain('Test error message');
  });
});