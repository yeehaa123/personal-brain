# Website Integration Phase 1: Foundation and Landing Page

## Overview

This document details the implementation plan for Phase 1 of the Website Integration feature, focusing on the foundation setup and landing page generation. This phase will establish the core architecture and generate a compelling professional landing page from the user's profile data.

## Goals for Phase 1

- Set up the Website Context architecture following the Component Interface Standardization pattern
- Integrate with Astro static site generator and configure content collections
- Generate a professional landing page from profile data
- Implement preview capability for the landing page
- Create CLI and Matrix commands for website management with feature parity
- Ensure consistent user experience across both interfaces

## Architecture

### Directory Structure

```
src/mcp/contexts/website/
├── adapters/
│   └── websiteStorageAdapter.ts     # Interface with storage layer
├── core/
│   └── websiteContext.ts            # Main context implementation
├── formatters/
│   ├── websiteFormatter.ts          # Format website data for CLI display
│   └── websiteMcpFormatter.ts       # Format website data for Matrix display
├── index.ts                         # Public exports
├── services/
│   ├── astroContentService.ts       # Manage Astro content collections
│   ├── websiteGenerationService.ts  # Generate website content
│   └── websitePublishingService.ts  # Handle preview and publishing
└── storage/
    └── websiteStorage.ts            # Store website configuration and state
```

### Initial Astro Project Structure

```
website/                        # Astro project root
├── astro.config.mjs            # Astro configuration
├── package.json                # Dependencies
├── public/                     # Static assets
├── src/
│   ├── components/             # Reusable components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Bio.astro
│   │   ├── ProjectCard.astro
│   │   └── ExpertiseCard.astro
│   ├── content/                # Content collections
│   │   ├── config.ts           # Collection schemas
│   │   └── landingPage/        # Landing page content
│   │       └── profile.json    # Generated from profile
│   ├── layouts/                # Page layouts
│   │   └── BaseLayout.astro    # Common layout
│   └── pages/                  # Route definitions
│       └── index.astro         # Landing page
└── tsconfig.json               # TypeScript configuration
```

## Implementation Plan

### Day 1: Website Context and Schema Setup (4-6 hours)

#### 1. Create Core Types and Schemas (1.5 hours)

```typescript
// In src/mcp/contexts/website/storage/websiteStorage.ts

import { z } from 'zod';

export const WebsiteConfigSchema = z.object({
  title: z.string().default('Personal Brain'),
  description: z.string().default('My personal website'),
  author: z.string(),
  baseUrl: z.string().url().default('http://localhost:4321'),
  deploymentType: z.enum(['local', 'self-hosted', 'github', 'vercel', 'netlify']).default('local'),
  deploymentConfig: z.record(z.unknown()).optional(),
  astroProjectPath: z.string(),
  social: z.record(z.string()).optional(),
  seo: z.object({
    defaultImage: z.string().optional(),
    twitterHandle: z.string().optional(),
    siteName: z.string().optional(),
  }).optional(),
});

export type WebsiteConfig = z.infer<typeof WebsiteConfigSchema>;

// Landing page data structure matching Astro content collection
export const LandingPageSchema = z.object({
  name: z.string(),
  title: z.string(),
  tagline: z.string(),
  bio: z.string(),
  expertise: z.array(z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string().optional(),
  })).default([]),
  projects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    link: z.string().optional(),
    image: z.string().optional(),
  })).default([]),
  social: z.record(z.string()).optional(),
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }).optional(),
  showContactForm: z.boolean().default(false),
});

export type LandingPageData = z.infer<typeof LandingPageSchema>;
```

#### 2. Implement Storage Adapter (1 hour)

```typescript
// In src/mcp/contexts/website/adapters/websiteStorageAdapter.ts

import { WebsiteConfig, LandingPageData } from '../storage/websiteStorage';
import { BaseStorageAdapter } from '@/mcp/contexts/core/storageInterface';

export interface WebsiteStorageAdapter extends BaseStorageAdapter {
  // Config management
  getWebsiteConfig(): Promise<WebsiteConfig>;
  updateWebsiteConfig(config: Partial<WebsiteConfig>): Promise<WebsiteConfig>;
  
  // Landing page data
  getLandingPageData(): Promise<LandingPageData | null>;
  saveLandingPageData(data: LandingPageData): Promise<void>;
}

// In-memory implementation for development
export class InMemoryWebsiteStorageAdapter implements WebsiteStorageAdapter {
  private config: WebsiteConfig = {
    title: 'Personal Brain',
    description: 'My personal website',
    author: 'Anonymous',
    baseUrl: 'http://localhost:4321',
    deploymentType: 'local',
    astroProjectPath: '/tmp/astro-project', // Default path
  };
  
  private landingPageData: LandingPageData | null = null;
  
  async initialize(): Promise<void> {
    // Nothing to initialize for in-memory
  }
  
  async getWebsiteConfig(): Promise<WebsiteConfig> {
    return this.config;
  }
  
  async updateWebsiteConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    this.config = { ...this.config, ...updates };
    return this.config;
  }
  
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.landingPageData;
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    this.landingPageData = data;
  }
}
```

#### 3. Create the Website Context (2 hours)

