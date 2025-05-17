import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { WebsiteStorageAdapter } from '@/contexts/website/adapters/websiteStorageAdapter';
import type { WebsiteFormatter } from '@/contexts/website/formatters';
import { MCPWebsiteContext } from '@/contexts/website/MCPWebsiteContext';
import type { MCPWebsiteContextDependencies } from '@/contexts/website/MCPWebsiteContext';
import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import type { AstroContentService } from '@/contexts/website/services/astroContentService';
import type { WebsiteDeploymentManager } from '@/contexts/website/services/deployment/deploymentManager';
import type { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { WebsiteIdentityService } from '@/contexts/website/services/websiteIdentityService';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import { ContextMediator } from '@/protocol/messaging/contextMediator';
import type { Logger } from '@/utils/logger';
// Import standardized mocks
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockLocalDevDeploymentManager } from '@test/__mocks__/contexts/website/services/deployment/localDevDeploymentManager';
import { MockLandingPageGenerationService } from '@test/__mocks__/contexts/website/services/landingPageGenerationService';
import { MockWebsiteIdentityService } from '@test/__mocks__/contexts/website/services/websiteIdentityService';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/websiteStorageAdapter';
import { MockLogger } from '@test/__mocks__/core/logger';
import type { LandingPageData } from '@website/schemas';

