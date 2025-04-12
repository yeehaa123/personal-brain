import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { NetlifyDeploymentService } from '@/mcp/contexts/website/services/netlifyDeploymentService';

// Mock global fetch with type assertion to avoid TypeScript errors
// This is safe for tests as we're only using the parts of Response we define
global.fetch = mock<typeof fetch>(() => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  headers: new Headers(),
  redirected: false,
  statusText: 'OK',
  type: 'basic',
  url: 'https://api.netlify.com',
  clone: () => ({} as Response),
  body: null,
  bodyUsed: false,
  arrayBuffer: async () => new ArrayBuffer(0),
  blob: async () => new Blob(),
  formData: async () => new FormData(),
  text: async () => '',
} as Response));

describe('NetlifyDeploymentService', () => {
  let service: NetlifyDeploymentService;
  let tempDir: string;
  
  beforeEach(async () => {
    service = NetlifyDeploymentService.createFresh();
    
    // Create temp directory for testing
    tempDir = path.join(os.tmpdir(), `netlify-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Reset fetch mock
    (global.fetch as any).mockReset();
  });
  
  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });
  
  test('getProviderName should return "Netlify"', () => {
    expect(service.getProviderName()).toBe('Netlify');
  });
  
  describe('validateConfig', () => {
    test('should require token', async () => {
      const result = await service.initialize({});
      
      expect(result).toBe(false);
    });
    
    test('should require either siteId or siteName', async () => {
      const result = await service.initialize({ token: 'test-token' });
      
      expect(result).toBe(false);
    });
    
    test('should succeed with valid config with siteId', async () => {
      const result = await service.initialize({ 
        token: 'test-token', 
        siteId: 'test-site-id',
        buildDir: 'dist',
      });
      
      expect(result).toBe(true);
      expect(service.isConfigured()).toBe(true);
    });
    
    test('should succeed with valid config with siteName', async () => {
      const result = await service.initialize({ 
        token: 'test-token', 
        siteName: 'test-site-name',
        buildDir: 'dist',
      });
      
      expect(result).toBe(true);
      expect(service.isConfigured()).toBe(true);
    });
    
    test('should use default buildDir if not specified', async () => {
      const result = await service.initialize({ 
        token: 'test-token', 
        siteId: 'test-site-id',
      });
      
      expect(result).toBe(true);
    });
  });
  
  describe('deploy', () => {
    test('should fail if not configured', async () => {
      const result = await service.deploy('/path/to/site');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not properly configured');
    });
    
    test('should use test helper to set deploy result', async () => {
      // Set mock deploy result
      service.setDeploySuccess(true, 'https://test-mock.netlify.app');
      
      const result = await service.deploy('/path/to/site');
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://test-mock.netlify.app');
    });
    
    test('should get or create site via API', async () => {
      // Mock API responses
      (global.fetch as ReturnType<typeof mock<typeof fetch>>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/sites/test-site-id')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              site_id: 'test-site-id',
              ssl_url: 'https://test-site.netlify.app',
              url: 'http://test-site.netlify.app',
            }),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'basic',
            url: url,
            clone: () => ({} as Response),
            body: null,
            bodyUsed: false,
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
          } as Response);
        }
        
        // Handle other API calls
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          headers: new Headers(),
          redirected: false,
          statusText: 'OK',
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          text: async () => '',
        } as Response);
      });
      
      // Mock fs methods
      const mockAccess = mock(() => Promise.resolve());
      fs.access = mockAccess;
      
      const mockReaddir = mock(() => Promise.resolve([]));
      fs.readdir = mockReaddir;
      
      // Initialize service
      await service.initialize({ 
        token: 'test-token', 
        siteId: 'test-site-id',
        buildDir: 'dist',
      });
      
      await service.deploy('/path/to/site');
      
      // Verify API calls
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as any).mock.calls[0][0]).toContain('/sites/test-site-id');
      
      // Verify authorization header was set
      const headers = (global.fetch as any).mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer test-token');
    });
    
    test('should create site if no siteId is provided', async () => {
      // Mock API responses for site creation
      (global.fetch as ReturnType<typeof mock<typeof fetch>>).mockImplementation((url, options) => {
        if (typeof url === 'string' && url.includes('/sites') && options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              site_id: 'new-site-id',
              ssl_url: 'https://new-site.netlify.app',
              url: 'http://new-site.netlify.app',
            }),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'basic',
            url: url,
            clone: () => ({} as Response),
            body: null,
            bodyUsed: false,
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
          } as Response);
        }
        
        // Handle deploy API call
        if (typeof url === 'string' && url.includes('/deploys') && options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              id: 'deploy-id',
              ssl_url: 'https://new-site.netlify.app',
              url: 'http://new-site.netlify.app',
            }),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'basic',
            url: url,
            clone: () => ({} as Response),
            body: null,
            bodyUsed: false,
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
          } as Response);
        }
        
        // Handle other API calls
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          headers: new Headers(),
          redirected: false,
          statusText: 'OK',
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          text: async () => '',
        } as Response);
      });
      
      // Setup mock filesystem
      const mockAccess = mock(() => Promise.resolve());
      fs.access = mockAccess;
      
      // Mock directory listing with file entries (must return objects with isDirectory method)
      const mockReaddir = mock((_, options) => {
        if (options && (options as any).withFileTypes) {
          return Promise.resolve([
            {
              name: 'index.html',
              isDirectory: () => false,
            },
          ]);
        }
        return Promise.resolve(['index.html'] as string[]);
      });
      fs.readdir = mockReaddir as unknown as typeof fs.readdir;
      
      const mockReadFile = mock(() => Promise.resolve(Buffer.from('<html>Test</html>')));
      fs.readFile = mockReadFile as unknown as typeof fs.readFile;
      
      // Initialize service
      await service.initialize({ 
        token: 'test-token', 
        siteName: 'new-site-name',
        buildDir: 'dist',
      });
      
      const result = await service.deploy('/path/to/site');
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://new-site.netlify.app');
      
      // Verify API calls
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // First call should be site creation
      expect((global.fetch as any).mock.calls[0][0]).toContain('/sites');
      expect((global.fetch as any).mock.calls[0][1].method).toBe('POST');
      
      // Second call should be deploy
      expect((global.fetch as any).mock.calls[1][0]).toContain('/deploys');
      expect((global.fetch as any).mock.calls[1][1].method).toBe('POST');
    });
    
    test('should handle API errors', async () => {
      // Mock API error
      (global.fetch as ReturnType<typeof mock<typeof fetch>>).mockImplementation(() => Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid API token' }),
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: 'https://api.netlify.com',
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        text: async () => '',
      } as Response));
      
      // Initialize service
      await service.initialize({ 
        token: 'invalid-token', 
        siteId: 'test-site-id',
        buildDir: 'dist',
      });
      
      const result = await service.deploy('/path/to/site');
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid API token');
    });
    
    test('should handle missing build directory', async () => {
      // Mock fs.access to throw error
      const mockAccess = mock(() => Promise.reject(new Error('Directory not found')));
      fs.access = mockAccess;
      
      // Mock API to respond with site info
      (global.fetch as ReturnType<typeof mock<typeof fetch>>).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/sites/test-site-id')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              site_id: 'test-site-id',
              ssl_url: 'https://test-site.netlify.app',
              url: 'http://test-site.netlify.app',
            }),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'basic',
            url: urlString,
            clone: () => ({} as Response),
            body: null,
            bodyUsed: false,
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          headers: new Headers(),
          redirected: false,
          statusText: 'OK',
          type: 'basic',
          url: urlString,
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          text: async () => '',
        } as Response);
      });
      
      // Initialize service
      await service.initialize({ 
        token: 'test-token', 
        siteId: 'test-site-id',
        buildDir: 'dist',
      });
      
      const result = await service.deploy('/path/to/site');
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Build directory not found');
    });
  });
  
  describe('getSiteInfo', () => {
    test('should return null if not configured', async () => {
      const result = await service.getSiteInfo();
      
      expect(result).toBeNull();
    });
    
    test('should return null if no siteId configured', async () => {
      await service.initialize({ 
        token: 'test-token', 
        siteName: 'test-site',
        buildDir: 'dist',
      });
      
      const result = await service.getSiteInfo();
      
      expect(result).toBeNull();
    });
    
    test('should use test helper to set site info', async () => {
      // Set mock site info
      service.setSiteInfo('mock-site-id', 'https://mock-site.netlify.app');
      
      const result = await service.getSiteInfo();
      
      expect(result).not.toBeNull();
      expect(result?.siteId).toBe('mock-site-id');
      expect(result?.url).toBe('https://mock-site.netlify.app');
    });
    
    test('should fetch site info via API', async () => {
      // Mock API response
      (global.fetch as ReturnType<typeof mock<typeof fetch>>).mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          site_id: 'test-site-id',
          ssl_url: 'https://test-site.netlify.app',
          url: 'http://test-site.netlify.app',
        }),
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'basic',
        url: 'https://api.netlify.com/sites/test-site-id',
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        text: async () => '',
      } as Response));
      
      // Initialize service
      await service.initialize({ 
        token: 'test-token', 
        siteId: 'test-site-id',
        buildDir: 'dist',
      });
      
      const result = await service.getSiteInfo();
      
      // Verify result
      expect(result).not.toBeNull();
      expect(result?.siteId).toBe('test-site-id');
      expect(result?.url).toBe('https://test-site.netlify.app');
      
      // Verify API call
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as any).mock.calls[0][0]).toContain('/sites/test-site-id');
    });
    
    test('should handle API errors', async () => {
      // Mock API error
      (global.fetch as ReturnType<typeof mock<typeof fetch>>).mockImplementation(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Site not found' }),
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: 'https://api.netlify.com',
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        text: async () => '',
      } as Response));
      
      // Initialize service
      await service.initialize({ 
        token: 'test-token', 
        siteId: 'nonexistent-site-id',
        buildDir: 'dist',
      });
      
      const result = await service.getSiteInfo();
      
      // Verify result
      expect(result).toBeNull();
    });
  });
});