```typescript
// In src/mcp/contexts/website/core/websiteContext.ts

import { BaseContext } from '@/mcp/contexts/core/baseContext';
import { WebsiteStorageAdapter, InMemoryWebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import { WebsiteConfig, LandingPageData } from '../storage/websiteStorage';

export interface WebsiteContextOptions {
  storage?: WebsiteStorageAdapter;
}

export class WebsiteContext extends BaseContext {
  private static instance: WebsiteContext | null = null;
  private storage: WebsiteStorageAdapter;
  
  constructor(options?: WebsiteContextOptions) {
    super();
    this.storage = options?.storage || new InMemoryWebsiteStorageAdapter();
  }
  
  static getInstance(): WebsiteContext {
    if (!WebsiteContext.instance) {
      WebsiteContext.instance = new WebsiteContext();
    }
    return WebsiteContext.instance;
  }
  
  static resetInstance(): void {
    WebsiteContext.instance = null;
  }
  
  static createFresh(options?: WebsiteContextOptions): WebsiteContext {
    return new WebsiteContext(options);
  }
  
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }
  
  // Config management
  async getConfig(): Promise<WebsiteConfig> {
    return this.storage.getWebsiteConfig();
  }
  
  async updateConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    return this.storage.updateWebsiteConfig(updates);
  }
  
  // Landing page management (to be expanded in the next tasks)
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.storage.getLandingPageData();
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    await this.storage.saveLandingPageData(data);
  }
}

// Export public interface
export default WebsiteContext;
```

#### 4. Create Context Exports (0.5 hour)

```typescript
// In src/mcp/contexts/website/index.ts

export { default as WebsiteContext } from './core/websiteContext';
export { WebsiteStorageAdapter, InMemoryWebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
export { WebsiteConfig, LandingPageData } from './storage/websiteStorage';
```

### Day 2: Astro Integration and Content Services (5-7 hours)

#### 1. Create Astro Content Service (2 hours)

```typescript
// In src/mcp/contexts/website/services/astroContentService.ts

import fs from 'fs/promises';
import path from 'path';
import { LandingPageData } from '../storage/websiteStorage';

export class AstroContentService {
  private contentCollectionPath: string;
  
  constructor(astroProjectPath: string) {
    this.contentCollectionPath = path.join(astroProjectPath, 'src/content');
  }
  
  /**
   * Initialize content collection directories and schema files
   */
  async initializeContentCollections(): Promise<void> {
    // Create content collection directories
    await fs.mkdir(path.join(this.contentCollectionPath, 'landingPage'), { recursive: true });
    
    // Create content collection schema definition file
    const schemaContent = `
import { z, defineCollection } from 'astro:content';

// Landing page content collection schema
const landingPageCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    title: z.string(),
    tagline: z.string(),
    bio: z.string(),
    expertise: z.array(z.object({
      name: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    })),
    projects: z.array(z.object({
      title: z.string(),
      description: z.string(),
      link: z.string().optional(),
      image: z.string().optional(),
    })).default([]),
    social: z.record(z.string()).optional(),
    contact: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
    }).optional(),
    showContactForm: z.boolean().default(false),
  }),
});

export const collections = {
  'landingPage': landingPageCollection,
};`;

    await fs.writeFile(path.join(this.contentCollectionPath, 'config.ts'), schemaContent);
  }
  
  /**
   * Write profile data to landing page content collection
   */
  async writeLandingPageContent(profileData: LandingPageData): Promise<void> {
    const contentFilePath = path.join(
      this.contentCollectionPath, 
      'landingPage', 
      'profile.json'
    );
    
    await fs.writeFile(
      contentFilePath, 
      JSON.stringify(profileData, null, 2)
    );
  }
  
  /**
   * Verify an Astro project exists at the specified path
   */
  async verifyAstroProject(projectPath: string): Promise<boolean> {
    try {
      // Check for package.json with Astro dependency
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonExists = await fs.access(packageJsonPath)
        .then(() => true)
        .catch(() => false);
      
      if (!packageJsonExists) {
        return false;
      }
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const hasAstro = packageJson.dependencies?.astro || packageJson.devDependencies?.astro;
      
      return Boolean(hasAstro);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Create a new Astro project if one doesn't exist
   */
  async createAstroProject(projectPath: string): Promise<void> {
    // Check if project already exists
    const exists = await this.verifyAstroProject(projectPath);
    
    if (exists) {
      return;
    }
    
    // Create basic project structure
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src/pages'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src/components'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src/layouts'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'public'), { recursive: true });
    
    // Create package.json
    const packageJson = {
      name: "personal-brain-website",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "astro dev",
        start: "astro dev",
        build: "astro build",
        preview: "astro preview"
      },
      dependencies: {
        astro: "^3.0.0",
        "@astrojs/mdx": "^1.0.0",
        "@astrojs/sitemap": "^3.0.0"
      }
    };
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create astro.config.mjs
    const astroConfig = `
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'http://localhost:4321',
  integrations: [mdx(), sitemap()],
});
`;
    
    await fs.writeFile(
      path.join(projectPath, 'astro.config.mjs'),
      astroConfig
    );
    
    // Create basic index page
    const indexPage = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getEntry } from 'astro:content';

const profile = await getEntry('landingPage', 'profile');
const { data } = profile;
---

<BaseLayout title={data.title}>
  <main>
    <section class="hero">
      <h1>{data.name}</h1>
      <p class="tagline">{data.tagline}</p>
    </section>
    
    <section class="bio">
      <h2>About</h2>
      <p>{data.bio}</p>
    </section>
    
    {data.expertise.length > 0 && (
      <section class="expertise">
        <h2>Expertise</h2>
        <div class="expertise-grid">
          {data.expertise.map(item => (
            <div class="expertise-card">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    )}
    
    {data.projects.length > 0 && (
      <section class="projects">
        <h2>Projects</h2>
        <div class="project-grid">
          {data.projects.map(project => (
            <div class="project-card">
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              {project.link && <a href={project.link}>View Project</a>}
            </div>
          ))}
        </div>
      </section>
    )}
    
    <section class="contact">
      <h2>Contact</h2>
      {data.contact?.email && <p>Email: <a href={\`mailto:\${data.contact.email}\`}>{data.contact.email}</a></p>}
      {data.social && (
        <div class="social-links">
          {Object.entries(data.social).map(([platform, url]) => (
            <a href={url} target="_blank" rel="noopener noreferrer">{platform}</a>
          ))}
        </div>
      )}
    </section>
  </main>
</BaseLayout>

<style>
  /* Basic styling for the landing page */
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .hero {
    text-align: center;
    margin-bottom: 4rem;
  }
  
  .tagline {
    font-size: 1.5rem;
    color: #666;
  }
  
  section {
    margin-bottom: 3rem;
  }
  
  .expertise-grid, .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .expertise-card, .project-card {
    padding: 1.5rem;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .social-links {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .social-links a {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background-color: #eee;
    text-decoration: none;
    color: #333;
  }
</style>
`;
    
    await fs.writeFile(
      path.join(projectPath, 'src/pages/index.astro'),
      indexPage
    );
    
    // Create base layout
    const baseLayout = `---
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="generator" content="Personal Brain" />
  </head>
  <body>
    <header>
      <nav>
        <div class="nav-brand">
          <a href="/">Personal Brain</a>
        </div>
      </nav>
    </header>
    
    <slot />
    
    <footer>
      <p>&copy; {new Date().getFullYear()} - Generated with Personal Brain</p>
    </footer>
  </body>
</html>

<style is:global>
  :root {
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --color-text: #222;
    --color-bg: #fff;
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
  }
  
  html {
    font-family: var(--font-sans);
    color: var(--color-text);
    background-color: var(--color-bg);
    line-height: 1.6;
  }
  
  body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  header, footer {
    padding: 1rem;
    background-color: #f5f5f5;
  }
  
  header {
    border-bottom: 1px solid #eee;
  }
  
  footer {
    border-top: 1px solid #eee;
    text-align: center;
    margin-top: auto;
  }
  
  h1, h2, h3 {
    margin-bottom: 1rem;
    line-height: 1.2;
  }
  
  p {
    margin-bottom: 1rem;
  }
  
  a {
    color: #0077cc;
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }
</style>
`;
    
    await fs.writeFile(
      path.join(projectPath, 'src/layouts/BaseLayout.astro'),
      baseLayout
    );
    
    // Initialize content collections
    await this.initializeContentCollections();
  }
}
```

#### 2. Implement Website Generation Service (1.5 hours)

```typescript
// In src/mcp/contexts/website/services/websiteGenerationService.ts

