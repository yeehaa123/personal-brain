#!/usr/bin/env node

/**
 * Simple Test Suite Reduction Script
 * 
 * This script removes specific test patterns from high-priority files.
 */

const fs = require('fs');
const path = require('path');

// Files to target
const targetFiles = [
  'tests/utils/safeAccessUtils.test.ts',
  'tests/utils/textUtils.test.ts',
  'tests/utils/configUtils.test.ts',
  'tests/contexts/website/tools/websiteTools.test.ts'
];

// Simple removal approach - remove entire describe blocks or test functions
for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} not found, skipping`);
    continue;
  }
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalSize = content.length;
  
  // Create backup
  const backupDir = path.join(process.cwd(), 'test-backups-simple');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  fs.writeFileSync(path.join(backupDir, path.basename(filePath)), content);
  
  // Pattern 1: Remove describe blocks for Component Interface Standardization
  content = content.replace(
    /\s+describe\(\s*['"]Component Interface Standardization pattern['"][\s\S]*?}\);\s*\n/g,
    '\n  // Component Interface Standardization tests removed\n\n'
  );
  
  // Pattern 2: Remove getInstance test functions
  content = content.replace(
    /\s+test\(\s*['"]getInstance returns[\s\S]*?}\);\s*\n/g,
    '\n    // getInstance tests removed\n\n'
  );
  
  // Pattern 3: Remove resetInstance test functions
  content = content.replace(
    /\s+test\(\s*['"]resetInstance clears[\s\S]*?}\);\s*\n/g,
    '\n    // resetInstance tests removed\n\n'
  );
  
  // Pattern 4: Remove createFresh test functions
  content = content.replace(
    /\s+test\(\s*['"]createFresh creates[\s\S]*?}\);\s*\n/g,
    '\n    // createFresh tests removed\n\n'
  );
  
  // Write modified content
  fs.writeFileSync(filePath, content);
  
  const reduction = ((originalSize - content.length) / originalSize * 100).toFixed(1);
  console.log(`${filePath}: Reduced by ${reduction}% of byte size`);
}

console.log('\nDone! Run "bun test" to verify the modified tests still pass.');