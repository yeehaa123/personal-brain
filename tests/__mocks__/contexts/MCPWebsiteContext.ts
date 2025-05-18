/**
 * Mock implementation of MCPWebsiteContext for testing
 * 
 * This mock provides the necessary interface for testing websiteContextMessaging
 * while being compatible with the MCP context pattern.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mock } from 'bun:test';

import type { MCPContext, MCPStorageInterface } from '@/contexts/MCPContext';
import type { MCPWebsiteContext, MCPWebsiteContextConfig, MCPWebsiteContextDependencies } from '@/contexts/website';
import type { WebsiteFormatter } from '@/contexts/website/formatters';
import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import type { AstroContentService } from '@/contexts/website/services/astroContentService';
import type { WebsiteDeploymentManager } from '@/contexts/website/services/deployment';
import type { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { WebsiteIdentityService } from '@/contexts/website/services/websiteIdentityService';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import type { Logger } from '@/utils/logger';
import { createTestLandingPageData } from '@test/helpers';

/**
 * Mock MCPStorageInterface implementation for testing
 */
class MockMCPStorage implements MCPStorageInterface {
  private items = new Map<string, Record<string, unknown>>();
  
  async create(item: Record<string, unknown>): Promise<string> {
    const id = String(item['id'] || `id-${Date.now()}`);
    this.items.set(id, { ...item, id });
    return id;
  }
  
  async read(id: string): Promise<Record<string, unknown> | null> {
    return this.items.get(id) || null;
  }
  
  async update(id: string, updates: Record<string, unknown>): Promise<boolean> {
    const existing = this.items.get(id);
    if (!existing) return false;
    this.items.set(id, { ...existing, ...updates });
    return true;
  }
  
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  
  async search(criteria: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    return Array.from(this.items.values()).filter(item => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value);
    });
  }
  
  async list(options?: { limit?: number; offset?: number }): Promise<Record<string, unknown>[]> {
    const items = Array.from(this.items.values());
    if (!options) return items;
    const { limit, offset = 0 } = options;
    return items.slice(offset, limit ? offset + limit : undefined);
  }
  
  async count(criteria?: Record<string, unknown>): Promise<number> {
    if (!criteria) return this.items.size;
    const results = await this.search(criteria);
    return results.length;
  }
}

/**
 * Mock implementation of MCPWebsiteContext for testing
 */
export class MockMCPWebsiteContext implements Partial<MCPWebsiteContext> {
  private static instance: MockMCPWebsiteContext | null = null;
  
  // MCPContext properties
  contextImpl!: MCPContext;
  
  // Required properties from MCPWebsiteContext
  logger!: Logger;
  storage!: MCPStorageInterface;
  formatter!: WebsiteFormatter;
  astroContentService!: AstroContentService;
  landingPageGenerationService!: LandingPageGenerationService;
  mediator!: ContextMediator;
  deploymentManager!: WebsiteDeploymentManager;
  identityService!: WebsiteIdentityService;
  
  // Standard website context methods as mocks
  generateLandingPage = mock(async () => {
    return {
      success: true,
      message: 'Landing page generated',
      data: createTestLandingPageData({
        title: 'Test User - Personal Website',
        name: 'Test Name',
        tagline: 'Test Tagline',
      }),
    };
  });
  
  buildWebsite = mock(async () => {
    return {
      success: true,
      message: 'Website built successfully',
      output: 'Build output',
    };
  });
  
  handleWebsiteBuild = mock(async () => {
    return {
      success: true,
      message: 'Website built successfully',
      path: '/path/to/build',
      url: 'http://example.com',
    };
  });
  
  handleWebsitePromote = mock(async () => {
    return {
      success: true,
      message: 'Website promoted successfully',
      url: 'http://example.com',
    };
  });
  
  getWebsiteStatus = mock(async () => {
    return {
      status: 'deployed',
      message: 'Website is deployed',
      url: 'http://example.com',
      fileCount: 42,
    };
  });
  
  getContextName = mock(() => 'website');
  getContextVersion = mock(() => '1.0.0');
  initialize = mock(async () => true);
  cleanup = mock(async () => {});
  
  getConfig = mock(async () => ({
    deployment: {
      type: 'local-dev' as const,
      previewPort: 3000,
      livePort: 4000,
    },
    siteName: 'Test Site',
    siteUrl: 'http://example.com',
    title: 'Test Title',
    description: 'Test Description',
    author: 'Test Author',
    baseUrl: 'http://example.com',
    astroProjectPath: '/test/path',
  }));
  
  getLandingPageData = mock(async () => {
    return createTestLandingPageData({
      title: 'Test Landing Page',
      name: 'Test Name',
      tagline: 'Test Tagline',
    });
  });
  
