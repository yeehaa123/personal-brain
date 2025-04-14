# S3 Deployment Implementation Plan for Hetzner Storage Box Integration

## Overview

This document outlines the implementation plan for integrating Hetzner Storage Box S3-compatible storage as the **primary and only** deployment target for the Personal Brain website. We will remove the local server option as it's too brittle for the MVP. The implementation will support both preview and production environments through separate buckets, allowing for a proper development workflow with isolated staging.

## Goals

- Implement S3 deployment service for Hetzner Storage Box as the only deployment option
- Remove all local server implementations to simplify codebase
- Support separate preview and production environments
- Enable programmatic bucket creation and management
- Ensure proper error handling and reporting
- Maintain clean architecture following the project's patterns
- Provide intuitive CLI and Matrix commands for deployment

## Architecture

### S3 Deployment Service Integration

```
src/mcp/contexts/website/services/
├── deploymentService.ts             # Base deployment interface
├── deploymentServiceFactory.ts      # Factory to create appropriate deployment service
└── s3DeploymentService.ts           # S3-specific implementation for Hetzner
```

### Configuration Requirements

The S3 deployment service will require the following configuration:

```typescript
export interface S3DeploymentConfig {
  // Connection settings
  endpoint: string;       // Hetzner S3 endpoint URL
  accessKey: string;      // S3 access key
  secretKey: string;      // S3 secret key
  region: string;         // Can be empty for Hetzner
  
  // Bucket settings
  bucketName: string;     // Main bucket name (will be suffixed with -production or -preview)
  environment: 'production' | 'preview'; // Which environment to deploy to
  
  // Build settings
  buildDir: string;       // Path to built website files, relative to project
}
```

## Implementation Plan

### 1. Add S3 Client Dependencies (0.5 hour)

Add the AWS SDK S3 client for interacting with S3-compatible storage:

```bash
bun add @aws-sdk/client-s3 @aws-sdk/lib-storage
```

These packages provide the necessary functionality for bucket operations and file uploads.

### 2. Implement S3DeploymentService Class (4 hours)

