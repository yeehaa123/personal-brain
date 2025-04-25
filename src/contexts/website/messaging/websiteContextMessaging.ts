/**
 * Messaging-Enabled Website Context
 * 
 * This module extends the WebsiteContext with messaging capabilities,
 * allowing it to participate in cross-context communication.
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { ContextMediator } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { WebsiteContext } from '../websiteContext';
import type { LandingPageData, WebsiteConfig } from '../websiteStorage';

import { WebsiteMessageHandler } from './websiteMessageHandler';
import { WebsiteNotifier } from './websiteNotifier';

/**
 * Messaging-enabled extension of WebsiteContext
 */
export class WebsiteContextMessaging {
  private logger = Logger.getInstance();
  private notifier: WebsiteNotifier;
  private static instance: WebsiteContextMessaging | null = null;
  
  /**
   * Create a messaging-enabled wrapper for a WebsiteContext
   * 
   * @param websiteContext The website context to extend
   * @param mediator The context mediator for messaging
   */
  constructor(
    private websiteContext: WebsiteContext,
    mediator: ContextMediator,
  ) {
    // Create notifier
    this.notifier = new WebsiteNotifier(mediator);
    
    // Register message handler using the standardized pattern
    const messageHandler = WebsiteMessageHandler.getInstance({ websiteContext });
    const handler = messageHandler.getMessageHandlerFunction();
    mediator.registerHandler(ContextId.WEBSITE, handler);
    
    this.logger.debug('WebsiteContextMessaging initialized');
  }

  /**
   * Get the singleton instance (for dependency injection)
   */
  public static getInstance(
    websiteContext: WebsiteContext,
    mediator: ContextMediator,
  ): WebsiteContextMessaging {
    if (!WebsiteContextMessaging.instance) {
      WebsiteContextMessaging.instance = new WebsiteContextMessaging(websiteContext, mediator);
    }
    return WebsiteContextMessaging.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    WebsiteContextMessaging.instance = null;
  }

  /**
   * Create a fresh instance (for testing)
   */
  public static createFresh(
    websiteContext: WebsiteContext,
    mediator: ContextMediator,
  ): WebsiteContextMessaging {
    return new WebsiteContextMessaging(websiteContext, mediator);
  }
  
  /**
   * Get the underlying website context
   * @returns The website context
   */
  getContext(): WebsiteContext {
    return this.websiteContext;
  }
  
  /**
   * Generate a landing page with messaging support
   * 
   * @returns Result of the generation operation
   */
  async generateLandingPage(): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
    // Delegate to the original context
    const result = await this.websiteContext.generateLandingPage();
    
    // Notify other contexts if the landing page was generated successfully
    if (result.success && result.data) {
      await this.notifier.notifyWebsiteGenerated(
        'landing-page',
        { 
          type: 'landing-page',
          data: result.data,
        },
      );
    }
    
    return result;
  }
  
  /**
   * Build website with messaging support
   * 
   * @returns Result of the build operation
   */
  async buildWebsite(): Promise<{ success: boolean; message: string; output?: string }> {
    // Delegate to the original context
    const result = await this.websiteContext.buildWebsite();
    
    // Notify other contexts if the build was successful
    if (result.success) {
      await this.notifier.notifyWebsiteGenerated(
        'build',
        { 
          type: 'build', 
          output: result.output,
        },
      );
    }
    
    return result;
  }
  
  /**
   * Handle website build with messaging support
   * 
   * @returns Result of the build operation, with path to built files
   */
  async handleWebsiteBuild(): Promise<{ success: boolean; message: string; path?: string; url?: string }> {
    // Delegate to the original context
    const result = await this.websiteContext.handleWebsiteBuild();
    
    // Notify other contexts if the build was successful
    if (result.success && result.url) {
      await this.notifier.notifyWebsiteGenerated(
        'preview-build',
        { 
          type: 'preview',
          url: result.url,
          path: result.path,
        },
      );
    }
    
    return result;
  }
  
  /**
   * Handle website promotion with messaging support
   * 
   * @returns Result of the promotion operation
   */
  async handleWebsitePromote(): Promise<{ success: boolean; message: string; url?: string }> {
    // Delegate to the original context
    const result = await this.websiteContext.handleWebsitePromote();
    
    // Notify other contexts if the promotion was successful
    if (result.success && result.url) {
      await this.notifier.notifyWebsiteDeployed(
        'production',
        result.url,
        { type: 'production' },
      );
    }
    
    return result;
  }
  
  /**
   * Delegate all other methods to the original context
   */
  getContextName(): string {
    return this.websiteContext.getContextName();
  }
  
  getContextVersion(): string {
    return this.websiteContext.getContextVersion();
  }
  
  async initialize(): Promise<boolean> {
    return this.websiteContext.initialize();
  }
  
  setReadyState(ready: boolean): void {
    return this.websiteContext.setReadyState(ready);
  }
  
  async getConfig(): Promise<WebsiteConfig> {
    return this.websiteContext.getConfig();
  }
  
  async updateConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    // Delegate to the original context
    const config = await this.websiteContext.updateConfig(updates);
    
    // Could add notification here if needed in the future
    // await this.notifier.notifyWebsiteConfigUpdated(config);
    
    return config;
  }
  
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.websiteContext.getLandingPageData();
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    // Delegate to the original context
    await this.websiteContext.saveLandingPageData(data);
    
    // Could add notification here if needed
    // await this.notifier.notifyLandingPageDataSaved(data);
  }
  
  async handleWebsiteStatus(environment: string = 'preview'): Promise<{ 
    success: boolean; 
    message: string;
    data?: {
      environment: string;
      buildStatus: string;
      fileCount: number;
      serverStatus: string;
      domain: string;
      accessStatus: string;
      url: string;
    }
  }> {
    return this.websiteContext.handleWebsiteStatus(environment);
  }
  
  // Delegate additional methods that might be needed but don't need notifications
  async getDeploymentStatus(environment: string = 'preview'): Promise<{
    environment: string;
    buildStatus: string;
    serverStatus: string;
    fileCount: number;
    domain: string;
    url: string;
    accessStatus: string;
  }> {
    const deploymentManager = await this.websiteContext.getDeploymentManager();
    return deploymentManager.getEnvironmentStatus(environment as 'preview' | 'production');
  }
}