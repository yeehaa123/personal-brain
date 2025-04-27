#!/usr/bin/env node

/**
 * Aggressive Test Suite Reducer
 * 
 * This script removes low-value tests more aggressively than the previous version,
 * targeting additional patterns beyond Component Interface Standardization tests.
 * 
 * Usage: bun run scripts/aggressive-test-reducer.js
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// Create backup directory with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(process.cwd(), `test-backups-aggressive-${timestamp}`);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log(`Created backup directory: ${backupDir}`);
}

// Define test file patterns to search for
const testFilesGlob = 'tests/**/*.test.ts';

// Find all test files
console.log(`Finding test files matching pattern: ${testFilesGlob}`);
const testFiles = globSync(testFilesGlob);
console.log(`Found ${testFiles.length} test files to process`);

// Define patterns of tests to remove (significantly expanded from previous version)
const patternsToRemove = [
  // Original Component Interface Standardization patterns
  'test("getInstance returns',
  'test(\'getInstance returns',
  'test("resetInstance clears',
  'test(\'resetInstance clears',
  'test("createFresh creates',
  'test(\'createFresh creates',
  'test("should follow the singleton pattern',
  'test(\'should follow the singleton pattern',
  'test("should support resetInstance',
  'test(\'should support resetInstance',
  'test("should support createFresh',
  'test(\'should support createFresh',
  'test("getContextName should return',
  'test(\'getContextName should return',
  'test("getContextVersion should return',
  'test(\'getContextVersion should return',
  'test("should have a start method',
  'test(\'should have a start method',
  'test("should have a stop method',
  'test(\'should have a stop method',
  
  // 'it' style tests for the above
  'it("getInstance returns',
  'it(\'getInstance returns',
  'it("resetInstance clears',
  'it(\'resetInstance clears',
  'it("createFresh creates',
  'it(\'createFresh creates',
  
  // Describe blocks for Component Interface Standardization pattern
  'describe("Component Interface Standardization pattern',
  'describe(\'Component Interface Standardization pattern',
  
  // NEW: Simple getter/setter tests without business logic
  'test("should get ',
  'test(\'should get ',
  'test("should set ',
  'test(\'should set ',
  'it("should get ',
  'it(\'should get ',
  'it("should set ',
  'it(\'should set ',
  
  // NEW: Initialization tests
  'test("should initialize',
  'test(\'should initialize',
  'test("initialize should',
  'test(\'initialize should',
  'it("should initialize',
  'it(\'should initialize',
  'it("initialize should',
  'it(\'initialize should',
  'test("isInitialized should',
  'test(\'isInitialized should',
  'it("isInitialized should',
  'it(\'isInitialized should',
  
  // NEW: Basic property existence tests
  'test("should have property',
  'test(\'should have property',
  'test("should have a property',
  'test(\'should have a property',
  'it("should have property',
  'it(\'should have property',
  'it("should have a property',
  'it(\'should have a property',
  
  // NEW: Interface conformance tests (just checking structure)
  'test("should implement',
  'test(\'should implement',
  'test("should conform to',
  'test(\'should conform to',
  'it("should implement',
  'it(\'should implement',
  'it("should conform to',
  'it(\'should conform to',
  
  // NEW: Constructor tests
  'test("constructor should',
  'test(\'constructor should',
  'it("constructor should',
  'it(\'constructor should',
  
  // NEW: Describe blocks for low-value test categories
  'describe("Initialization',
  'describe(\'Initialization',
  'describe("Constructor',
  'describe(\'Constructor',
  'describe("Properties',
  'describe(\'Properties',
  'describe("Getters and Setters',
  'describe(\'Getters and Setters',
  
  // NEW: Basic error case tests without business logic
  'test("should throw if not initialized',
  'test(\'should throw if not initialized',
  'it("should throw if not initialized',
  'it(\'should throw if not initialized',
  
  // NEW: Empty implementation tests
  'test("should have an empty implementation',
  'test(\'should have an empty implementation',
  'it("should have an empty implementation',
  'it(\'should have an empty implementation',
  
  // NEW: Interface/structure tests
  'test("should match the interface',
  'test(\'should match the interface',
  'it("should match the interface',
  'it(\'should match the interface',
  
  // NEW: Default values tests
  'test("should have default values',
  'test(\'should have default values',
  'it("should have default values',
  'it(\'should have default values'
];