import { ProfileContext } from '@/mcp/contexts/profiles';
import { LandingPageData } from '../storage/websiteStorage';

export class WebsiteGenerationService {
  private profileContext: ProfileContext;
  
  constructor() {
    this.profileContext = ProfileContext.getInstance();
  }
  
  async generateLandingPageData(): Promise<LandingPageData> {
    // Get active profile
    const profile = await this.profileContext.getActiveProfile();
    
    // Extract expertise from profile skills/expertise data
    const expertise = (profile.expertise || []).map(exp => {
      // Handle both string and object formats
      if (typeof exp === 'string') {
        return { name: exp, description: '' };
      }
      return {
        name: exp.name || '',
        description: exp.description || '',
        icon: exp.icon || '',
      };
    });
    
    // Extract projects
    const projects = (profile.projects || []).map(proj => {
      // Handle both string and object formats
      if (typeof proj === 'string') {
        return { title: proj, description: '' };
      }
      return {
        title: proj.title || proj.name || '',
        description: proj.description || '',
        link: proj.link || proj.url || '',
        image: proj.image || '',
      };
    });
    
    // Create Astro-compatible data structure
    return {
      name: profile.name || 'Anonymous',
      title: `${profile.name || 'Personal'} - ${profile.title || profile.tagline || 'Personal Website'}`,
      tagline: profile.tagline || profile.bio?.substring(0, 100) || 'Personal Website',
      bio: profile.bio || 'Welcome to my personal website.',
      expertise,
      projects,
      social: profile.social || {},
      contact: {
        email: profile.contact?.email || profile.email || '',
        phone: profile.contact?.phone || profile.phone || '',
        location: profile.contact?.location || profile.location || '',
      },
      showContactForm: Boolean(profile.contact?.showContactForm),
    };
  }
}
```

#### 3. Create Website Publishing Service (2 hours)

```typescript
// In src/mcp/contexts/website/services/websitePublishingService.ts

import { spawn } from 'child_process';
import { WebsiteConfig } from '../storage/websiteStorage';
import { AstroContentService } from './astroContentService';
import path from 'path';
import fs from 'fs/promises';

export class WebsitePublishingService {
  private astroContentService: AstroContentService;
  private websiteConfig: WebsiteConfig;
  private previewProcess: any = null;
  
  constructor(websiteConfig: WebsiteConfig) {
    this.websiteConfig = websiteConfig;
    this.astroContentService = new AstroContentService(websiteConfig.astroProjectPath);
  }
  
  /**
   * Ensure the Astro project is set up and ready
   */
  async ensureAstroProject(): Promise<void> {
    const projectExists = await this.astroContentService.verifyAstroProject(this.websiteConfig.astroProjectPath);
    
    if (!projectExists) {
      await this.astroContentService.createAstroProject(this.websiteConfig.astroProjectPath);
    }
    
    // Make sure content collections are initialized
    await this.astroContentService.initializeContentCollections();
  }
  
