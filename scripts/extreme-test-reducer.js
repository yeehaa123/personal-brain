#!/usr/bin/env node

/**
 * Extreme Test Suite Reducer
 * 
 * This script aggressively targets singleton pattern tests and other low-value tests
 * using more precise pattern matching for significantly better results.
 * 
 * Usage: bun run scripts/extreme-test-reducer.js
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// Create backup directory with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(process.cwd(), `test-backups-extreme-${timestamp}`);
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

// Define patterns to target entire describe blocks
const describeBlockPatterns = [
  // Singleton pattern describe blocks
  /describe\(\s*['"]Component Interface Standardization pattern['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]getInstance method['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]resetInstance method['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]createFresh method['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]Singleton pattern['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]Initialization['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]Constructor['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]Properties['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  /describe\(\s*['"]Getters and Setters['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
];

// Define patterns to target individual test blocks
const testBlockPatterns = [
  // getInstance tests using more precise patterns
  /(?:test|it)\(\s*['"]getInstance(?:\(\))?\s+(?:should\s+)?returns?[\s\S]*?(?:expect[\s\S]*?getInstance[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+(?:follow|implement|use)\s+(?:the\s+)?singleton\s+pattern[\s\S]*?(?:expect[\s\S]*?getInstance[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+return\s+(?:the\s+)?same\s+instance[\s\S]*?(?:expect[\s\S]*?getInstance[\s\S]*?}\s*\)\s*;)/g,
  
  // resetInstance tests
  /(?:test|it)\(\s*['"]resetInstance(?:\(\))?\s+(?:should\s+)?clears?[\s\S]*?(?:resetInstance[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+support\s+resetInstance[\s\S]*?(?:resetInstance[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+reset\s+the\s+instance[\s\S]*?(?:resetInstance[\s\S]*?}\s*\)\s*;)/g,
  
  // createFresh tests
  /(?:test|it)\(\s*['"]createFresh(?:\(\))?\s+(?:should\s+)?creates?[\s\S]*?(?:createFresh[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+support\s+createFresh[\s\S]*?(?:createFresh[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+create\s+a\s+new\s+instance[\s\S]*?(?:createFresh[\s\S]*?}\s*\)\s*;)/g,
  
  // getContextName/Version tests
  /(?:test|it)\(\s*['"]getContextName(?:\(\))?\s+should\s+return[\s\S]*?(?:getContextName[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]getContextVersion(?:\(\))?\s+should\s+return[\s\S]*?(?:getContextVersion[\s\S]*?}\s*\)\s*;)/g,
  
  // Basic method existence tests
  /(?:test|it)\(\s*['"]should\s+have\s+(?:an?\s+)?(\w+)\s+method['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  
  // Default value tests
  /(?:test|it)\(\s*['"]should\s+have\s+default\s+values['"][^{]*{[\s\S]*?}\s*\)\s*;/g,
  
  // Initialization checks
  /(?:test|it)\(\s*['"](?:initialize|should\s+initialize)[\s\S]*?(?:initialize[\s\S]*?}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]isInitialized[\s\S]*?(?:isInitialized[\s\S]*?}\s*\)\s*;)/g,
  
  // Interface/property tests
  /(?:test|it)\(\s*['"]should\s+(?:implement|conform\s+to|match\s+the\s+interface)[\s\S]*?(?:}\s*\)\s*;)/g,
  /(?:test|it)\(\s*['"]should\s+have\s+(?:a\s+)?property[\s\S]*?(?:}\s*\)\s*;)/g,
];

// Tracking variables
let totalTestsRemoved = 0;
let filesModified = 0;
let totalLinesRemoved = 0;
const fileResults = [];

/**
 * Removes blocks matching regex patterns
 */
function removePatternBlocks(content, patterns) {
  let result = content;
  let removedBlocks = 0;
  let removedLines = 0;
  
  for (const pattern of patterns) {
    const matches = [...result.matchAll(pattern)];
    
    if (matches.length > 0) {
      for (const match of matches) {
        const fullMatch = match[0];
        const lineCount = (fullMatch.match(/\n/g) || []).length;
        
        // Get a comment description
        let commentText = fullMatch.substring(0, 40).replace(/\n/g, ' ').trim();
        if (commentText.length >= 40) {
          commentText += '...';
        }
        
        // Replace with comment
        result = result.replace(fullMatch, `  // REMOVED: ${commentText}\n`);
        
        removedBlocks++;
        removedLines += lineCount;
      }
    }
  }
  
  return {
    content: result,
    removedBlocks,
    removedLines
  };
}

/**
 * Clean up empty describe blocks after removing tests
 */
