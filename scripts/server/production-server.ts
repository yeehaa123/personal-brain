import { serve } from 'bun';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

// Get port number from environment or use default
const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 4322;
const PRODUCTION_DIR = join(process.cwd(), 'dist', 'production');

// Log the directory we're serving
console.log(`Starting production server for: ${PRODUCTION_DIR}`);

// Check if the directory exists and has files
try {
  const stats = await stat(PRODUCTION_DIR);
  if (!stats.isDirectory()) {
    console.error(`Error: ${PRODUCTION_DIR} is not a directory`);
    process.exit(1);
  }

  const files = await readdir(PRODUCTION_DIR);
  console.log(`Found ${files.length} files/directories in ${PRODUCTION_DIR}`);

  if (files.length === 0) {
    console.warn(`Warning: ${PRODUCTION_DIR} is empty`);
  }
} catch (error) {
  console.error(`Error accessing ${PRODUCTION_DIR}:`, error);
  process.exit(1);
}

// Create a simple file server
serve({
  port: PORT,
  fetch(request) {
    // Serve static files from the production directory
    const url = new URL(request.url);
    const filePath = join(PRODUCTION_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    
    // Return the file
    return new Response(Bun.file(filePath));
  },
  error(error) {
    // Handle errors
    console.error("Server error:", error);
    return new Response("Server Error", { status: 500 });
  },
});

console.log(`Production server running at http://localhost:${PORT}`);