  /**
   * Start a local preview server
   */
  async startPreviewServer(): Promise<string> {
    // Kill any existing preview process
    if (this.previewProcess) {
      this.previewProcess.kill();
      this.previewProcess = null;
    }
    
    // Make sure project is set up
    await this.ensureAstroProject();
    
    // Run npm install if node_modules doesn't exist
    const nodeModulesPath = path.join(this.websiteConfig.astroProjectPath, 'node_modules');
    const nodeModulesExists = await fs.access(nodeModulesPath).then(() => true).catch(() => false);
    
    if (!nodeModulesExists) {
      await new Promise<void>((resolve, reject) => {
        const install = spawn('npm', ['install'], {
          cwd: this.websiteConfig.astroProjectPath,
          stdio: 'ignore',
        });
        
        install.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`npm install failed with code ${code}`));
          }
        });
      });
    }
    
    // Start preview server
    return new Promise<string>((resolve) => {
      const preview = spawn('npm', ['run', 'dev'], {
        cwd: this.websiteConfig.astroProjectPath,
        stdio: 'pipe',
      });
      
      this.previewProcess = preview;
      
      // Watch for server output to detect when it's ready
      preview.stdout.on('data', (data) => {
        const output = data.toString();
        // Look for the URL in the output
        const match = output.match(/http:\/\/localhost:\d+/);
        if (match) {
          const url = match[0];
          resolve(url);
        }
      });
      
      // If server doesn't start within 10 seconds, assume default URL
      setTimeout(() => {
        resolve('http://localhost:4321');
      }, 10000);
    });
  }
  
  /**
   * Stop the preview server if it's running
   */
  stopPreviewServer(): void {
    if (this.previewProcess) {
      this.previewProcess.kill();
      this.previewProcess = null;
    }
  }
}
```

#### 4. Update Website Context with Services (1 hour)

```typescript
// Update src/mcp/contexts/website/core/websiteContext.ts

import { BaseContext } from '@/mcp/contexts/core/baseContext';
import { WebsiteStorageAdapter, InMemoryWebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import { WebsiteConfig, LandingPageData } from '../storage/websiteStorage';
import { WebsiteGenerationService } from '../services/websiteGenerationService';
import { WebsitePublishingService } from '../services/websitePublishingService';
import { AstroContentService } from '../services/astroContentService';

export interface WebsiteContextOptions {
  storage?: WebsiteStorageAdapter;
}

export class WebsiteContext extends BaseContext {
  private static instance: WebsiteContext | null = null;
  private storage: WebsiteStorageAdapter;
  private generationService: WebsiteGenerationService;
  private publishingService: WebsitePublishingService | null = null;
  
  constructor(options?: WebsiteContextOptions) {
    super();
    this.storage = options?.storage || new InMemoryWebsiteStorageAdapter();
    this.generationService = new WebsiteGenerationService();
  }
  
  // ...existing getInstance/resetInstance methods...
  
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }
  
  // Config management
  async getConfig(): Promise<WebsiteConfig> {
    return this.storage.getWebsiteConfig();
  }
  
  async updateConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    const config = await this.storage.updateWebsiteConfig(updates);
    
    // Re-initialize publishing service if astroProjectPath changed
    if (updates.astroProjectPath) {
      this.publishingService = null;
    }
    
    return config;
  }
  
  // Get the publishing service, creating it if needed
  private async getPublishingService(): Promise<WebsitePublishingService> {
    if (!this.publishingService) {
      const config = await this.getConfig();
      this.publishingService = new WebsitePublishingService(config);
    }
    return this.publishingService;
  }
  
  // Landing page generation
  async generateLandingPage(): Promise<LandingPageData> {
    // Generate content from profile
    const landingPageData = await this.generationService.generateLandingPageData();
    
    // Save to storage
    await this.storage.saveLandingPageData(landingPageData);
    
    // Get the publishing service
    const publishingService = await this.getPublishingService();
    
    // Ensure Astro project exists
    await publishingService.ensureAstroProject();
    
    // Get content service for the configured project path
    const config = await this.getConfig();
    const contentService = new AstroContentService(config.astroProjectPath);
    
    // Write to content collection
    await contentService.writeLandingPageContent(landingPageData);
    
    return landingPageData;
  }
  
  async previewLandingPage(): Promise<string> {
    // Make sure landing page data exists
    const existingData = await this.storage.getLandingPageData();
    
    if (!existingData) {
      // Generate landing page if it doesn't exist
      await this.generateLandingPage();
    }
    
    // Get publishing service and start preview
    const publishingService = await this.getPublishingService();
    return publishingService.startPreviewServer();
  }
  
  async stopPreview(): Promise<void> {
    if (this.publishingService) {
      this.publishingService.stopPreviewServer();
    }
  }
}
```

### Day 3: Command Interfaces and Testing (6-7 hours)

#### 1. Implement Formatters for CLI and Matrix (1.5 hours)

```typescript
// In src/mcp/contexts/website/formatters/websiteFormatter.ts

import { LandingPageData, WebsiteConfig } from '../storage/websiteStorage';
import { FormatterInterface } from '@/mcp/contexts/core/formatterInterface';

export class WebsiteFormatter implements FormatterInterface {
  formatConfig(config: WebsiteConfig): string {
    return `Website Configuration:
  Title: ${config.title}
  Description: ${config.description}
  Author: ${config.author}
  Base URL: ${config.baseUrl}
  Deployment Type: ${config.deploymentType}
  Astro Project Path: ${config.astroProjectPath}
  ${config.social ? 'Social Links: ' + Object.keys(config.social).join(', ') : ''}`;
  }
  
