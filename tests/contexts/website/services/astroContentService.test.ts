import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { AstroContentService } from '@/contexts/website/services/astroContentService';
import { createTestLandingPageData } from '@test/helpers';

describe('AstroContentService', () => {
  let tempDir: string;
  let service: AstroContentService;
  
  // Setup a temporary directory for testing
  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `astro-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    service = new AstroContentService(tempDir);
  });
  
  // Clean up after tests
  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });
  
  test('verifyAstroProject should return false when project does not exist', async () => {
    const exists = await service.verifyAstroProject();
    expect(exists).toBe(false);
  });
  
  test('verifyAstroProject should return true when project exists', async () => {
    // Create minimal Astro project structure
    await fs.mkdir(path.join(tempDir, 'src', 'content'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'astro.config.mjs'), 'export default {};');
    await fs.writeFile(path.join(tempDir, 'src', 'content', 'config.ts'), 'export const collections = {};');
    
    const exists = await service.verifyAstroProject();
    expect(exists).toBe(true);
  });
  
  test('writeLandingPageContent should create directory and write file', async () => {
    const landingPageData = createTestLandingPageData();
    
    const success = await service.writeLandingPageContent(landingPageData);
    expect(success).toBe(true);
    
    // Check that file was created
    const filePath = path.join(tempDir, 'src', 'content', 'landingPage', 'profile.json');
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
    
    // Check file contents
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsedContent = JSON.parse(fileContent);
    expect(parsedContent).toEqual(landingPageData);
  });
  
  test('readLandingPageContent should return null when file does not exist', async () => {
    const data = await service.readLandingPageContent();
    expect(data).toBeNull();
  });
  
  test('readLandingPageContent should read and parse landing page data', async () => {
    // Set up test data
    const landingPageData = createTestLandingPageData({
      name: 'Custom User',
      tagline: 'Custom Tagline',
    });
    
    // Create directory and write file
    await fs.mkdir(path.join(tempDir, 'src', 'content', 'landingPage'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'content', 'landingPage', 'profile.json'),
      JSON.stringify(landingPageData),
    );
    
    // Read the data
    const data = await service.readLandingPageContent();
    expect(data).toEqual(landingPageData);
  });
  
  test('runAstroCommand should execute the given command', async () => {
    // We'll mock the spawn function for this test
    const mockSpawn = mock(() => {
      return {
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('Command executed'));
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };
    });
    
    service.setSpawnFunction(mockSpawn);
    
    const result = await service.runAstroCommand('build');
    
    expect(result.success).toBe(true);
    expect(result.output).toBe('Command executed');
    expect(mockSpawn).toHaveBeenCalled();
  });
  
  test('runAstroCommand should handle errors', async () => {
    // Mock spawn to simulate a failed command
    const mockSpawn = mock(() => {
      return {
        exited: Promise.resolve(1), // Non-zero exit code indicates failure
        stdout: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('Command failed'));
            controller.close();
          },
        }),
      };
    });
    
    service.setSpawnFunction(mockSpawn);
    
    const result = await service.runAstroCommand('build');
    
    expect(result.success).toBe(false);
    expect(result.output).toContain('Command failed');
  });
});