function cleanupEmptyDescribeBlocks(content) {
  // Simple regex to find describe blocks with just comments inside
  const emptyDescribePattern = /describe\(['"](.*?)['"],\s*(?:.*?=>)?\s*{(\s*\/\/[^\n]*\n)*\s*}\s*\);/g;
  let result = content;
  let removedBlocks = 0;
  let removedLines = 0;
  
  let match;
  while ((match = emptyDescribePattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const blockName = match[1];
    const lineCount = (fullMatch.match(/\n/g) || []).length;
    
    // Replace with comment
    result = result.replace(fullMatch, `// REMOVED EMPTY BLOCK: describe("${blockName}")\n`);
    
    removedBlocks++;
    removedLines += lineCount;
    
    // Reset the regex to avoid infinite loop with global flag
    emptyDescribePattern.lastIndex = 0;
    content = result;
  }
  
  return {
    content: result,
    removedBlocks,
    removedLines
  };
}

/**
 * Clean up unused imports
 */
function cleanupUnusedImports(content, filePath) {
  // Skip files that are known to be problematic
  const skipFiles = [
    'tests/contexts/website/services/serverManager.test.ts',
    'tests/interfaces/cli-app.test.ts',
    'tests/contexts/conversations/inMemoryStorage.test.ts'
  ];
  
  if (skipFiles.includes(filePath)) {
    return {
      content,
      removedLines: 0
    };
  }
  
  const originalLength = content.length;
  let result = content;
  
  // Comment out imports that are no longer used
  const importPatterns = [
    // Regular imports
    /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]\s*;/g,
    // Type imports
    /import\s*type\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]\s*;/g
  ];
  
  for (const pattern of importPatterns) {
    result = result.replace(pattern, (match, importList, source) => {
      // Skip if already commented
      if (match.trim().startsWith('//')) {
        return match;
      }
      
      // Split and trim the imports
      const imports = importList.split(',').map(i => i.trim());
      
      // Check each import to see if it's still used
      const unusedImports = imports.filter(imp => {
        if (!imp) return false;
        
        // Handle renamed imports
        const actualName = imp.split(' as ')[0].trim();
        
        // Exclude the import statement itself to avoid false positives
        const contentWithoutThisImport = result.replace(match, '');
        
        // Look for the import name as a word boundary
        const importRegex = new RegExp(`\\b${actualName}\\b`, 'g');
        return !importRegex.test(contentWithoutThisImport);
      });
      
      // If all imports are unused, comment out the whole import
      if (unusedImports.length === imports.length) {
        return `// ${match} // Commented by test reducer - no longer used`;
      }
      
      // If some imports are unused, modify the import list
      if (unusedImports.length > 0) {
        const usedImports = imports.filter(imp => !unusedImports.includes(imp));
        return `import { ${usedImports.join(', ')} } from '${source}';`;
      }
      
      // If all imports are used, leave as is
      return match;
    });
  }
  
  const removedLines = originalLength - result.length > 0 ? 
    (content.match(/\n/g) || []).length - (result.match(/\n/g) || []).length : 0;
  
  return {
    content: result,
    removedLines
  };
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
  
  // PHASE 1: Remove describe blocks first
  const describeResult = removePatternBlocks(content, describeBlockPatterns);
  content = describeResult.content;
  
  // PHASE 2: Remove individual test blocks
  const testResult = removePatternBlocks(content, testBlockPatterns);
  content = testResult.content;
  
  // PHASE 3: Clean up empty describe blocks
  const cleanupResult = cleanupEmptyDescribeBlocks(content);
  content = cleanupResult.content;
  
  // PHASE 4: Clean up unused imports
  const importResult = cleanupUnusedImports(content, filePath);
  content = importResult.content;
  
  // Calculate total blocks and lines removed
  const totalBlocksRemoved = describeResult.removedBlocks + testResult.removedBlocks + cleanupResult.removedBlocks;
  const totalFileLines = describeResult.removedLines + testResult.removedLines + 
                          cleanupResult.removedLines + importResult.removedLines;
  
  // Only write file if changes were made
  if (originalSize !== content.length) {
    fs.writeFileSync(filePath, content);
    filesModified++;
    
    const percent = ((originalSize - content.length) / originalSize * 100).toFixed(1);
    
    fileResults.push({
      filePath,
      originalSize,
      newSize: content.length,
      sizeReduction: originalSize - content.length,
      percentReduction: percent,
      linesRemoved: totalFileLines,
      blocksRemoved: totalBlocksRemoved
    });
    
    console.log(
      `${filePath}: Removed ${totalBlocksRemoved} blocks (${totalFileLines} lines, ${percent}% reduction)`
    );
    
    totalTestsRemoved += totalBlocksRemoved;
    totalLinesRemoved += totalFileLines;
  }
}

// Sort results by size reduction
fileResults.sort((a, b) => b.sizeReduction - a.sizeReduction);

// Display summary
console.log('\nSummary:');
console.log(`Processed ${testFiles.length} test files`);
console.log(`Modified ${filesModified} files`);
console.log(`Removed approximately ${totalTestsRemoved} test blocks`);
console.log(`Removed approximately ${totalLinesRemoved} lines of code`);
console.log(`Created backups in ${backupDir}`);

// Display top 10 files with most reduction
console.log('\nTop 10 files with most reduction:');
fileResults.slice(0, 10).forEach((result, i) => {
  console.log(
    `${i + 1}. ${result.filePath}: ${result.linesRemoved} lines removed (${result.percentReduction}% reduction)`
  );
});

console.log('\nWarning: This is an extremely aggressive reduction. Run "bun test" to verify tests still pass.');
console.log('You may need to manually fix syntax errors in some test files.\n');