  formatLandingPageData(data: LandingPageData): string {
    return `Landing Page Data:
  Name: ${data.name}
  Tagline: ${data.tagline}
  Bio: ${data.bio.substring(0, 100)}${data.bio.length > 100 ? '...' : ''}
  Expertise: ${data.expertise.map(e => e.name).join(', ')}
  Projects: ${data.projects.map(p => p.title).join(', ')}
  ${data.contact?.email ? 'Contact: ' + data.contact.email : ''}`;
  }
  
  formatPreviewUrl(url: string): string {
    return `Preview server running at ${url}\nPress Ctrl+C to stop the preview.`;
  }
}

// In src/mcp/contexts/website/formatters/websiteMcpFormatter.ts

import { LandingPageData, WebsiteConfig } from '../storage/websiteStorage';
import { FormatterInterface } from '@/mcp/contexts/core/formatterInterface';

export class WebsiteMcpFormatter implements FormatterInterface {
  formatConfig(config: WebsiteConfig): string {
    return `### Website Configuration
- **Title**: ${config.title}
- **Description**: ${config.description}
- **Author**: ${config.author}
- **Base URL**: ${config.baseUrl}
- **Deployment Type**: ${config.deploymentType}
- **Astro Project Path**: ${config.astroProjectPath}
${config.social ? '- **Social Links**: ' + Object.keys(config.social).join(', ') : ''}`;
  }
  
  formatLandingPageData(data: LandingPageData): string {
    return `### Landing Page Generated Successfully
- **Name**: ${data.name}
- **Tagline**: ${data.tagline}
- **Bio**: ${data.bio.substring(0, 100)}${data.bio.length > 100 ? '...' : ''}
- **Expertise**: ${data.expertise.map(e => e.name).join(', ')}
- **Projects**: ${data.projects.map(p => p.title).join(', ')}
${data.contact?.email ? '- **Contact**: ' + data.contact.email : ''}`;
  }
  
  formatPreviewUrl(url: string): string {
    return `### Website Preview
🔗 Preview available at: ${url}

*(Preview server is running. It will shut down when you exit the conversation or run the preview-stop command.)*`;
  }
}
```

#### 2. Implement CLI Commands (2 hours)

```typescript
// In src/commands/handlers/websiteCommands.ts

import { BaseCommandHandler } from '@/commands/core/baseCommandHandler';
import { CommandResult } from '@/commands/core/commandTypes';
import { WebsiteContext } from '@/mcp/contexts/website';
import { WebsiteFormatter } from '@/mcp/contexts/website/formatters/websiteFormatter';
import { WebsiteMcpFormatter } from '@/mcp/contexts/website/formatters/websiteMcpFormatter';
import path from 'path';

export class WebsiteCommandHandler extends BaseCommandHandler {
  private websiteContext: WebsiteContext;
  private cliFormatter: WebsiteFormatter;
  private mcpFormatter: WebsiteMcpFormatter;
  
  constructor() {
    super();
    this.websiteContext = WebsiteContext.getInstance();
    this.cliFormatter = new WebsiteFormatter();
    this.mcpFormatter = new WebsiteMcpFormatter();
  }
  
  /**
   * Initialize website configuration
   */
  async handleWebsiteInit(projectPath?: string, interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
    // Set defaults
    const homePath = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const defaultPath = path.join(homePath, 'personal-brain-website');
    
    // Use provided path or default
    const astroProjectPath = projectPath || defaultPath;
    
    // Initialize context
    await this.websiteContext.initialize();
    
    // Update config with project path
    const config = await this.websiteContext.updateConfig({
      astroProjectPath,
      title: 'Personal Brain Website',
      description: 'Generated from my Personal Brain',
      author: 'Personal Brain User',
    });
    
    // Format output based on interface type
    const formattedOutput = interfaceType === 'cli' 
      ? this.cliFormatter.formatConfig(config)
      : this.mcpFormatter.formatConfig(config);
    
    return {
      success: true,
      message: `Website configuration initialized.\nAstro project path: ${config.astroProjectPath}`,
      data: {
        config,
        formattedOutput
      },
    };
  }
  