// Tracking variables
let totalTestsRemoved = 0;
let filesModified = 0;
let totalLinesRemoved = 0;
const fileResults = [];

/**
 * Removes a test function or describe block from the content
 * This works by finding the opening pattern, then walking through
 * the content to find the matching closing brace and parenthesis.
 */
function removeTestBlock(content, pattern) {
  // Find all instances of the pattern
  let result = content;
  let index = result.indexOf(pattern);
  
  while (index !== -1) {
    // Find the start of the block
    const blockStart = index;
    
    // Search backward to find the start of the line
    let lineStart = blockStart;
    while (lineStart > 0 && result[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Check if this line is already commented out
    const linePrefix = result.substring(lineStart, blockStart);
    if (linePrefix.trim().startsWith('//')) {
      // Skip this instance as it's already commented out
      index = result.indexOf(pattern, blockStart + 1);
      continue;
    }
    
    // Find the end of the block by tracking braces
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let endIndex = blockStart;
    let foundOpeningBrace = false;
    
    for (let i = blockStart; i < result.length; i++) {
      const char = result[i];
      
      // Skip counting braces in strings
      if ((char === '"' || char === "'") && (i === 0 || result[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      } else if (!inString) {
        if (char === '{') {
          if (!foundOpeningBrace) {
            foundOpeningBrace = true;
          }
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0 && foundOpeningBrace) {
            // Found the closing brace, now find the closing parenthesis
            for (let j = i + 1; j < result.length; j++) {
              if (result[j] === ')') {
                endIndex = j + 1;
                // Also include any following semicolon and whitespace
                if (j + 1 < result.length && result[j + 1] === ';') {
                  endIndex++;
                }
                break;
              }
            }
            break;
          }
        }
      }
    }
    
    if (endIndex > blockStart) {
      // Count the number of lines in the removed block
      const removedBlock = result.substring(blockStart, endIndex);
      const lineCount = (removedBlock.match(/\n/g) || []).length;
      
      // Replace the test block with a comment
      const isDescribe = pattern.includes('describe');
      const commentPrefix = isDescribe ? '  // REMOVED BLOCK: ' : '  // REMOVED TEST: ';
      
      result = 
        result.substring(0, blockStart) + 
        `${commentPrefix}${pattern.substring(0, 40)}...\n` +
        result.substring(endIndex);
      
      totalLinesRemoved += lineCount;
      totalTestsRemoved++;
    }
    
    // Find the next instance
    index = result.indexOf(pattern, blockStart + 1);
  }
  
  return result;
}

/**
 * Clean up describe blocks that are now empty
 */
function cleanupEmptyDescribeBlocks(content) {
  const emptyDescribePattern = /describe\(['"](.*?)['"][\s\S]*?{\s*?(?:(?:\/\/.*?\n)\s*?)*?\}\s*?\);/g;
  let result = content;
  let match;
  let emptyBlocksRemoved = 0;

  while ((match = emptyDescribePattern.exec(result)) !== null) {
    const fullMatch = match[0];
    const blockText = fullMatch.substring(fullMatch.indexOf('{'), fullMatch.lastIndexOf('}')+1);
    
    // Check if the block is effectively empty (just comments and whitespace)
    const strippedBlock = blockText.replace(/\/\/.*?\n/g, '').replace(/\s+/g, '');
    
    if (strippedBlock === '{}') {
      // Count the number of lines in the removed block
      const lineCount = (fullMatch.match(/\n/g) || []).length;
      
      // Replace with comment
      result = result.substring(0, match.index) + 
        `  // REMOVED EMPTY DESCRIBE: ${match[1]}\n` +
        result.substring(match.index + fullMatch.length);
        
      emptyBlocksRemoved++;
      totalLinesRemoved += lineCount;
      
      // Reset exec to search from the beginning of the modified string
      emptyDescribePattern.lastIndex = 0;
    }
  }
  
  totalTestsRemoved += emptyBlocksRemoved;
  return result;
}

/**
 * Clean up empty imports that may be left after removing tests
 */
function cleanupUnusedImports(content, filePath) {
  // Skip cleaning imports for files with manual fixes needed
  const skipFiles = [
    'tests/contexts/website/services/serverManager.test.ts',
    'tests/interfaces/cli-app.test.ts',
    'tests/contexts/conversations/inMemoryStorage.test.ts'
  ];
  
  if (skipFiles.includes(filePath)) {
    return content;
  }
  
  // Replace imports from class that may now be unused after removing Component Interface tests
  const importPatterns = [
    // Match pattern: "import { ClassA, ClassB } from 'path';" 
    // where ClassB might be removed
    /import\s*{([^}]+)}\s*from\s*['"][^'"]+['"]\s*;/g,
    
    // Match pattern: "import type { TypeA, TypeB } from 'path';"
    // where TypeB might be removed
    /import\s*type\s*{([^}]+)}\s*from\s*['"][^'"]+['"]\s*;/g
  ];
  
  let result = content;
  
  for (const pattern of importPatterns) {
    result = result.replace(pattern, (match, importList) => {
      // Split the import list by commas, and trim each entry
      const imports = importList.split(',').map(i => i.trim());
      
      // Check if any imports are referenced in the file content
      // excluding the import statement itself
      const contentWithoutThisImport = result.replace(match, '');
      
      const usedImports = imports.filter(imp => {
        // Skip empty imports
        if (!imp) return false;
        
        // Handle renamed imports like "ClassA as A"
        const actualName = imp.split(' as ')[0].trim();
        
        // Check if the import is used in the content
        return new RegExp(`\\b${actualName}\\b`).test(contentWithoutThisImport);
      });
      
      if (usedImports.length === 0) {
        // If no imports are used, remove the entire import statement
        return '// ' + match;
      } else if (usedImports.length !== imports.length) {
        // If some imports are unused, update the import statement
        return match.replace(importList, usedImports.join(', '));
      }
      
      // If all imports are used, keep the statement as is
      return match;
    });
  }
  
  return result;
}

// Process each test file
console.log('\nProcessing test files...');

for (const filePath of testFiles) {
  // Skip files that are known to need manual fixes
  const skipFiles = [
    // Add any files that need manual attention after the automated pass
  ];
  
  if (skipFiles.includes(filePath)) {
    console.log(`Skipping ${filePath} as it requires manual attention.`);
    continue;
  }
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalSize = content.length;
  const originalLineCount = (content.match(/\n/g) || []).length + 1;
  
  // Create backup
  const backupFilePath = path.join(backupDir, filePath.replace(/^tests\//, ''));
  const backupDirPath = path.dirname(backupFilePath);
  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }
  fs.writeFileSync(backupFilePath, content);
  
  // Process each pattern
  let blockCount = 0;
  const fileStart = Date.now();
  
  for (const pattern of patternsToRemove) {
    if (content.includes(pattern)) {
      content = removeTestBlock(content, pattern);
      blockCount++;
    }
  }
  
  // Clean up empty describe blocks after removing tests
  content = cleanupEmptyDescribeBlocks(content);
  
  // Clean up unused imports
  content = cleanupUnusedImports(content, filePath);
  
  // Only write file if changes were made
  if (originalSize !== content.length) {
    fs.writeFileSync(filePath, content);
    filesModified++;
    
    const newLineCount = (content.match(/\n/g) || []).length + 1;
    const linesRemoved = originalLineCount - newLineCount;
    const percent = ((originalSize - content.length) / originalSize * 100).toFixed(1);
    
    fileResults.push({
      filePath,
      originalSize,
      newSize: content.length,
      sizeReduction: originalSize - content.length,
      percentReduction: percent,
      linesRemoved,
      blockCount
    });
    
    console.log(
      `${filePath}: Removed ${blockCount} blocks (${linesRemoved} lines, ${percent}% reduction)`
    );
  }
}

// Sort results by size reduction
fileResults.sort((a, b) => b.sizeReduction - a.sizeReduction);

// Display summary
console.log('\nSummary:');
console.log(`Processed ${testFiles.length} test files`);
console.log(`Modified ${filesModified} files`);
console.log(`Removed ${totalTestsRemoved} test blocks`);
console.log(`Removed approximately ${totalLinesRemoved} lines of code`);
console.log(`Created backups in ${backupDir}`);

// Display top 10 files with most reduction
console.log('\nTop 10 files with most reduction:');
fileResults.slice(0, 10).forEach((result, i) => {
  console.log(
    `${i + 1}. ${result.filePath}: ${result.linesRemoved} lines removed (${result.percentReduction}% reduction)`
  );
});

console.log('\nImportant: This is an aggressive reduction. Please run "bun test" to verify the reduced test suite still passes.');
console.log('You may need to manually fix some test files if syntax errors occur.\n');