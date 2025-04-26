#!/usr/bin/env node

/**
 * Comprehensive Test Suite Reducer
 * 
 * This script safely removes low-value tests from the entire test suite
 * by completely replacing targeted test functions with comments.
 * 
 * Usage: bun run scripts/comprehensive-test-reducer.js
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// Create backup directory
const backupDir = path.join(process.cwd(), 'test-backups-full');
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

// Define patterns of tests to remove (using simpler string matching for reliability)
const patternsToRemove = [
  // These patterns match the test declaration line and then can be used to remove the whole block
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
  // Add patterns for 'it' style as well
  'it("getInstance returns',
  'it(\'getInstance returns',
  'it("resetInstance clears',
  'it(\'resetInstance clears',
  'it("createFresh creates',
  'it(\'createFresh creates',
  // Describe blocks for Component Interface Standardization pattern
  'describe("Component Interface Standardization pattern',
  'describe(\'Component Interface Standardization pattern'
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
    
    // Find the end of the block by tracking braces
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let endIndex = blockStart;
    
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
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
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

// Process each test file
console.log('\nProcessing test files...');

for (const filePath of testFiles) {
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

console.log('\nDone! Run "bun test" to verify the reduced test suite still passes.');