  /**
   * Generate landing page from profile
   */
  async handleLandingPageGenerate(interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
    try {
      // Initialize if not done already
      await this.websiteContext.initialize();
      
      // Generate landing page
      const landingPageData = await this.websiteContext.generateLandingPage();
      
      // Format output based on interface type
      const formattedOutput = interfaceType === 'cli'
        ? this.cliFormatter.formatLandingPageData(landingPageData)
        : this.mcpFormatter.formatLandingPageData(landingPageData);
      
      return {
        success: true,
        message: `Landing page generated for ${landingPageData.name}.\nUse 'website preview' to see the result.`,
        data: {
          landingPageData,
          formattedOutput
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to generate landing page: ${error.message}`,
      };
    }
  }
  
  /**
   * Preview the website locally
   */
  async handleWebsitePreview(interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
    try {
      // Initialize if not done already
      await this.websiteContext.initialize();
      
      // Start preview server
      const url = await this.websiteContext.previewLandingPage();
      
      // Format output based on interface type
      const formattedOutput = interfaceType === 'cli'
        ? this.cliFormatter.formatPreviewUrl(url)
        : this.mcpFormatter.formatPreviewUrl(url);
      
      return {
        success: true,
        message: `Website preview started at ${url}\nPress Ctrl+C to stop the preview.`,
        data: { 
          url,
          formattedOutput
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start preview: ${error.message}`,
      };
    }
  }
  
  /**
   * Stop the preview server
   */
  async handleWebsitePreviewStop(): Promise<CommandResult> {
    await this.websiteContext.stopPreview();
    
    return {
      success: true,
      message: 'Website preview stopped.',
    };
  }
  
  /**
   * Update website configuration
   */
  async handleWebsiteConfig(updates: Partial<Record<string, string>>, interfaceType: 'cli' | 'matrix' = 'cli'): Promise<CommandResult> {
    // Initialize if not done already
    await this.websiteContext.initialize();
    
    // Get current config
    const currentConfig = await this.websiteContext.getConfig();
    
    // Display config if no updates provided
    if (Object.keys(updates).length === 0) {
      // Format output based on interface type
      const formattedOutput = interfaceType === 'cli'
        ? this.cliFormatter.formatConfig(currentConfig)
        : this.mcpFormatter.formatConfig(currentConfig);
      
      return {
        success: true,
        message: 'Current website configuration:',
        data: {
          config: currentConfig,
          formattedOutput
        },
      };
    }
    
    // Update config
    const newConfig = await this.websiteContext.updateConfig(updates);
    
    // Format output based on interface type
    const formattedOutput = interfaceType === 'cli'
      ? this.cliFormatter.formatConfig(newConfig)
      : this.mcpFormatter.formatConfig(newConfig);
    
    return {
      success: true,
      message: 'Website configuration updated.',
      data: {
        config: newConfig,
        formattedOutput
      },
    };
  }
}
```

#### 3. Register Commands with Interface Detection (1 hour)

```typescript
// Update src/commands/index.ts to include website commands

import { CommandRegistry } from './core/commandTypes';
import { WebsiteCommandHandler } from './handlers/websiteCommands';

// ... existing code ...

// Register website commands
const websiteCommands = new WebsiteCommandHandler();

registry.registerCommand('website init', {
  handler: (args, context) => {
    // Detect interface type from context
    const interfaceType = context?.interfaceType || 'cli';
    return websiteCommands.handleWebsiteInit(args.projectPath, interfaceType as 'cli' | 'matrix');
  },
  description: 'Initialize website configuration',
  usage: 'website init [projectPath]',
  args: {
    projectPath: { type: 'string', optional: true, description: 'Path to Astro project (optional)' },
  },
});

registry.registerCommand('website config', {
  handler: (args, context) => {
    // Detect interface type from context
    const interfaceType = context?.interfaceType || 'cli';
    return websiteCommands.handleWebsiteConfig(args, interfaceType as 'cli' | 'matrix');
  },
  description: 'View or update website configuration',
  usage: 'website config [key=value ...]',
  args: {},
  variableArgs: true,
});

registry.registerCommand('landing-page generate', {
  handler: (args, context) => {
    // Detect interface type from context
    const interfaceType = context?.interfaceType || 'cli';
    return websiteCommands.handleLandingPageGenerate(interfaceType as 'cli' | 'matrix');
  },
  description: 'Generate landing page from profile data',
  usage: 'landing-page generate',
  args: {},
});

registry.registerCommand('website preview', {
  handler: (args, context) => {
    // Detect interface type from context
    const interfaceType = context?.interfaceType || 'cli';
    return websiteCommands.handleWebsitePreview(interfaceType as 'cli' | 'matrix');
  },
  description: 'Preview website locally',
  usage: 'website preview',
  args: {},
});

registry.registerCommand('website preview-stop', {
  handler: () => websiteCommands.handleWebsitePreviewStop(),
  description: 'Stop website preview server',
  usage: 'website preview-stop',
  args: {},
});

// ... rest of the file ...
```

#### 4. Create Unit Tests (1.5 hours)

```typescript
// In tests/mcp/contexts/website/websiteContext.test.ts

import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/website/websiteStorageAdapter';
import { beforeEach, afterEach, describe, test, expect, mock } from 'bun:test';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

describe('WebsiteContext', () => {
  let tempDir: string;
  let context: WebsiteContext;
  let mockStorage: MockWebsiteStorageAdapter;
  
  beforeEach(async () => {
    // Create temp dir for tests
    tempDir = path.join(os.tmpdir(), `website-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Setup mocks
    MockProfileContext.resetInstance();
    
    // Mock profile data
    const mockProfile = {
      name: 'Test User',
      bio: 'This is a test bio',
      tagline: 'Web Developer & AI Enthusiast',
      expertise: [
        { name: 'Web Development', description: 'Full stack development' },
        'TypeScript',
      ],
      projects: [
        { title: 'Personal Brain', description: 'Knowledge management system' },
        'Portfolio Website',
      ],
      social: {
        twitter: 'https://twitter.com/testuser',
        github: 'https://github.com/testuser',
      },
      contact: {
        email: 'test@example.com',
      },
    };
    
    MockProfileContext.getInstance().getActiveProfile = mock(() => Promise.resolve(mockProfile));
    
    // Create mock storage
    mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockStorage.getWebsiteConfig = mock(() => Promise.resolve({
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'http://localhost:4321',
      deploymentType: 'local',
      astroProjectPath: tempDir,
    }));
    
    // Create context with mock storage
    context = WebsiteContext.createFresh({ storage: mockStorage });
    await context.initialize();
  });
  
  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
    
    WebsiteContext.resetInstance();
  });
  
  test('should initialize with default config', async () => {
    expect(mockStorage.initialize).toHaveBeenCalled();
  });
  
  test('should generate landing page data from profile', async () => {
    // Generate landing page
    const landingPageData = await context.generateLandingPage();
    
    // Verify data
    expect(landingPageData.name).toBe('Test User');
    expect(landingPageData.tagline).toBe('Web Developer & AI Enthusiast');
    expect(landingPageData.bio).toBe('This is a test bio');
    
    // Verify expertise was transformed correctly
    expect(landingPageData.expertise).toHaveLength(2);
    expect(landingPageData.expertise[0].name).toBe('Web Development');
    expect(landingPageData.expertise[1].name).toBe('TypeScript');
    
    // Verify projects were transformed correctly
    expect(landingPageData.projects).toHaveLength(2);
    expect(landingPageData.projects[0].title).toBe('Personal Brain');
    expect(landingPageData.projects[1].title).toBe('Portfolio Website');
    
    // Verify social links
    expect(landingPageData.social?.twitter).toBe('https://twitter.com/testuser');
    
    // Verify storage was updated
    expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(landingPageData);
  });
  
  test('should update config', async () => {
    const updates = {
      title: 'Updated Title',
      description: 'Updated Description',
    };
    
    await context.updateConfig(updates);
    
    expect(mockStorage.updateWebsiteConfig).toHaveBeenCalledWith(updates);
  });
});

// In tests/commands/handlers/websiteCommands.test.ts

import { WebsiteCommandHandler } from '@/commands/handlers/websiteCommands';
import { WebsiteContext } from '@/mcp/contexts/website';
import { beforeEach, describe, test, expect, mock } from 'bun:test';

describe('WebsiteCommandHandler', () => {
  let commandHandler: WebsiteCommandHandler;
  
  beforeEach(() => {
    // Reset context
    WebsiteContext.resetInstance();
    
    // Mock context methods
    const mockContext = WebsiteContext.getInstance();
    mockContext.initialize = mock(() => Promise.resolve());
    mockContext.updateConfig = mock(() => Promise.resolve({
      title: 'Test Website',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'http://localhost:4321',
      deploymentType: 'local',
      astroProjectPath: '/test/path',
    }));
    mockContext.generateLandingPage = mock(() => Promise.resolve({
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
      bio: 'Test bio',
      expertise: [],
      projects: [],
      social: {},
      contact: { email: 'test@example.com' },
      showContactForm: false,
    }));
    mockContext.previewLandingPage = mock(() => Promise.resolve('http://localhost:4321'));
    mockContext.stopPreview = mock(() => Promise.resolve());
    
    // Create command handler
    commandHandler = new WebsiteCommandHandler();
  });
  
  // CLI interface tests
  test('should initialize website config for CLI', async () => {
    const result = await commandHandler.handleWebsiteInit('/test/path', 'cli');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Website configuration initialized');
    expect(WebsiteContext.getInstance().updateConfig).toHaveBeenCalled();
    expect(result.data.formattedOutput).toContain('Website Configuration:');
  });
  
  test('should generate landing page for CLI', async () => {
    const result = await commandHandler.handleLandingPageGenerate('cli');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Landing page generated');
    expect(WebsiteContext.getInstance().generateLandingPage).toHaveBeenCalled();
    expect(result.data.formattedOutput).toContain('Landing Page Data:');
  });
  
  // Matrix interface tests
  test('should initialize website config for Matrix', async () => {
    const result = await commandHandler.handleWebsiteInit('/test/path', 'matrix');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Website configuration initialized');
    expect(WebsiteContext.getInstance().updateConfig).toHaveBeenCalled();
    expect(result.data.formattedOutput).toContain('### Website Configuration');
  });
  
  test('should generate landing page for Matrix', async () => {
    const result = await commandHandler.handleLandingPageGenerate('matrix');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Landing page generated');
    expect(WebsiteContext.getInstance().generateLandingPage).toHaveBeenCalled();
    expect(result.data.formattedOutput).toContain('### Landing Page Generated Successfully');
  });
  
  // Interface-agnostic tests
  test('should stop preview server', async () => {
    const result = await commandHandler.handleWebsitePreviewStop();
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Website preview stopped');
    expect(WebsiteContext.getInstance().stopPreview).toHaveBeenCalled();
  });
});
```

#### 5. Create Integration Tests for CLI and Matrix (1 hour)

```typescript
// In tests/interfaces/cli-website-commands.test.ts

import { setupCliApp } from '@test/helpers/cli';
import { WebsiteContext } from '@/mcp/contexts/website';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/website/websiteStorageAdapter';
import { beforeEach, describe, test, expect, mock } from 'bun:test';

describe('CLI Website Commands Integration', () => {
  let cli;
  let outputCapture;
  
  beforeEach(() => {
    WebsiteContext.resetInstance();
    
    // Setup mocks
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    WebsiteContext.getInstance().storage = mockStorage;
    WebsiteContext.getInstance().generateLandingPage = mock(() => Promise.resolve({
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
      bio: 'Test bio',
      expertise: [],
      projects: [],
      social: {},
      contact: {},
      showContactForm: false,
    }));
    WebsiteContext.getInstance().previewLandingPage = mock(() => Promise.resolve('http://localhost:4321'));
    
    // Setup CLI and capture output
    const setup = setupCliApp();
    cli = setup.cli;
    outputCapture = setup.outputCapture;
  });
  
  test('should initialize website config via CLI', async () => {
    await cli.processCommand('website init /test/path');
    expect(outputCapture.getOutput()).toContain('Website configuration initialized');
  });
  
  test('should generate landing page via CLI', async () => {
    await cli.processCommand('landing-page generate');
    expect(outputCapture.getOutput()).toContain('Landing page generated');
  });
  
  test('should preview website via CLI', async () => {
    await cli.processCommand('website preview');
    expect(outputCapture.getOutput()).toContain('Website preview started');
    expect(outputCapture.getOutput()).toContain('http://localhost:4321');
  });
});

// In tests/interfaces/matrix-website-commands.test.ts

import { setupMatrixApp } from '@test/helpers/matrix';
import { WebsiteContext } from '@/mcp/contexts/website';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/website/websiteStorageAdapter';
import { beforeEach, describe, test, expect, mock } from 'bun:test';

describe('Matrix Website Commands Integration', () => {
  let matrix;
  let messageCapture;
  
  beforeEach(() => {
    WebsiteContext.resetInstance();
    
    // Setup mocks
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    WebsiteContext.getInstance().storage = mockStorage;
    WebsiteContext.getInstance().generateLandingPage = mock(() => Promise.resolve({
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
      bio: 'Test bio',
      expertise: [],
      projects: [],
      social: {},
      contact: {},
      showContactForm: false,
    }));
    WebsiteContext.getInstance().previewLandingPage = mock(() => Promise.resolve('http://localhost:4321'));
    
    // Setup Matrix and capture messages
    const setup = setupMatrixApp();
    matrix = setup.matrix;
    messageCapture = setup.messageCapture;
  });
  
  test('should initialize website config via Matrix', async () => {
    await matrix.processCommand('website init /test/path');
    expect(messageCapture.getLastMessage()).toContain('### Website Configuration');
  });
  
  test('should generate landing page via Matrix', async () => {
    await matrix.processCommand('landing-page generate');
    expect(messageCapture.getLastMessage()).toContain('### Landing Page Generated Successfully');
  });
  
  test('should preview website via Matrix', async () => {
    await matrix.processCommand('website preview');
    expect(messageCapture.getLastMessage()).toContain('### Website Preview');
    expect(messageCapture.getLastMessage()).toContain('🔗 Preview available at: http://localhost:4321');
  });
});
```

## Testing Strategy

The implementation includes a comprehensive testing strategy to ensure reliable functionality:

### Unit Tests

1. **WebsiteContext Tests**
   - Test initialization and configuration
   - Test landing page data generation from profile
   - Test preview functionality

2. **AstroContentService Tests**
   - Test initialization of content collections
   - Test writing landing page data to Astro format

3. **WebsiteGenerationService Tests**
   - Test profile data transformation
   - Test handling of various profile data formats

4. **WebsiteCommandHandler Tests**
   - Test CLI output formatting
   - Test Matrix output formatting
   - Test error handling

### Integration Tests

1. **CLI Interface Integration Tests**
   - Test command registration
   - Test command execution in CLI context
   - Verify proper CLI-formatted output

2. **Matrix Interface Integration Tests**
   - Test command execution in Matrix context
   - Verify proper Markdown-formatted output
   - Test proper handling of Matrix-specific features

3. **End-to-End Flow Tests**
   - Test entire flow from initialization to preview
   - Test content is correctly written to Astro project

## Command Interface Details

The implementation ensures feature parity between CLI and Matrix interfaces through:

### CLI Interface

- Plain text formatting with simple indentation
- Standard terminal styling conventions
- Compact output suitable for terminal display

```
$ website init
Website configuration initialized.
Astro project path: /home/user/personal-brain-website

$ landing-page generate
Landing page generated for John Doe.
Use 'website preview' to see the result.

$ website preview
Website preview started at http://localhost:4321
Press Ctrl+C to stop the preview.
```

### Matrix Interface

- Markdown formatting for rich text display
- Emoji and styling to enhance readability
- Hyperlinks for preview URLs

```
### Website Configuration
- **Title**: Personal Brain Website
- **Description**: Generated from my Personal Brain
- **Author**: John Doe
- **Astro Project Path**: /home/user/personal-brain-website

### Landing Page Generated Successfully
- **Name**: John Doe
- **Tagline**: Web Developer & AI Enthusiast
- **Bio**: This is my personal website showcasing my projects...

### Website Preview
🔗 Preview available at: http://localhost:4321

*(Preview server is running. It will shut down when you exit the conversation or run the preview-stop command.)*
```

## Deliverables

1. Full implementation of the Website Context following Component Interface Standardization pattern
2. Astro project generation and content collection integration
3. Landing page generation from profile data
4. CLI and Matrix commands with feature parity
5. Comprehensive tests for both interfaces
6. Preview capability for the generated landing page

## Timeline

- **Day 1 (4-6 hours)**: Implement core schemas, storage adapter, and website context
- **Day 2 (5-7 hours)**: Implement Astro integration, content service, and publishing service
- **Day 3 (6-7 hours)**: Implement CLI and Matrix commands, formatters, and comprehensive tests

Total: 15-20 hours (approximately 3 days)

## Success Criteria

1. Users can initialize a website project from both CLI and Matrix interfaces
2. Users can generate a professional landing page from their profile data in both interfaces
3. Users can preview the generated landing page locally from both interfaces
4. The landing page data is stored in Astro's content collections
5. Both interfaces provide appropriately formatted output for their environment
6. The implementation follows the Component Interface Standardization pattern
7. All tests pass with good coverage

## Next Steps After Phase 1

1. Proceed to Phase 2 to implement blog post publishing and series organization
2. Enhance landing page templates and styling
3. Add more customization options for the landing page