describe('MCPWebsiteContext', () => {
  // Sample landing page data for testing
  const mockLandingPageData: LandingPageData = {
    title: 'Test Website',
    description: 'This is a test website',
    name: 'Test User',
    tagline: 'Test Tagline',
    sectionOrder: ['hero', 'services'],
    
    hero: {
      headline: 'Welcome to My Website',
      subheading: 'This is a test website',
      ctaText: 'Get Started',
      ctaLink: '#contact',
    },
    
    services: {
      title: 'Our Services',
      items: [
        {
          title: 'Service 1',
          description: 'We offer amazing services',
        },
      ],
    },
    
    // Required sections with minimal data
    problemStatement: { title: 'Problems', description: 'We solve problems', enabled: false },
    process: { title: 'Process', steps: [], enabled: false },
    caseStudies: { title: 'Case Studies', items: [], enabled: false },
    expertise: { title: 'Expertise', items: [], enabled: false },
    about: { title: 'About', content: 'About us', enabled: false },
    pricing: { title: 'Pricing', tiers: [], enabled: false },
    faq: { title: 'FAQ', items: [], enabled: false },
    cta: { title: 'CTA', subtitle: 'Contact us', buttonText: 'Contact', buttonLink: '#contact', enabled: false },
    footer: { enabled: false },
  };

  // Test dependencies
  let mockStorage: WebsiteStorageAdapter;
  let mockAstroService: AstroContentService;
  let mockLandingPageService: LandingPageGenerationService;
  let mockDeploymentManager: WebsiteDeploymentManager;
  let mockIdentityService: WebsiteIdentityService;
  let mockMediator: ContextMediator;
  let logger: Logger;
  let context: MCPWebsiteContext;

  beforeEach(() => {
    // Reset all mock instances
    MCPWebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
    MockAstroContentService.resetInstance();
    MockLandingPageGenerationService.resetInstance();
    MockLocalDevDeploymentManager.resetInstance();
    MockWebsiteIdentityService.resetInstance();

    // Create fresh mocks
    mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockAstroService = MockAstroContentService.createFresh();
    mockLandingPageService = MockLandingPageGenerationService.createFresh();
    mockDeploymentManager = MockLocalDevDeploymentManager.createFresh();
    mockIdentityService = MockWebsiteIdentityService.createFresh();
    mockMediator = ContextMediator.getInstance();
    logger = MockLogger.createFresh({ silent: true });

    // Create context with dependencies
    const dependencies: MCPWebsiteContextDependencies = {
      storage: mockStorage,
      formatter: {
        format: (data: unknown) => JSON.stringify(data),
      } as WebsiteFormatter,
      astroContentService: mockAstroService,
      landingPageGenerationService: mockLandingPageService,
      mediator: mockMediator,
      deploymentManager: mockDeploymentManager,
      identityService: mockIdentityService,
      logger,
    };

    context = MCPWebsiteContext.createFresh({}, dependencies);
  });

  describe('Landing Page Generation', () => {
    test('generates a new landing page from profile data', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockLandingPageService, 'generateLandingPageData').mockResolvedValue({
        landingPage: mockLandingPageData,
        generationStatus: {},
      });

      // Act
      const result = await context.generateLandingPage({ useIdentity: false });
      
      // Assert: Should generate successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLandingPageData);
      
      // Assert: Should save the generated data
      expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(mockLandingPageData);
    });

    test('generates landing page with brand identity when requested', async () => {
      // Arrange
      const mockIdentity = { 
        name: 'Test Brand', 
        tagline: 'Test Tagline', 
      } as unknown as WebsiteIdentityData;
      
      // Create spies before initialization
      const getIdentitySpy = spyOn(mockIdentityService, 'getIdentity').mockResolvedValue(mockIdentity);
      const generateLandingPageDataSpy = spyOn(mockLandingPageService, 'generateLandingPageData').mockResolvedValue({
        landingPage: mockLandingPageData,
        generationStatus: {},
      });

      await context.initialize();

      // Act
      const result = await context.generateLandingPage({ useIdentity: true });
      
      // Assert: Should use identity data  
      expect(result.success).toBe(true);
      // Check that getIdentity was called
      expect(getIdentitySpy).toHaveBeenCalled();
      // Verify the service was called with the correct parameters
      expect(generateLandingPageDataSpy).toHaveBeenCalled();
      // Check that the method was called with the identity
      expect(generateLandingPageDataSpy).toHaveBeenCalledWith(
        mockIdentity,
      );
    });

    test('handles generation failure gracefully', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockLandingPageService, 'generateLandingPageData').mockResolvedValue({
        landingPage: null,
        generationStatus: { 
          hero: { status: SectionGenerationStatus.Failed, error: 'Generation failed' },
        },
      });

      // Act
      const result = await context.generateLandingPage();
      
      // Assert: Should report failure
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate landing page');
      
      // Assert: Should not save anything
      expect(mockStorage.saveLandingPageData).not.toHaveBeenCalled();
    });
  });

  describe('Landing Page Editing', () => {
    test('edits existing landing page for consistency', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData);
      
      const editedData = { ...mockLandingPageData, edited: true };
      spyOn(mockLandingPageService, 'editLandingPage').mockResolvedValue(editedData);

      // Act
      const result = await context.editLandingPage();
      
      // Assert: Should edit successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual(editedData);
      
      // Assert: Should save edited data
      expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(editedData);
    });

    test('cannot edit when no landing page exists', async () => {
      // Arrange
      await context.initialize();
      // No landing page data set

      // Act
      const result = await context.editLandingPage();
      
      // Assert: Should fail with appropriate message
      expect(result.success).toBe(false);
      expect(result.message).toBe('No landing page data to edit');
    });
  });

  describe('Website Building', () => {
    test('builds website to preview environment', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData);
      
      spyOn(mockAstroService, 'writeLandingPageContent').mockResolvedValue(true);
      spyOn(mockAstroService, 'runAstroCommand').mockResolvedValue({
        success: true,
        output: 'Build output',
      });

      // Act
      const result = await context.buildWebsite();
      
      // Assert: Should build successfully
      expect(result.success).toBe(true);
      expect(result.output).toBe('Build output');
      
      // Assert: Should follow the build process
      expect(mockAstroService.writeLandingPageContent).toHaveBeenCalledWith(mockLandingPageData);
      expect(mockAstroService.runAstroCommand).toHaveBeenCalledWith('build');
    });

    test('cannot build when no landing page exists', async () => {
      // Arrange
      await context.initialize();
      // No landing page data set

      // Act
      const result = await context.buildWebsite();
      
      // Assert: Should fail with appropriate message
      expect(result.success).toBe(false);
      expect(result.message).toBe('No landing page data available to build');
    });

    test('handles build failure from Astro', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData);
      
      spyOn(mockAstroService, 'writeLandingPageContent').mockResolvedValue(true);
      spyOn(mockAstroService, 'runAstroCommand').mockResolvedValue({
        success: false,
        output: 'Error output',
      });

      // Act
      const result = await context.buildWebsite();
      
      // Assert: Should report Astro build failure
      expect(result.success).toBe(false);
      expect(result.message).toContain('Astro build failed');
      expect(result.output).toBe('Error output');
    });
  });

  describe('Website Deployment', () => {
    test('promotes website from preview to live', async () => {
      // Arrange
      await context.initialize();
      
      spyOn(mockDeploymentManager, 'promoteToLive').mockResolvedValue({
        success: true,
        message: 'Promoted successfully',
        url: 'http://localhost:4322',
      });
      spyOn(mockDeploymentManager, 'startServers').mockResolvedValue(true);

      // Act
      const result = await context.promoteWebsite();
      
      // Assert: Should promote successfully
      expect(result.success).toBe(true);
      expect(result.url).toBe('http://localhost:4322');
      
      // Since startServers is optional in the interface, check if it exists first
      if (mockDeploymentManager.startServers) {
        expect(mockDeploymentManager.startServers).toHaveBeenCalled();
      }
    });

    test('retrieves deployment status for environments', async () => {
      // Arrange
      await context.initialize();
      
      spyOn(mockDeploymentManager, 'getEnvironmentStatus').mockResolvedValue({
        environment: 'preview',
        buildStatus: 'Built',
        fileCount: 10,
        serverStatus: 'Running',
        domain: 'localhost',
        accessStatus: 'Environment is ready',
        url: 'http://localhost:4321',
      });

      // Act
      const status = await context.getWebsiteStatus('preview');
      
      // Assert: Should return status information
      expect(status.status).toBe('Running');
      expect(status.url).toBe('http://localhost:4321');
      expect(status.fileCount).toBe(10);
    });
  });

  describe('Brand Identity', () => {
    test('retrieves existing brand identity', async () => {
      // Arrange
      const mockIdentity = { 
        name: 'Test Brand', 
        tagline: 'Test Tagline', 
      } as unknown as WebsiteIdentityData;
      
      // Create spy on the fresh instance
      const identitySpy = spyOn(mockIdentityService, 'getIdentity').mockResolvedValue(mockIdentity);
      
      await context.initialize();

      // Act
      const identity = await context.getIdentity();
      
      // Assert: Should return identity data
      expect(identitySpy).toHaveBeenCalled();
      expect(identity).toEqual(mockIdentity);
    });

    test('generates new brand identity', async () => {
      // Arrange
      const mockIdentity = { 
        name: 'New Brand', 
        tagline: 'New Tagline', 
      } as unknown as WebsiteIdentityData;
      
      spyOn(mockIdentityService, 'generateIdentity').mockResolvedValue(mockIdentity);
      
      await context.initialize();

      // Act
      const result = await context.generateIdentity();
      
      // Assert: Should generate successfully
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIdentity);
    });
  });

  describe('Quality Assessment', () => {
    test('assesses landing page quality and provides scores', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData);
      
      const mockAssessment = {
        overallScore: 0,
        sections: {},
        summary: 'Quality assessment completed',
      };
      
      spyOn(mockLandingPageService, 'assessLandingPageQuality').mockResolvedValue({
        landingPage: mockLandingPageData,
        assessments: mockAssessment.sections,
      });

      // Act
      const result = await context.assessLandingPage();
      
      // Assert: Should assess successfully
      expect(result.success).toBe(true);
      expect(result.qualityAssessment).toEqual(mockAssessment);
    });

    test('regenerates sections that failed quality assessment', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData);
      
      spyOn(mockLandingPageService, 'regenerateFailedSections').mockResolvedValue({
        success: true,
        message: 'Regenerated successfully',
        results: {
          attempted: 1,
          succeeded: 1,
          failed: 0,
          sections: { hero: { success: true, message: 'Regenerated' } },
        },
      });

      // Act
      const result = await context.regenerateFailedLandingPageSections();
      
      // Assert: Should regenerate successfully
      expect(result.success).toBe(true);
    });
  });

  describe('MCP Integration', () => {
    test('exposes website resources for MCP protocol', async () => {
      // Arrange & Act
      await context.initialize();
      const capabilities = context.getCapabilities();
      
      // Assert: Should provide expected resources
      expect(capabilities.resources).toHaveLength(3);
      const resourcePaths = capabilities.resources.map(r => r.path);
      expect(resourcePaths).toContain('config');
      expect(resourcePaths).toContain('landing-page');
      expect(resourcePaths).toContain('identity');
    });

    test('exposes website tools for MCP protocol', async () => {
      // Arrange & Act
      await context.initialize();
      const capabilities = context.getCapabilities();
      
      // Assert: Should provide expected tools
      expect(capabilities.tools).toHaveLength(9);
      const toolNames = capabilities.tools.map(t => t.name);
      expect(toolNames).toContain('generate_landing_page');
      expect(toolNames).toContain('edit_landing_page');
      expect(toolNames).toContain('build_website');
      expect(toolNames).toContain('promote_website');
    });
  });

  describe('Data Persistence', () => {
    test('saves and retrieves landing page data', async () => {
      // Arrange
      await context.initialize();
      
      // Act
      await context.saveLandingPageData(mockLandingPageData);
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData); // Simulate saved data
      const retrieved = await context.getLandingPageData();
      
      // Assert: Should persist and retrieve data
      expect(retrieved).toEqual(mockLandingPageData);
    });
  });

  describe('Error Handling', () => {
    test('handles astro build failures gracefully', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockStorage, 'getLandingPageData').mockResolvedValue(mockLandingPageData);
      
      spyOn(mockAstroService, 'writeLandingPageContent').mockResolvedValue(true);
      spyOn(mockAstroService, 'runAstroCommand').mockResolvedValue({
        success: false,
        output: 'Error output',
      });

      // Act
      const result = await context.buildWebsite();
      
      // Assert: Should report build failure
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('build');
    });

    test('handles service errors gracefully', async () => {
      // Arrange
      await context.initialize();
      spyOn(mockLandingPageService, 'generateLandingPageData').mockRejectedValue(
        new Error('Service error'),
      );

      // Act
      const result = await context.generateLandingPage();
      
      // Assert: Should catch and report error
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error generating landing page');
    });
  });
});