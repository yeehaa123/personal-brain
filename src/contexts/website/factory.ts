/**
 * WebsiteContext Factory
 * 
 * Factory functions for creating WebsiteContext instances with different storage implementations
 */
import config from '@/config';
import { ProfileContext } from '@/contexts/profiles';
import { Logger } from '@/utils/logger';

import { PersistentWebsiteStorageAdapter } from './adapters/persistentWebsiteStorageAdapter';
import { InMemoryWebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
import { WebsiteFormatter } from './formatters';
import { AstroContentService } from './services/astroContentService';
import { DeploymentManagerFactory } from './services/deployment';
import { LandingPageGenerationService } from './services/landingPageGenerationService';
import { WebsiteContext } from './websiteContext';
import type { WebsiteContextOptions } from './websiteContext';

/**
 * Create a WebsiteContext with in-memory storage
 * This is mainly used for testing or ephemeral use cases
 * 
 * @param options Configuration options
 * @returns WebsiteContext instance with in-memory storage
 */
export function createInMemoryWebsiteContext(options?: WebsiteContextOptions): WebsiteContext {
  // Create in-memory storage adapter
  const storage = new InMemoryWebsiteStorageAdapter();
  
  // Initialize with values from global config
  const websiteConfig = {
    title: config.website.title,
    description: config.website.description,
    author: config.website.author,
    baseUrl: config.website.baseUrl,
    astroProjectPath: config.website.astroProjectPath,
    deployment: {
      type: config.website.deployment.type as 'local-dev' | 'caddy',
      previewPort: config.website.deployment.previewPort,
      livePort: config.website.deployment.livePort,
      domain: config.website.deployment.domain,
    },
  };
  
  // We need to initialize the adapter before we can update it
  storage.initialize().then(() => {
    storage.updateWebsiteConfig(websiteConfig).catch(error => {
      Logger.getInstance().error('Error updating website config during initialization', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteContext',
      });
    });
  }).catch(error => {
    Logger.getInstance().error('Error initializing website storage adapter', {
      error: error instanceof Error ? error.message : String(error),
      context: 'WebsiteContext',
    });
  });
  
  // Create formatter
  const formatter = WebsiteFormatter.getInstance();
  
  // Create AstroContentService - doesn't use getInstance pattern, so create directly
  const astroContentService = new AstroContentService(websiteConfig.astroProjectPath);
  
  // Create LandingPageGenerationService
  const landingPageGenerationService = LandingPageGenerationService.getInstance();
  
  // Get ProfileContext - optional dependency
  const profileContext = ProfileContext.getInstance();
  
  // Create DeploymentManager with a fresh factory to ensure it respects current config
  const factory = DeploymentManagerFactory.createFresh();
  const deploymentManager = factory.create({
    baseDir: websiteConfig.astroProjectPath,
    deploymentType: websiteConfig.deployment.type,
    deploymentConfig: {
      previewPort: websiteConfig.deployment.previewPort,
      livePort: websiteConfig.deployment.livePort,
    },
  });
  
  // Create context with all dependencies
  return new WebsiteContext({
    storage,
    formatter,
    astroContentService,
    landingPageGenerationService,
    profileContext,
    deploymentManager,
    ...options,
  });
}

/**
 * Create a WebsiteContext with persistent note storage
 * This provides persistence for landing page data using the note system
 * 
 * @param options Configuration options
 * @returns WebsiteContext instance with persistent storage
 */
export function createPersistentWebsiteContext(options?: WebsiteContextOptions): WebsiteContext {
  // Create persistent storage adapter - it takes care of initializing LandingPageNoteAdapter
  const storage = PersistentWebsiteStorageAdapter.getInstance();
  
  // Initialize with values from global config
  const websiteConfig = {
    title: config.website.title,
    description: config.website.description,
    author: config.website.author,
    baseUrl: config.website.baseUrl,
    astroProjectPath: config.website.astroProjectPath,
    deployment: {
      type: config.website.deployment.type as 'local-dev' | 'caddy',
      previewPort: config.website.deployment.previewPort,
      livePort: config.website.deployment.livePort,
      domain: config.website.deployment.domain,
    },
  };
  
  // We need to initialize the adapter before we can update it
  storage.initialize().then(() => {
    storage.updateWebsiteConfig(websiteConfig).catch(error => {
      Logger.getInstance().error('Error updating website config during initialization', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteContext',
      });
    });
  }).catch(error => {
    Logger.getInstance().error('Error initializing website storage adapter', {
      error: error instanceof Error ? error.message : String(error),
      context: 'WebsiteContext',
    });
  });
  
  // Create formatter
  const formatter = WebsiteFormatter.getInstance();
  
  // Create AstroContentService - doesn't use getInstance pattern, so create directly
  const astroContentService = new AstroContentService(websiteConfig.astroProjectPath);
  
  // Create LandingPageGenerationService
  const landingPageGenerationService = LandingPageGenerationService.getInstance();
  
  // Get ProfileContext - optional dependency
  const profileContext = ProfileContext.getInstance();
  
  // Create DeploymentManager with a fresh factory to ensure it respects current config
  const factory = DeploymentManagerFactory.createFresh();
  const deploymentManager = factory.create({
    baseDir: websiteConfig.astroProjectPath,
    deploymentType: websiteConfig.deployment.type,
    deploymentConfig: {
      previewPort: websiteConfig.deployment.previewPort,
      livePort: websiteConfig.deployment.livePort,
    },
  });
  
  // Create context with all dependencies
  return new WebsiteContext({
    storage,
    formatter,
    astroContentService,
    landingPageGenerationService,
    profileContext,
    deploymentManager,
    ...options,
  });
}