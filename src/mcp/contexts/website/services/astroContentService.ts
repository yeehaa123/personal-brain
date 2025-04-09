import fs from 'fs/promises';
import path from 'path';

import { Logger } from '@/utils/logger';

import type { LandingPageData } from '../storage/websiteStorage';

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
   */
  async writeLandingPageContent(data: LandingPageData): Promise<boolean> {
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
   */
  async readLandingPageContent(): Promise<LandingPageData | null> {
    try {
      const filePath = path.join(this.contentCollectionPath, 'landingPage', 'profile.json');
      
      const exists = await fs.access(filePath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) {
        return null;
      }
      
      const rawData = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(rawData) as LandingPageData;
    } catch (error) {
      this.logger.error('Error reading landing page content', { error, context: 'AstroContentService' });
      return null;
    }
  }
  
  /**
   * Run an Astro command (dev, build, preview)
   */
  async runAstroCommand(command: string): Promise<{ success: boolean; output: string }> {
    try {
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
   * Kill any running Astro process
   * Primarily used to stop preview servers
   */
  async killProcess(): Promise<boolean> {
    try {
      // Simple implementation using pkill for now
      // This assumes Astro is running as a separate process
      const proc = this.spawnFunction({
        cmd: ['pkill', '-f', 'astro.*--root'],
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      // Check exit code - note that pkill returns 0 even if no processes were killed
      await proc.exited;
      
      this.logger.info('Astro process killed successfully', { context: 'AstroContentService' });
      return true;
    } catch (error) {
      this.logger.error('Error killing Astro process', { error, context: 'AstroContentService' });
      return false;
    }
  }
}

export default AstroContentService;