```typescript
import { S3Client, CreateBucketCommand, PutBucketWebsiteCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { BaseDeploymentService, DeploymentConfig, DeploymentResult } from './deploymentService';
import { Logger } from '@/utils/logger';
import path from 'path';
import fs from 'fs/promises';
import mime from 'mime-types';

export class S3DeploymentService extends BaseDeploymentService {
  private s3Client: S3Client | null = null;
  private logger = Logger.getInstance();

  /**
   * Get the name of this deployment provider
   */
  getProviderName(): string {
    return 'S3 (Hetzner)';
  }

  /**
   * Create S3 client based on configuration
   */
  private createS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        endpoint: this.config.endpoint as string,
        region: this.config.region as string || 'us-east-1', // Default region if not specified
        credentials: {
          accessKeyId: this.config.accessKey as string,
          secretAccessKey: this.config.secretKey as string,
        },
        forcePathStyle: true, // Required for S3-compatible services like Hetzner
      });
    }
    return this.s3Client;
  }

  /**
   * Validate S3 configuration
   */
  protected validateConfig(): void {
    const requiredFields = ['endpoint', 'accessKey', 'secretKey', 'bucketName', 'buildDir'];
    
    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
    
    // Set default environment if not specified
    if (!this.config.environment) {
      this.config.environment = 'production';
    }
  }

  /**
   * Get bucket name with environment suffix
   */
  private getBucketName(): string {
    const baseNameOrId = this.config.bucketName as string;
    const environment = this.config.environment as 'production' | 'preview';
    return `${baseNameOrId}-${environment}`;
  }

  /**
   * Create bucket if it doesn't exist
   */
  private async ensureBucketExists(): Promise<void> {
    const bucketName = this.getBucketName();
    const s3 = this.createS3Client();
    
    try {
      // Check if bucket exists by listing objects
      await s3.send(new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1,
      }));
      
      this.logger.debug(`Bucket ${bucketName} already exists.`);
    } catch (error: any) {
      // If bucket doesn't exist, create it
      if (error.name === 'NoSuchBucket') {
        this.logger.info(`Creating bucket ${bucketName}...`);
        
        try {
          await s3.send(new CreateBucketCommand({
            Bucket: bucketName,
          }));
          
          // Configure bucket for website hosting
          await s3.send(new PutBucketWebsiteCommand({
            Bucket: bucketName,
            WebsiteConfiguration: {
              IndexDocument: { Suffix: 'index.html' },
              ErrorDocument: { Key: '404.html' },
            },
          }));
          
          this.logger.info(`Bucket ${bucketName} created and configured for website hosting.`);
        } catch (createError) {
          throw new Error(`Failed to create bucket: ${createError}`);
        }
      } else {
        throw new Error(`Failed to check if bucket exists: ${error}`);
      }
    }
  }

  /**
   * Clear existing files in the bucket
   */
  private async clearBucket(): Promise<void> {
    const bucketName = this.getBucketName();
    const s3 = this.createS3Client();
    
    try {
      // List all objects in the bucket
      const listObjectsResponse = await s3.send(new ListObjectsV2Command({
        Bucket: bucketName,
      }));
      
      if (listObjectsResponse.Contents && listObjectsResponse.Contents.length > 0) {
        // Delete all objects
        await s3.send(new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: listObjectsResponse.Contents.map(obj => ({
              Key: obj.Key as string,
            })),
            Quiet: false,
          },
        }));
        
        this.logger.debug(`Cleared ${listObjectsResponse.Contents.length} objects from bucket ${bucketName}.`);
      }
    } catch (error) {
      this.logger.warn(`Failed to clear bucket: ${error}`);
      // Continue with deployment even if clearing fails
    }
  }

  /**
   * Upload files to S3 bucket
   */
  private async uploadFiles(sitePath: string): Promise<void> {
    const bucketName = this.getBucketName();
    const s3 = this.createS3Client();
    
    const uploadFile = async (filePath: string, relativePath: string): Promise<void> => {
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      const fileContent = await fs.readFile(filePath);
      
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: bucketName,
          Key: relativePath,
          Body: fileContent,
          ContentType: contentType,
          // Set cache control based on file type
          CacheControl: contentType.startsWith('image/') 
            ? 'max-age=31536000' // 1 year for images
            : contentType.includes('javascript') || contentType.includes('css')
              ? 'max-age=86400' // 1 day for JS/CSS
              : 'max-age=3600', // 1 hour for other files
        },
      });
      
      await upload.done();
    };
    
    const processDirectory = async (dirPath: string, basePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath, relativePath);
        } else {
          await uploadFile(fullPath, relativePath);
        }
      }
    };
    
    await processDirectory(sitePath);
  }

  /**
   * Deploy the website to S3
   */
  async deploy(sitePath: string): Promise<DeploymentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'S3 deployment service is not properly configured.',
      };
    }
    
    try {
      // Ensure bucket exists
      await this.ensureBucketExists();
      
      // Clear existing files
      await this.clearBucket();
      
      // Upload new files
      await this.uploadFiles(sitePath);
      
      // Get site URL
      const siteInfo = await this.getSiteInfo();
      
      return {
        success: true,
        message: `Website deployed successfully to ${this.getBucketName()}.`,
        url: siteInfo?.url,
      };
    } catch (error: any) {
      this.logger.error(`Deployment failed: ${error.message}`, {
        error,
        context: 'S3DeploymentService',
      });
      
      return {
        success: false,
        message: `Deployment failed: ${error.message}`,
        logs: error.stack,
      };
    }
  }

  /**
   * Get information about the deployed site
   */
  async getSiteInfo(): Promise<{ siteId: string; url: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }
    
    const bucketName = this.getBucketName();
    const endpoint = this.config.endpoint as string;
    
    // Extract domain from endpoint (remove protocol and trailing paths)
    const domain = endpoint.replace(/^https?:\/\//, '').split('/')[0];
    
    // Create URL in format: http://bucket-name.s3-domain
    const url = `http://${bucketName}.${domain}`;
    
    return {
      siteId: bucketName,
      url,
    };
  }

  /**
   * Create a new bucket and configure it for website hosting
   */
  async createBucket(bucketName: string, environment: 'production' | 'preview'): Promise<void> {
    // Update config temporarily
    const originalBucketName = this.config.bucketName;
    const originalEnvironment = this.config.environment;
    
    try {
      this.config.bucketName = bucketName;
      this.config.environment = environment;
      
      await this.ensureBucketExists();
    } finally {
      // Restore original config
      this.config.bucketName = originalBucketName;
      this.config.environment = originalEnvironment;
    }
  }

  /**
   * Setup both production and preview environments
   */
  async setupEnvironments(projectName: string): Promise<{
    productionBucket: string;
    previewBucket: string;
    productionUrl: string;
    previewUrl: string;
  }> {
    // Normalize project name for bucket naming
    const normalizedName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Create both buckets
    await this.createBucket(normalizedName, 'production');
    await this.createBucket(normalizedName, 'preview');
    
    // Get URLs
    const productionConfig = { ...this.config, bucketName: normalizedName, environment: 'production' };
    const previewConfig = { ...this.config, bucketName: normalizedName, environment: 'preview' };
    
    const productionUrl = `http://${normalizedName}-production.${(this.config.endpoint as string).replace(/^https?:\/\//, '').split('/')[0]}`;
    const previewUrl = `http://${normalizedName}-preview.${(this.config.endpoint as string).replace(/^https?:\/\//, '').split('/')[0]}`;
    
    return {
      productionBucket: `${normalizedName}-production`,
      previewBucket: `${normalizedName}-preview`,
      productionUrl,
      previewUrl,
    };
  }

  /**
   * Get detailed deployment status
   */
  async getDetailedDeploymentStatus(): Promise<{
    status: string;
    deployTime?: string;
    message: string;
    logs?: string;
  } | null> {
    if (!this.isConfigured()) {
      return null;
    }
    
    return {
      status: 'deployed',
      deployTime: new Date().toISOString(),
      message: `Deployed to ${this.getBucketName()}`,
    };
  }
}
```

### 3. Update DeploymentServiceFactory (1 hour)

Modify the factory to create S3 deployment services:

```typescript
// In src/mcp/contexts/website/services/deploymentServiceFactory.ts

