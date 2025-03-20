#!/usr/bin/env bun
import { resolve } from 'path';
import { importMarkdownDirectory, importMarkdownFile } from './importers/markdownImporter';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  bun run src/import.ts <path-to-markdown-or-directory>

Examples:
  bun run src/import.ts ./articles
  bun run src/import.ts ./articles/my-note.md
    `);
    process.exit(1);
  }

  const path = resolve(args[0]);
  
  try {
    const stats = await Bun.file(path).stat();
    
    if (stats.isDirectory()) {
      console.log(`Importing markdown files from directory: ${path}`);
      const result = await importMarkdownDirectory(path);
      console.log(`Import complete. Imported: ${result.imported}, Failed: ${result.failed}`);
    } else if (stats.isFile()) {
      console.log(`Importing markdown file: ${path}`);
      const id = await importMarkdownFile(path);
      console.log(`Successfully imported file with ID: ${id}`);
    } else {
      console.error(`Path is neither a file nor directory: ${path}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

main();