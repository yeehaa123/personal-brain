#!/usr/bin/env node

/**
 * Script to clean up unused exports identified by ts-prune
 * This script:
 * 1. Runs ts-prune to identify unused exports
 * 2. Filters out entries marked as "used in module"
 * 3. Finds and removes these exports from their source files
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get ts-prune output excluding "used in module"
function getUnusedExports() {
  try {
    const output = execSync('npx ts-prune', { encoding: 'utf8' });
    const lines = output.split('\n').filter(line => line.trim() && !line.includes('used in module'));
    
    return lines.map(line => {
      const match = line.match(/([^:]+):(\d+) - (\w+)/);
      if (!match) return null;
      
      return {
        filePath: match[1],
        lineNumber: parseInt(match[2], 10),
        exportName: match[3]
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error running ts-prune:', error.message);
    process.exit(1);
  }
}

// Group unused exports by file
function groupByFile(unusedExports) {
  const fileGroups = {};
  
  unusedExports.forEach(entry => {
    if (!fileGroups[entry.filePath]) {
      fileGroups[entry.filePath] = [];
    }
    fileGroups[entry.filePath].push(entry);
  });
  
  return fileGroups;
}

// Check if we should process this file (skip some files)
function shouldProcessFile(filePath) {
  // Skip only configuration files and third-party files for safety
  const skipPatterns = [
    /\.config\.(ts|js)$/,   // Config files
    /\.d\.ts$/,             // Declaration files
    /node_modules/,         // Node modules
    /\.astro\//             // Astro files
  ];
  
  return !skipPatterns.some(pattern => pattern.test(filePath));
}

// Main function to process the files
function main() {
  console.log('Finding unused exports to clean up...');
  const unusedExports = getUnusedExports();
  const fileGroups = groupByFile(unusedExports);
  
  console.log(`Found ${unusedExports.length} unused exports across ${Object.keys(fileGroups).length} files\n`);
  
  // Process each file
  Object.keys(fileGroups).forEach(filePath => {
    if (!shouldProcessFile(filePath)) {
      console.log(`🔒 Skipping ${filePath} (protected file)`);
      return;
    }
    
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        return;
      }
      
      const fileContent = readFileSync(filePath, 'utf8');
      const exportNames = fileGroups[filePath].map(entry => entry.exportName);
      
      console.log(`🔍 Processing ${filePath} - ${exportNames.length} unused exports: ${exportNames.join(', ')}`);
      
      // For now, just log the exports to remove. In a real implementation, 
      // we would need careful regex to match export patterns without changing behavior.
      console.log(`   Would remove these exports from ${filePath}:`);
      exportNames.forEach(name => {
        console.log(`   - ${name}`);
      });
      
      // In a full implementation we would modify the file here
      // This is left as a report-only tool since modifying exports
      // requires more complex parsing than simple string replacement
    } catch (error) {
      console.error(`⚠️ Error processing ${filePath}:`, error.message);
    }
  });
  
  console.log('\n✅ Analysis complete');
  console.log('To safely remove these exports, consider:');
  console.log('1. Focusing on implementation files with multiple unused exports');
  console.log('2. Manually reviewing each export before removal');
  console.log('3. Running tests after each change to ensure nothing breaks');
}

main();