import { DeploymentService } from './deploymentService';
import { S3DeploymentService } from './s3DeploymentService';
import { Logger } from '@/utils/logger';

export class DeploymentServiceFactory {
  private static instance: DeploymentServiceFactory | null = null;
  private logger = Logger.getInstance();
  
  // [Existing getInstance, resetInstance, createFresh methods]
  
  /**
   * Create a deployment service for the given provider
   * @param providerType Type of deployment provider (s3)
   */
  async createDeploymentService(providerType: string): Promise<DeploymentService | null> {
    try {
      const type = providerType.toLowerCase();
      
      if (type === 's3') {
        return new S3DeploymentService();
      } else {
        throw new Error(`Unknown deployment provider: ${providerType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create deployment service for provider ${providerType}`, {
        error,
        context: 'DeploymentServiceFactory',
      });
      return null;
    }
  }
}
```

### 4. Update WebsiteContext for Multi-Environment Support (2 hours)

Enhance the WebsiteContext to handle different environments:

```typescript
// In src/mcp/contexts/website/core/websiteContext.ts

// Add environment handling methods
async deployToEnvironment(environment: 'production' | 'preview'): Promise<DeploymentResult> {
  // Get the factory
  const factory = DeploymentServiceFactory.getInstance();
  
  // Get deployment config
  const config = await this.storage.getWebsiteConfig();
  const deploymentConfig = await this.storage.getDeploymentConfig();
  
  // Create deployment service for S3
  const service = await factory.createDeploymentService('s3');
  
  if (!service) {
    return {
      success: false,
      message: 'Failed to create deployment service.',
    };
  }
  
  // Initialize with config
  const s3Config = {
    ...deploymentConfig,
    environment, // Set the target environment
  };
  
  const initialized = await service.initialize(s3Config);
  
  if (!initialized) {
    return {
      success: false,
      message: 'Failed to initialize deployment service.',
    };
  }
  
  // Build the website
  const buildResult = await this.buildWebsite();
  
  if (!buildResult.success) {
    return buildResult;
  }
  
  // Deploy to the appropriate environment
  return service.deploy(path.join(config.astroProjectPath, 'dist'));
}

/**
 * Setup both environments (production and preview)
 */
async setupEnvironments(projectName: string): Promise<{
  productionBucket: string;
  previewBucket: string;
  productionUrl: string;
  previewUrl: string;
}> {
  // Get the factory
  const factory = DeploymentServiceFactory.getInstance();
  
  // Get deployment config
  const deploymentConfig = await this.storage.getDeploymentConfig();
  
  // Create deployment service for S3
  const service = await factory.createDeploymentService('s3');
  
  if (!service) {
    throw new Error('Failed to create deployment service.');
  }
  
  // Initialize with config
  const initialized = await service.initialize(deploymentConfig);
  
  if (!initialized) {
    throw new Error('Failed to initialize deployment service.');
  }
  
  // Setup environments using S3 service
  if (service instanceof S3DeploymentService) {
    return service.setupEnvironments(projectName);
  }
  
  throw new Error('Deployment service does not support multi-environment setup.');
}
```

### 5. Update Command Handlers (2 hours)

Add new commands for environment management:

```typescript
// In src/commands/handlers/websiteCommands.ts

/**
 * Deploy website to production environment
 */
async handleWebsiteDeploy(interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
  try {
    // Deploy to production
    const result = await this.websiteContext.deployToEnvironment('production');
    
    const message = result.success
      ? `Website deployed successfully to production: ${result.url}`
      : `Deployment failed: ${result.message}`;
    
    return {
      success: result.success,
      message,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Deployment failed: ${error.message}`,
    };
  }
}

/**
 * Deploy website to preview environment
 */
async handleWebsiteDeployPreview(interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
  try {
    // Deploy to preview
    const result = await this.websiteContext.deployToEnvironment('preview');
    
    const message = result.success
      ? `Website deployed successfully to preview: ${result.url}`
      : `Deployment failed: ${result.message}`;
    
    return {
      success: result.success,
      message,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Deployment failed: ${error.message}`,
    };
  }
}

/**
 * Setup deployment environments
 */
async handleWebsiteSetupEnvironments(projectName: string, interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
  try {
    // Setup environments
    const result = await this.websiteContext.setupEnvironments(projectName);
    
    const message = `Deployment environments created:
  Production: ${result.productionUrl} (${result.productionBucket})
  Preview: ${result.previewUrl} (${result.previewBucket})`;
    
    return {
      success: true,
      message,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to setup environments: ${error.message}`,
    };
  }
}
```

### 6. Update Storage Schema and Configuration (1 hour)

Update storage schemas to support environment-specific deployment:

```typescript
// In src/mcp/contexts/website/storage/websiteStorage.ts

export const WebsiteConfigSchema = z.object({
  // [Existing fields...]
  deploymentType: z.enum(['s3']).default('s3'), // Only s3 for MVP, but keep as enum for extensibility
  // Add environment field
  environment: z.enum(['production', 'preview']).default('production'),
  // [Other fields...]
});

// S3-specific deployment configuration
export const S3DeploymentConfigSchema = z.object({
  endpoint: z.string(),
  accessKey: z.string(),
  secretKey: z.string(),
  bucketName: z.string(),
  region: z.string().optional(),
  buildDir: z.string().default('dist'),
});

// Add to websiteStorage.ts implementation
async getDeploymentConfig(): Promise<Record<string, unknown>> {
  const config = await this.getWebsiteConfig();
  
  if (config.deploymentType === 's3') {
    return config.providers?.s3 || {};
  }
  
  return {};
}
```

### 7. Update Configuration Files (0.5 hour)

Update configuration files to include S3 deployment settings:

```typescript
// In src/config.ts

// Website configuration
export const websiteConfig = {
  // [Existing fields...]
  
  // Deployment settings
  deployment: {
    // For MVP, only s3 is supported
    provider: getEnv('WEBSITE_DEPLOYMENT_PROVIDER', 's3'),
    
    // Provider-specific configurations
    providers: {
      // S3 deployment configuration
      s3: {
        endpoint: getEnv('S3_ENDPOINT', ''),
        accessKey: getEnv('S3_ACCESS_KEY', ''),
        secretKey: getEnv('S3_SECRET_KEY', ''),
        bucketName: getEnv('S3_BUCKET_NAME', ''),
        region: getEnv('S3_REGION', ''),
        buildDir: getEnv('S3_BUILD_DIR', 'dist'),
      },
    },
  },
};
```

Update example.env with S3 configuration:

```
# Deployment provider
# Currently only 's3' is supported
WEBSITE_DEPLOYMENT_PROVIDER=s3

#=================#
# S3 DEPLOYMENT   #
#=================#
# S3-compatible storage settings (works with Hetzner Storage Box)
S3_ENDPOINT=https://s3.hetzner.com
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET_KEY=your-s3-secret-key
S3_BUCKET_NAME=your-website-name
S3_REGION=eu-central-1  # Can be empty for Hetzner

# Build directory relative to the Astro project (usually 'dist')
S3_BUILD_DIR=dist
```

### 8. Add Unit and Integration Tests (3 hours)

```typescript
// In tests/mcp/contexts/website/services/s3DeploymentService.test.ts

import { S3DeploymentService } from '@/mcp/contexts/website/services/s3DeploymentService';
import { beforeEach, afterEach, describe, test, expect, mock } from 'bun:test';
import { S3Client } from '@aws-sdk/client-s3';

// Mock S3 client
mock.module('@aws-sdk/client-s3', () => ({
  S3Client: mock.fn(() => ({
    send: mock.fn(async (command) => {
      // Mock responses for different commands
      if (command.constructor.name === 'CreateBucketCommand') {
        return {};
      } else if (command.constructor.name === 'PutBucketWebsiteCommand') {
        return {};
      } else if (command.constructor.name === 'ListObjectsV2Command') {
        return { Contents: [] };
      } else {
        return {};
      }
    }),
  })),
  CreateBucketCommand: mock.fn(),
  PutBucketWebsiteCommand: mock.fn(),
  ListObjectsV2Command: mock.fn(),
  DeleteObjectsCommand: mock.fn(),
}));

// Mock Upload from lib-storage
mock.module('@aws-sdk/lib-storage', () => ({
  Upload: mock.fn(() => ({
    done: mock.fn(async () => ({})),
  })),
}));

describe('S3DeploymentService', () => {
  let service: S3DeploymentService;
  
  beforeEach(() => {
    service = new S3DeploymentService();
  });
  
  test('getProviderName should return S3 (Hetzner)', () => {
    expect(service.getProviderName()).toBe('S3 (Hetzner)');
  });
  
  test('validateConfig should require necessary fields', async () => {
    // Missing endpoint
    await expect(service.initialize({
      accessKey: 'test-key',
      secretKey: 'test-secret',
      bucketName: 'test-bucket',
      buildDir: 'dist',
    })).resolves.toBe(false);
    
    // Complete config
    await expect(service.initialize({
      endpoint: 'https://s3.hetzner.com',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      bucketName: 'test-bucket',
      buildDir: 'dist',
    })).resolves.toBe(true);
  });
  
  test('deploy should handle successful deployment', async () => {
    // Initialize service
    await service.initialize({
      endpoint: 'https://s3.hetzner.com',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      bucketName: 'test-bucket',
      buildDir: 'dist',
      environment: 'production',
    });
    
    // Mock fs.readdir and fs.readFile
    mock.module('fs/promises', () => ({
      readdir: mock.fn(() => [
        { name: 'index.html', isDirectory: () => false },
        { name: 'assets', isDirectory: () => true },
      ]),
      readFile: mock.fn(() => Buffer.from('test content')),
    }));
    
    // Test deploy
    const result = await service.deploy('/tmp/test-site');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Website deployed successfully');
  });
  
  test('getSiteInfo should return correct URL format', async () => {
    // Initialize service
    await service.initialize({
      endpoint: 'https://s3.hetzner.com',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      bucketName: 'test-bucket',
      buildDir: 'dist',
      environment: 'production',
    });
    
    const info = await service.getSiteInfo();
    
    expect(info).not.toBeNull();
    expect(info?.siteId).toBe('test-bucket-production');
    expect(info?.url).toBe('http://test-bucket-production.s3.hetzner.com');
  });
  
  test('setupEnvironments should create both environments', async () => {
    // Initialize service
    await service.initialize({
      endpoint: 'https://s3.hetzner.com',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      bucketName: 'test-bucket',
      buildDir: 'dist',
    });
    
    const result = await service.setupEnvironments('my-project');
    
    expect(result.productionBucket).toBe('my-project-production');
    expect(result.previewBucket).toBe('my-project-preview');
    expect(result.productionUrl).toContain('my-project-production');
    expect(result.previewUrl).toContain('my-project-preview');
  });
});
```

## Command Integration

### 1. Matrix Interface Commands

```
website deploy              # Deploy to production environment
website deploy-preview      # Deploy to preview environment
website setup-environments  # Create both production and preview buckets
```

### 2. CLI Interface Commands

```
$ website deploy
Website deployed successfully to production: http://my-project-production.s3.hetzner.com

$ website deploy-preview
Website deployed successfully to preview: http://my-project-preview.s3.hetzner.com

$ website setup-environments my-project
Deployment environments created:
  Production: http://my-project-production.s3.hetzner.com (my-project-production)
  Preview: http://my-project-preview.s3.hetzner.com (my-project-preview)
```

## Implementation Timeline

- Add dependencies and update configuration (1 hour)
- Implement S3DeploymentService class (4 hours)
- Update DeploymentServiceFactory (1 hour)
- Update WebsiteContext for multi-environment support (2 hours)
- Update command handlers (2 hours)
- Update storage schema and configuration (1 hour)
- Create unit and integration tests (3 hours)

Total: 14 hours (~2 days)

## Success Criteria

1. Users can deploy to both production and preview environments
2. Environments can be created programmatically
3. Clear error reporting for deployment issues
4. Proper isolation between production and preview
5. Comprehensive test coverage
6. Feature parity between CLI and Matrix interfaces
7. Documentation for users to set up their S3 credentials