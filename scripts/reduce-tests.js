#!/usr/bin/env node

/**
 * Test Suite Reduction Script
 * 
 * This script automates the process of removing low-value tests from the test suite
 * to focus on business logic tests.
 * 
 * Usage: bun run scripts/reduce-tests.js
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// Define patterns for tests to remove
const patternsToRemove = [
  // Component Interface Standardization tests
  /\s+(test|it)\s*\([^)]*['"].*getInstance returns.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*resetInstance clears.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*createFresh creates.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should follow the singleton pattern.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should support resetInstance.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should support createFresh.*['"]/g,
  
  // Simple getter/setter tests
  /\s+(test|it)\s*\([^)]*['"].*getContextName should return.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*getContextVersion should return.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should have a start method.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should have a stop method.*['"]/g,
  
  // Structure verification tests
  /\s+(test|it)\s*\([^)]*['"].*Component Interface Standardization pattern.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should follow the(.*?)pattern.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should have property.*['"]/g,
  /\s+(test|it)\s*\([^)]*['"].*should implement.*interface.*['"]/g,
];

// Utility test files that could be minimized substantially
const highPriorityFiles = [
  'tests/utils/safeAccessUtils.test.ts',
  'tests/utils/textUtils.test.ts',
  'tests/utils/typeGuards.test.ts',
  'tests/utils/configUtils.test.ts',
  'tests/contexts/website/tools/websiteTools.test.ts',
  'tests/contexts/profiles/core/profileContext.test.ts',
  'tests/contexts/conversations/conversationContext.test.ts',
  'tests/contexts/externalSources/externalSourceContext.test.ts',
  'tests/protocol/messaging/contextMediator.test.ts',
  'tests/protocol/core/contextOrchestrator.test.ts',
];

// Create a backup directory
const backupDir = path.join(process.cwd(), 'test-backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Count total tests in a file
function countTests(content) {
  const testMatches = content.match(/\b(test|it)\s*\(/g) || [];
  return testMatches.length;
}

// Find all test files
console.log('Scanning for test files...');
const testFiles = globSync('tests/**/*.test.ts');
console.log(`Found ${testFiles.length} test files`);

// Track statistics
let totalTestsBefore = 0;
let totalTestsRemoved = 0;
let filesModified = 0;

// Process high priority files first
console.log('\nProcessing high priority files first:');
const highPriorityResults = [];

for (const file of highPriorityFiles) {
  if (!fs.existsSync(file)) {
    console.log(`  - ${file} (not found, skipping)`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const testsBefore = countTests(content);
  totalTestsBefore += testsBefore;

  // Create backup
  const backupFile = path.join(backupDir, path.basename(file));
  fs.writeFileSync(backupFile, content);
  
  let modifiedContent = content;
  let testsRemoved = 0;
  
  // Apply each pattern to remove tests
  for (const pattern of patternsToRemove) {
    const matches = content.match(pattern) || [];
    testsRemoved += matches.length;
    
    // Remove the entire test block
    modifiedContent = modifiedContent.replace(pattern, () => {
      return `// Removed low-value test\n`;
    });
  }
  
  // Additional pattern: Remove describe blocks for Component Interface Standardization
  modifiedContent = modifiedContent.replace(
    /\s+describe\(['"]Component Interface Standardization pattern['"],([\s\S]*?)\s+}\);/g,
    (match) => {
      // Count tests removed in this block
      const blockTests = match.match(/\s+(test|it)\s*\(/g) || [];
      testsRemoved += blockTests.length;
      return `// Removed Component Interface Standardization test block\n`;
    }
  );
  
  // Only write to file if changes were made
  if (modifiedContent !== content) {
    fs.writeFileSync(file, modifiedContent);
    filesModified++;
    totalTestsRemoved += testsRemoved;
    
    const testsAfter = countTests(modifiedContent);
    highPriorityResults.push({
      file,
      before: testsBefore,
      after: testsAfter,
      removed: testsRemoved
    });
    
    console.log(`  - ${file}: ${testsBefore} → ${testsAfter} tests (${testsRemoved} removed)`);
  } else {
    console.log(`  - ${file}: No changes needed`);
  }
}

// Process remaining files
console.log('\nProcessing remaining test files:');
const remainingFiles = testFiles.filter(file => !highPriorityFiles.includes(file));
const remainingResults = [];

for (const file of remainingFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const testsBefore = countTests(content);
  totalTestsBefore += testsBefore;

  // Create backup
  const backupFile = path.join(backupDir, path.basename(file));
  fs.writeFileSync(backupFile, content);
  
  let modifiedContent = content;
  let testsRemoved = 0;
  
  // Apply each pattern to remove tests
  for (const pattern of patternsToRemove) {
    const matches = content.match(pattern) || [];
    testsRemoved += matches.length;
    
    // Remove the entire test block
    modifiedContent = modifiedContent.replace(pattern, () => {
      return `// Removed low-value test\n`;
    });
  }
  
  // Additional pattern: Remove describe blocks for Component Interface Standardization
  modifiedContent = modifiedContent.replace(
    /\s+describe\(['"]Component Interface Standardization pattern['"],([\s\S]*?)\s+}\);/g,
    (match) => {
      // Count tests removed in this block
      const blockTests = match.match(/\s+(test|it)\s*\(/g) || [];
      testsRemoved += blockTests.length;
      return `// Removed Component Interface Standardization test block\n`;
    }
  );
  
  // Only write to file if changes were made
  if (modifiedContent !== content && testsRemoved > 0) {
    fs.writeFileSync(file, modifiedContent);
    filesModified++;
    totalTestsRemoved += testsRemoved;
    
    const testsAfter = countTests(modifiedContent);
    remainingResults.push({
      file,
      before: testsBefore,
      after: testsAfter,
      removed: testsRemoved
    });
    
    // Only log files with significant changes
    if (testsRemoved > 2) {
      console.log(`  - ${file}: ${testsBefore} → ${testsAfter} tests (${testsRemoved} removed)`);
    }
  }
}

// Print summary
console.log('\nSummary:');
console.log(`Total test files processed: ${testFiles.length}`);
console.log(`Files modified: ${filesModified}`);
console.log(`Total tests before: ${totalTestsBefore}`);
console.log(`Tests removed: ${totalTestsRemoved}`);
console.log(`Estimated tests remaining: ${totalTestsBefore - totalTestsRemoved}`);
console.log(`Estimated reduction: ${((totalTestsRemoved / totalTestsBefore) * 100).toFixed(1)}%`);
console.log(`Backups created in: ${backupDir}`);

// Show top reductions
console.log('\nTop 10 files with most tests removed:');
const allResults = [...highPriorityResults, ...remainingResults]
  .sort((a, b) => b.removed - a.removed)
  .slice(0, 10);

allResults.forEach((result, index) => {
  console.log(`${index + 1}. ${result.file}: ${result.before} → ${result.after} tests (${result.removed} removed)`);
});

console.log('\nDone! Run "bun test" to verify the reduced test suite still passes.');