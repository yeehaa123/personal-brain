/**
 * Website Tools for MCP
 * 
 * This file contains the tool definitions for the WebsiteContext
 * following the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type { z } from 'zod';

import type { WebsiteContext } from '@/contexts';
import type { ResourceDefinition } from '@/contexts/contextInterface';
import { Logger } from '@/utils/logger';
import { 
  LandingPageGenerationToolSchema,
  LandingPageQualityAssessmentToolSchema,
  WebsiteBuildToolSchema, 
  WebsitePromoteToolSchema,
  WebsiteStatusToolSchema, 
} from '@website/schemas/websiteToolSchemas';

/**
 * Service responsible for providing MCP tools for website management
 * Follows the Component Interface Standardization pattern
 */
export class WebsiteToolService {
  /** The singleton instance */
  private static instance: WebsiteToolService | null = null;
  
  /** Logger instance for this class */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of WebsiteToolService
   * 
   * @returns The shared WebsiteToolService instance
   */
  public static getInstance(): WebsiteToolService {
    if (!WebsiteToolService.instance) {
      WebsiteToolService.instance = new WebsiteToolService();
    }
    return WebsiteToolService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    WebsiteToolService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @returns A new WebsiteToolService instance
   */
  public static createFresh(): WebsiteToolService {
    return new WebsiteToolService();
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.logger.debug('WebsiteToolService initialized', { context: 'WebsiteToolService' });
  }
  
  /**
   * Get the MCP tools for the website context
   * 
   * @param context The website context
   * @returns Array of MCP tools
   */
  getTools(context: WebsiteContext): ResourceDefinition[] {
    return [
      // generate_landing_page
      this.generateLandingPageTool(context),
      
      // edit_landing_page
      this.editLandingPageTool(context),
      
      // assess_landing_page
      this.assessLandingPageTool(context),
      
      // build_website
      this.buildWebsiteTool(context),
      
      // deploy_website (merged with build_website for simplicity)
      
      // promote_website
      this.promoteWebsiteTool(context),
      
      // get_website_status
      this.getWebsiteStatusTool(context),
    ];
  }

  /**
   * Get the Zod schema for a tool based on its name
   * 
   * @param tool Tool definition with parameters
   * @returns Zod schema object for tool parameters
   */
  getToolSchema(tool: { name?: string }): Record<string, z.ZodTypeAny> {
    // Return appropriate Zod schema based on tool name
    switch (tool.name) {
    case 'generate_landing_page':
      return LandingPageGenerationToolSchema.shape;
      
    case 'edit_landing_page':
      // No parameters needed for edit_landing_page
      return {};

    case 'assess_landing_page':
      return LandingPageQualityAssessmentToolSchema.shape;

    case 'build_website':
      return WebsiteBuildToolSchema.shape;

    case 'promote_website':
      return WebsitePromoteToolSchema.shape;

    case 'get_website_status':
      return WebsiteStatusToolSchema.shape;

    default:
      // For unknown tools, return an empty schema
      return {};
    }
  }

  /**
   * Create the generate_landing_page tool
   */
  private generateLandingPageTool(context: WebsiteContext): ResourceDefinition {
    return {
      protocol: 'website',
      path: 'generate_landing_page',
      name: 'generate_landing_page',
      description: 'Generates a landing page from profile data (without holistic editing)',
      handler: async (_params: Record<string, unknown>) => {
        // Call context without options - generation is a simple process without options now
        const result = await context.generateLandingPage();

        if (!result.success) {
          throw new Error(`Failed to generate landing page: ${result.message}`);
        }

        return {
          success: result.success,
          message: result.message,
          data: result.data,
        };
      },
    };
  }
  
  /**
   * Create the edit_landing_page tool
   */
  private editLandingPageTool(context: WebsiteContext): ResourceDefinition {
    return {
      protocol: 'website',
      path: 'edit_landing_page',
      name: 'edit_landing_page',
      description: 'Performs holistic editing on an existing landing page for consistency across sections',
      handler: async (_params: Record<string, unknown>) => {
        // Call context to edit the landing page
        const result = await context.editLandingPage();

        if (!result.success) {
          throw new Error(`Failed to edit landing page: ${result.message}`);
        }

        return {
          success: result.success,
          message: result.message,
          data: result.data,
        };
      },
    };
  }

  /**
   * Create the assess_landing_page tool
   */
  private assessLandingPageTool(context: WebsiteContext): ResourceDefinition {
    return {
      protocol: 'website',
      path: 'assess_landing_page',
      name: 'assess_landing_page',
      description: 'Assesses the quality of an existing landing page and optionally applies recommendations',
      handler: async (params: Record<string, unknown>) => {
        // Parse parameters using Zod for safe validation
        const validatedParams = LandingPageQualityAssessmentToolSchema.safeParse(params);
        
        if (!validatedParams.success) {
          throw new Error(`Invalid parameters: ${validatedParams.error.message}`);
        }
        
        // Extract validated options
        const options = validatedParams.data;
        
        // Call context with validated options
        const result = await context.assessLandingPage(options);

        if (!result.success) {
          throw new Error(`Failed to assess landing page: ${result.message}`);
        }

        return {
          success: result.success,
          message: result.message,
          data: result.data,
          assessments: result.assessments,
        };
      },
    };
  }
  
  /**
   * Create the build_website tool
   */
  private buildWebsiteTool(context: WebsiteContext): ResourceDefinition {
    return {
      protocol: 'website',
      path: 'build_website',
      name: 'build_website',
      description: 'Builds the website using Astro and deploys to preview',
      handler: async (params: Record<string, unknown>) => {
        const environment = params['environment'] ? String(params['environment']) : 'preview';
        const generateBeforeBuild = params['generateBeforeBuild'] !== false; // default to true

        // Generate landing page first if requested
        if (generateBeforeBuild) {
          const generateResult = await context.generateLandingPage();
          if (!generateResult.success) {
            this.logger.warn('Failed to generate landing page before build', {
              error: generateResult.message,
              context: 'WebsiteToolService',
            });
            // Continue with build even if generation fails
          }
        }

        // Build and deploy website
        const result = await context.handleWebsiteBuild();

        return {
          success: result.success,
          message: result.message,
          environment,
          url: result.url,
          path: result.path,
        };
      },
    };
  }

  /**
   * Create the promote_website tool
   */
  private promoteWebsiteTool(context: WebsiteContext): ResourceDefinition {
    return {
      protocol: 'website',
      path: 'promote_website',
      name: 'promote_website',
      description: 'Promotes the preview website to production',
      handler: async (_params: Record<string, unknown>) => {
        const result = await context.handleWebsitePromote();

        return {
          success: result.success,
          message: result.message,
          url: result.url,
        };
      },
    };
  }

  /**
   * Create the get_website_status tool
   */
  private getWebsiteStatusTool(context: WebsiteContext): ResourceDefinition {
    return {
      protocol: 'website',
      path: 'get_website_status',
      name: 'get_website_status',
      description: 'Gets the status of the website environments',
      handler: async (params: Record<string, unknown>) => {
        const environment = params['environment'] ? String(params['environment']) : 'preview';
        
        const result = await context.handleWebsiteStatus(environment);

        if (!result.success) {
          throw new Error(`Failed to get website status: ${result.message}`);
        }

        return {
          success: result.success,
          message: result.message,
          data: result.data,
        };
      },
    };
  }
}