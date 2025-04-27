import fs from 'fs/promises';
import path from 'path';

import { Logger } from '@/utils/logger';
import type { EnhancedLandingPageData } from '@website/schemas';

import type { LandingPageData } from '../websiteStorage';

// Type for the spawn function we'll use to run Astro commands
export type SpawnFunction = (options: {
  cmd: string[];
  cwd: string;
  stdout: 'pipe';
  stderr: 'pipe';
}) => {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
};

// Test helper methods - will only be implemented in the mock
export interface AstroContentServiceTestHelpers {
  // Configure startDevServer to return failure
  setStartDevServerFailure(errorMessage?: string): void;
  
  // Configure stopDevServer to return failure
  setStopDevServerFailure(): void;
}

/**
 * Service for managing Astro project and content collections
 */
export class AstroContentService {
  private contentCollectionPath: string;
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  private spawnFunction: SpawnFunction;
  
  /**
   * Create a new AstroContentService
   * @param astroProjectPath Path to the Astro project root
   */
  constructor(private astroProjectPath: string) {
    this.contentCollectionPath = path.join(this.astroProjectPath, 'src', 'content');
    
    // Default implementation using Bun.spawn with adapter for our SpawnFunction type
    this.spawnFunction = (options: { cmd: string[]; cwd: string; stdout: 'pipe'; stderr: 'pipe'; }) => {
      const process = Bun.spawn(options.cmd, {
        cwd: options.cwd,
        stdout: options.stdout,
        stderr: options.stderr,
      });
      return {
        exited: process.exited,
        stdout: process.stdout,
        stderr: process.stderr,
      };
    };
  }
  
  /**
   * Set the spawn function (for testing)
   */
  setSpawnFunction(fn: SpawnFunction): void {
    this.spawnFunction = fn;
  }
  
  /**
   * Check if an Astro project exists at the specified path
   */
  async verifyAstroProject(): Promise<boolean> {
    try {
      // Check for key Astro files
      const astroConfigPath = path.join(this.astroProjectPath, 'astro.config.mjs');
      const contentConfigPath = path.join(this.contentCollectionPath, 'config.ts');
      
      const astroConfigExists = await fs.access(astroConfigPath)
        .then(() => true)
        .catch(() => false);
      
      const contentConfigExists = await fs.access(contentConfigPath)
        .then(() => true)
        .catch(() => false);
      
      return astroConfigExists && contentConfigExists;
    } catch (error) {
      this.logger.error('Error verifying Astro project', { error, context: 'AstroContentService' });
      return false;
    }
  }
  
  /**
   * Write landing page data to the content collection
   * Supports both original and enhanced landing page data models
   */
  async writeLandingPageContent(data: LandingPageData | EnhancedLandingPageData): Promise<boolean> {
    try {
      // Ensure landing page directory exists
      const landingPageDir = path.join(this.contentCollectionPath, 'landingPage');
      await fs.mkdir(landingPageDir, { recursive: true });
      
      // Write data to profile.json
      const filePath = path.join(landingPageDir, 'profile.json');
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      return true;
    } catch (error) {
      this.logger.error('Error writing landing page content', { error, context: 'AstroContentService' });
      return false;
    }
  }
  
  /**
   * Read landing page data from the content collection
   * Will attempt to detect if it's the original or enhanced model
   */
  async readLandingPageContent(): Promise<LandingPageData | EnhancedLandingPageData | null> {
    try {
      const filePath = path.join(this.contentCollectionPath, 'landingPage', 'profile.json');
      
      const exists = await fs.access(filePath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) {
        return null;
      }
      
      const rawData = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(rawData);
      
      // Check if this is an enhanced landing page model by looking for sections
      // that are specific to that model
      if (
        'hero' in parsedData || 
        'services' in parsedData || 
        'sectionOrder' in parsedData
      ) {
        return parsedData as EnhancedLandingPageData;
      }
      
      // Otherwise, assume it's the original model
      return parsedData as LandingPageData;
    } catch (error) {
      this.logger.error('Error reading landing page content', { error, context: 'AstroContentService' });
      return null;
    }
  }
  
  /**
   * Write enhanced landing page data to the content collection
   * This method is specifically for the enhanced model
   */
  async writeEnhancedLandingPageContent(data: EnhancedLandingPageData): Promise<boolean> {
    return this.writeLandingPageContent(data);
  }
  
