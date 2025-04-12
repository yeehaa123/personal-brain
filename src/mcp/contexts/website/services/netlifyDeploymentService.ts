import fs from 'fs/promises';
import path from 'path';

import { ValidationError } from '@/utils/errorUtils';

import { BaseDeploymentService, type DeploymentConfig, type DeploymentResult, type DeploymentServiceTestHelpers } from './deploymentService';

/**
 * Netlify-specific deployment configuration
 */
export interface NetlifyDeploymentConfig extends DeploymentConfig {
  token: string; // Netlify API token (required)
  siteId?: string; // Netlify site ID (required for existing sites)
  siteName?: string; // Site name for new sites
  team?: string; // Team name or ID
  buildDir: string; // Directory containing built site (default: dist)
}

/**
 * Implementation of DeploymentService for Netlify using the Netlify API
 */
export class NetlifyDeploymentService extends BaseDeploymentService implements DeploymentServiceTestHelpers {
  private static instance: NetlifyDeploymentService | null = null;
  private apiUrl = 'https://api.netlify.com/api/v1';
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): NetlifyDeploymentService {
    if (!NetlifyDeploymentService.instance) {
      NetlifyDeploymentService.instance = new NetlifyDeploymentService();
    }
    return NetlifyDeploymentService.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    NetlifyDeploymentService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(): NetlifyDeploymentService {
    return new NetlifyDeploymentService();
  }
  
  /**
   * Get the name of this deployment provider
   */
  getProviderName(): string {
    return 'Netlify';
  }
  
  /**
   * Test helper to set deploy result
   */
  private mockDeployResult: DeploymentResult | null = null;
  setDeploySuccess(success: boolean, url?: string): void {
    this.mockDeployResult = {
      success,
      message: success ? 'Deployment successful' : 'Deployment failed',
      url,
    };
  }
  
  /**
   * Test helper to set site info
   */
  private mockSiteInfo: { siteId: string; url: string } | null = null;
  setSiteInfo(siteId: string, url: string): void {
    this.mockSiteInfo = { siteId, url };
  }
  
  /**
   * Validate Netlify configuration
   */
  protected validateConfig(): void {
    const config = this.config as NetlifyDeploymentConfig;
    
    // Netlify API token is required
    if (!config.token) {
      throw new ValidationError('Netlify API token is required');
    }
    
    // Either siteId or siteName is required
    if (!config.siteId && !config.siteName) {
      throw new ValidationError('Either siteId or siteName is required for Netlify deployment');
    }
    
    // Ensure buildDir has a default if not specified
    if (!config.buildDir) {
      config.buildDir = 'dist';
    }
  }
  
  /**
   * Make an authenticated API request to Netlify
   */
  private async fetchApi(
    endpoint: string, 
    options: { 
      method?: string; 
      body?: FormData | string | object; 
      headers?: Record<string, string> 
    } = {},
  ) {
    const config = this.config as NetlifyDeploymentConfig;
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
    
    // Create headers for the request
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      ...options.headers,
    };
    
    // If body is an object, stringify it and set content-type to application/json
    let body = options.body;
    
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      requestHeaders['Content-Type'] = 'application/json';
    }
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: requestHeaders,
        body,
      });
      
      if (!response.ok) {
        // Try to parse error response
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || `API error: ${response.status} ${response.statusText}`;
        } catch {
          errorText = `API error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorText);
      }
      
      // Return null for 204 No Content
      if (response.status === 204) {
        return null;
      }
      
      // Parse JSON response
      return await response.json();
    } catch (error) {
      this.logger.error('Netlify API request failed', {
        error,
        context: 'NetlifyDeploymentService',
        endpoint,
      });
      throw error;
    }
  }
  
  /**
   * Create or get a site on Netlify
   */
  private async getOrCreateSite(): Promise<{ site_id: string; ssl_url: string; url: string }> {
    const config = this.config as NetlifyDeploymentConfig;
    
    try {
      // If we have a site ID, get the site
      if (config.siteId) {
        return await this.fetchApi(`/sites/${config.siteId}`);
      }
      
      // Otherwise, create a new site
      type CreateSitePayload = {
        name?: string;
        team_id?: string;
      };
      
      const createSitePayload: CreateSitePayload = {
        name: config.siteName,
      };
      
      // Add team if specified
      if (config.team) {
        createSitePayload['team_id'] = config.team;
      }
      
      const site = await this.fetchApi('/sites', {
        method: 'POST',
        body: createSitePayload,
      });
      
      // Update config with the new site ID
      config.siteId = site.site_id;
      
      return site;
    } catch (error) {
      this.logger.error('Failed to get or create Netlify site', {
        error,
        context: 'NetlifyDeploymentService',
      });
      throw error;
    }
  }
  
  /**
   * Prepare site directory for deployment (zip method)
   */
  private async prepareSiteForDeployment(sitePath: string): Promise<{ directory: string; files: string[] }> {
    const config = this.config as NetlifyDeploymentConfig;
    const buildPath = path.resolve(sitePath, config.buildDir);
    
    this.logger.info('Preparing site for deployment', {
      context: 'NetlifyDeploymentService',
      sitePath,
      buildPath,
      buildDir: config.buildDir,
    });
    
    try {
      // Check if build directory exists
      try {
        await fs.access(buildPath);
        this.logger.info('Build directory exists', { buildPath });
      } catch (accessError) {
        this.logger.error('Build directory not found', { 
          buildPath,
          error: accessError,
          errorCode: accessError instanceof Error && 'code' in accessError ? (accessError as {code: string}).code : 'unknown',
        });
        throw new Error(`Build directory not found: ${buildPath}. Make sure you've run 'website-build' first.`);
      }
      
      // Get list of files in the build directory
      const files = await this.listFilesRecursively(buildPath);
      
      this.logger.info(`Found ${files.length} files for deployment`, { 
        fileCount: files.length,
        firstFewFiles: files.slice(0, 5),
      });
      
      return {
        directory: buildPath,
        files,
      };
    } catch (error) {
      this.logger.error('Failed to prepare site for deployment', {
        error,
        context: 'NetlifyDeploymentService',
        sitePath,
        buildPath,
      });
      throw error;
    }
  }
  
  /**
   * List files recursively in a directory
   */
  private async listFilesRecursively(dir: string, baseDir: string = dir): Promise<string[]> {
    const files: string[] = [];
    
    // Read directory contents
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively list files in subdirectory
        const subDirFiles = await this.listFilesRecursively(fullPath, baseDir);
        files.push(...subDirFiles);
      } else {
        // Add relative path from base directory
        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }
    
    return files;
  }
  
  /**
   * Create multipart form data with all site files
   */
  private async createDeployFormData(directory: string, files: string[]): Promise<FormData> {
    const formData = new FormData();
    
    // Add function file (required by Netlify API)
    formData.append('function', new Blob([''], { type: 'application/javascript' }), 'function.js');
    
    // Add each file
    for (const relativePath of files) {
      const fullPath = path.join(directory, relativePath);
      const fileContent = await fs.readFile(fullPath);
      
      // Use correct mime type based on extension
      const mimeType = this.getMimeType(relativePath);
      
      formData.append(
        `file-${relativePath}`,
        new Blob([fileContent], { type: mimeType }),
        relativePath,
      );
    }
    
    return formData;
  }
  
  /**
   * Get mime type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.eot': 'application/vnd.ms-fontobject',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ico': 'image/x-icon',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * Deploy website to Netlify
   * @param sitePath Path to the website project root (containing the build directory)
   */
  async deploy(sitePath: string): Promise<DeploymentResult> {
    // For testing
    if (this.mockDeployResult) {
      return this.mockDeployResult;
    }
    
    if (!this.isConfigured()) {
      const config = this.config as NetlifyDeploymentConfig;
      this.logger.error('Netlify deployment service not properly configured', {
        context: 'NetlifyDeploymentService',
        hasToken: Boolean(config.token),
        hasSiteId: Boolean(config.siteId),
        hasSiteName: Boolean(config.siteName),
        buildDir: config.buildDir,
      });
      
      return {
        success: false,
        message: 'Netlify deployment service not properly configured. Check your NETLIFY_TOKEN and either NETLIFY_SITE_ID or NETLIFY_SITE_NAME in your environment variables.',
        logs: 'Missing required configuration. Please run "website-config" to check your current configuration.',
      };
    }
    
    try {
      this.logger.info('Starting Netlify deployment process', {
        context: 'NetlifyDeploymentService',
        sitePath,
        config: this.config,
      });
      
      // Step 1: Get or create the site
      try {
        const site = await this.getOrCreateSite();
        this.logger.info('Successfully retrieved/created Netlify site', {
          siteId: site.site_id,
          siteUrl: site.ssl_url || site.url,
        });
      
        // Step 2: Prepare the site for deployment
        const { directory, files } = await this.prepareSiteForDeployment(sitePath);
        
        if (files.length === 0) {
          return {
            success: false,
            message: `No files found in build directory: ${directory}. Make sure you've run 'website-build' first.`,
            logs: `Build directory exists at ${directory} but contains no files.`,
          };
        }
        
        // Step 3: Create form data with all files
        this.logger.info('Creating form data for deployment', {
          fileCount: files.length,
          directory,
        });
        
        try {
          const formData = await this.createDeployFormData(directory, files);
          
          // Step 4: Deploy the site
          this.logger.info(`Deploying ${files.length} files to Netlify site ${site.site_id}`, {
            context: 'NetlifyDeploymentService',
            siteId: site.site_id,
          });
          
          // Use the site deploy endpoint
          const deployResult = await this.fetchApi(`/sites/${site.site_id}/deploys`, {
            method: 'POST',
            body: formData,
          });
          
          this.logger.info('Netlify deployment created', {
            context: 'NetlifyDeploymentService',
            deployId: deployResult.id,
            url: deployResult.ssl_url || deployResult.url,
          });
          
          return {
            success: true,
            message: 'Successfully deployed to Netlify',
            url: deployResult.ssl_url || deployResult.url,
            logs: `Deployed ${files.length} files to ${deployResult.ssl_url || deployResult.url}`,
          };
        } catch (formError) {
          this.logger.error('Error creating or sending form data', {
            error: formError,
            context: 'NetlifyDeploymentService',
            fileCount: files.length,
          });
          throw new Error(`Failed to upload files to Netlify: ${formError instanceof Error ? formError.message : 'Unknown error'}`);
        }
      } catch (siteError) {
        this.logger.error('Error with Netlify site', {
          error: siteError,
          context: 'NetlifyDeploymentService',
        });
        throw new Error(`Failed to prepare Netlify site: ${siteError instanceof Error ? siteError.message : 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.error('Error deploying to Netlify', {
        error,
        context: 'NetlifyDeploymentService',
        sitePath,
        errorDetails: error instanceof Error ? { message: error.message, stack: error.stack } : 'Unknown error',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during Netlify deployment',
        logs: error instanceof Error ? error.stack : 'No detailed error information available.',
      };
    }
  }
  
  /**
   * Get information about the deployed site
   */
  async getSiteInfo(): Promise<{ siteId: string; url: string } | null> {
    // For testing
    if (this.mockSiteInfo) {
      return this.mockSiteInfo;
    }
    
    if (!this.isConfigured()) {
      return null;
    }
    
    const config = this.config as NetlifyDeploymentConfig;
    
    // Need site ID to get site info
    if (!config.siteId) {
      return null;
    }
    
    try {
      const site = await this.fetchApi(`/sites/${config.siteId}`);
      
      return {
        siteId: site.site_id,
        url: site.ssl_url || site.url,
      };
    } catch (error) {
      this.logger.error('Error getting Netlify site info', {
        error,
        context: 'NetlifyDeploymentService',
        siteId: config.siteId,
      });
      
      return null;
    }
  }
}

export default NetlifyDeploymentService;