  // Constructor
  private constructor(
    _config: MCPWebsiteContextConfig = {},
    dependencies: MCPWebsiteContextDependencies = {},
  ) {
    // Initialize storage with the mock if not provided  
    this.storage = new MockMCPStorage();
    
    // Create a mock contextImpl that satisfies the interface
    this.contextImpl = {
      getContextName: () => 'MockWebsiteBrain',
      getContextVersion: () => '1.0.0',
      initialize: async () => true,
      isReady: () => true,
      getStatus: () => ({ name: 'MockWebsiteBrain', version: '1.0.0', ready: true, message: 'Mock ready' }),
      cleanup: async () => {},
      resources: [],
      tools: [],
      resourceHandlers: {},
      toolHandlers: {},
      mcpServer: {} as McpServer,
      getMcpServer: () => ({} as McpServer),
      getStorage: () => this.storage,
      getFormatter: () => this.formatter,
      registerOnServer: () => true,
      getCapabilities: () => ({ resources: [], tools: [], features: [] }),
    } as unknown as MCPContext;
    
    // Set any dependencies
    if (dependencies.logger) this.logger = dependencies.logger;
    if (dependencies.formatter) this.formatter = dependencies.formatter;
    if (dependencies.astroContentService) this.astroContentService = dependencies.astroContentService;
    if (dependencies.landingPageGenerationService) this.landingPageGenerationService = dependencies.landingPageGenerationService;
    if (dependencies.mediator) this.mediator = dependencies.mediator;
    if (dependencies.deploymentManager) this.deploymentManager = dependencies.deploymentManager;
    if (dependencies.identityService) this.identityService = dependencies.identityService;
  }
  
  /**
   * Singleton pattern methods
   */
  public static getInstance(
    config: MCPWebsiteContextConfig = {},
    dependencies: MCPWebsiteContextDependencies = {},
  ): MockMCPWebsiteContext {
    if (!MockMCPWebsiteContext.instance) {
      MockMCPWebsiteContext.instance = new MockMCPWebsiteContext(config, dependencies);
    }
    return MockMCPWebsiteContext.instance;
  }
  
  public static resetInstance(): void {
    MockMCPWebsiteContext.instance = null;
  }
  
  public static createFresh(
    config: MCPWebsiteContextConfig = {},
    dependencies: MCPWebsiteContextDependencies = {},
  ): MockMCPWebsiteContext {
    return new MockMCPWebsiteContext(config, dependencies);
  }
  
  // Additional MCPWebsiteContext methods
  getDeploymentManager = mock(() => ({
    getEnvironmentStatus: mock(async (env: 'preview' | 'live') => ({
      environment: env,
      buildStatus: 'built',
      serverStatus: 'running',
      fileCount: 10,
      domain: 'example.com',
      accessStatus: 'accessible',
      url: 'http://example.com',
    })),
  } as unknown as WebsiteDeploymentManager));
  
  getStorage = mock(() => this.storage);
  getFormatter = mock(() => this.formatter);
  
  // Add any other specific methods that the tests might need
  promoteWebsite = mock(async () => {
    return {
      success: true,
      message: 'Website promoted',
      url: 'http://example.com',
    };
  });
  
  assessLandingPage = mock(async () => {
    return {
      success: true,
      message: 'Landing page assessed',
    };
  });
  
  regenerateFailedLandingPageSections = mock(async () => {
    return {
      success: true,
      message: 'Sections regenerated',
      data: createTestLandingPageData(),
    };
  });
  
  // Required methods from MCPWebsiteContext
  getStatus = mock(() => ({ name: 'MockWebsiteBrain', version: '1.0.0', ready: true, message: 'Mock ready' }));
  isReady = mock(() => true);
  getMcpServer = mock(() => ({} as McpServer));
  
  // Missing methods required by MCPWebsiteContext
  initializeMcpComponents = mock(() => {});
  registerOnServer = mock(() => true);
  getCapabilities = mock(() => ({ resources: [], tools: [], features: [] }));
  saveLandingPageData = mock(async () => {});
  getLastGenerationStatus = mock(() => ({
    status: 'completed',
    timestamp: new Date(),
    message: 'Last generation completed',
  }));
  isGenerating = mock(() => false);
  getAstroContentService = mock(() => this.astroContentService);
  getIdentity = mock(async () => null);
  updateIdentity = mock(async () => ({
    success: true,
    message: 'Identity updated',
  }));
  editLandingPage = mock(async () => ({
    success: true,
    message: 'Landing page edited',
    data: createTestLandingPageData(),
  }));
  generateIdentity = mock(async () => ({
    success: true,
    message: 'Identity generated',
    identity: {} as WebsiteIdentityData,
  }));
}