  /**
   * Read enhanced landing page data from the content collection
   * This will convert legacy format to enhanced format if needed
   */
  async readEnhancedLandingPageContent(): Promise<EnhancedLandingPageData | null> {
    const data = await this.readLandingPageContent();
    
    if (!data) {
      return null;
    }
    
    // Check if this is already an enhanced model
    if ('hero' in data) {
      return data as EnhancedLandingPageData;
    }
    
    // Convert legacy model to enhanced model
    const legacyData = data as LandingPageData;
    
    // Create a minimal enhanced landing page data structure from legacy data
    const enhancedData: EnhancedLandingPageData = {
      title: legacyData.title,
      description: `Website for ${legacyData.name}`,
      name: legacyData.name,
      tagline: legacyData.tagline,
      sectionOrder: ['hero', 'services', 'about', 'cta', 'footer'],
      
      // Create a basic hero section
      hero: {
        headline: legacyData.title,
        subheading: legacyData.tagline,
        ctaText: 'Contact Me',
        ctaLink: '#contact',
      },
      
      // Create an empty services section (needs to be populated)
      services: {
        title: 'Services',
        items: [],
      },
      
      // Create a minimal about section
      about: {
        title: 'About Me',
        content: `Learn more about ${legacyData.name}.`,
        enabled: true,
      },
      
      // Create a basic CTA
      cta: {
        title: 'Ready to Work Together?',
        buttonText: 'Get in Touch',
        buttonLink: '#contact',
        enabled: true,
      },
      
      // Create a basic footer
      footer: {
        copyrightText: `© ${new Date().getFullYear()} ${legacyData.name}. All rights reserved.`,
        enabled: true,
      },
    };
    
    return enhancedData;
  }
  
  /**
   * Run an Astro command (build, preview, etc.)
   * This is for commands that complete and exit
   */
  async runAstroCommand(command: string): Promise<{ success: boolean; output: string }> {
    try {
      // Skip dev command as it should be handled by PM2
      if (command === 'dev') {
        this.logger.warn('runAstroCommand should not be used with "dev" command. Use startDevServer instead.', 
          { context: 'AstroContentService' });
      }
      
      // Use Bun to run the Astro command
      const proc = this.spawnFunction({
        cmd: ['bunx', 'astro', command, '--root', this.astroProjectPath],
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      // Capture output
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      
      // Check exit code
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        throw new Error(`Astro ${command} failed with exit code ${exitCode}: ${stderr}`);
      }
      
      // Log any warnings
      if (stderr && !stderr.includes('Completed in')) {
        this.logger.warn(`Astro ${command} warnings`, { output: stderr, context: 'AstroContentService' });
      }
      
      return {
        success: true,
        output: stdout,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error running Astro ${command}`, { error, context: 'AstroContentService' });
      
      return {
        success: false,
        output: errorMessage,
      };
    }
  }
  
  /**
   * Start the Astro dev server using PM2
   * This is a non-blocking call that returns immediately
   */
  async startDevServer(): Promise<{ success: boolean; output: string; url: string }> {
    try {
      // Use PM2 to start the Astro dev server
      // Need to use the full path to the npm script 
      const proc = this.spawnFunction({
        cmd: ['pm2', 'start', 'npm', '--name', 'personal-brain-website', '--', 'run', 'website:dev'],
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      // Capture output
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      
      // Check exit code
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        throw new Error(`Failed to start Astro dev server with PM2: ${stderr}`);
      }
      
      // Wait a moment to ensure the server has started
      await new Promise(resolve => global.setTimeout(resolve, 2000));
      
      // Log the startup
      this.logger.info('Astro dev server started with PM2', {
        context: 'AstroContentService',
        name: 'personal-brain-website',
      });
      
      // Astro dev server typically runs on localhost:4321 by default
      const url = 'http://localhost:4321';
      
      return {
        success: true,
        output: stdout,
        url: url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error starting Astro dev server with PM2', { error, context: 'AstroContentService' });
      
      return {
        success: false,
        output: errorMessage,
        url: '',
      };
    }
  }
  
  /**
   * Stop the Astro dev server managed by PM2
   */
  async stopDevServer(): Promise<boolean> {
    try {
      // Use PM2 to stop the Astro dev server
      const proc = this.spawnFunction({
        cmd: ['pm2', 'delete', 'personal-brain-website'],
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      // Capture output for debugging
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      
      // Check exit code
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        // Don't throw if the process isn't found - it might already be stopped
        if (stderr.includes('not found') || stdout.includes('not found')) {
          this.logger.info('Astro dev server not found in PM2, assuming already stopped', { 
            context: 'AstroContentService', 
          });
          return true;
        }
        throw new Error(`Failed to stop Astro dev server with PM2: ${stderr}`);
      }
      
      this.logger.info('Astro dev server stopped with PM2', { 
        context: 'AstroContentService',
        output: stdout, 
      });
      return true;
    } catch (error) {
      this.logger.error('Error stopping Astro dev server with PM2', { error, context: 'AstroContentService' });
      return false;
    }
  }
}

export default AstroContentService;