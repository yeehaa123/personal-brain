import { serve } from 'bun';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

// Get server type from command line args (preview or production)
const SERVER_TYPE = process.argv[2] || 'production';
const IS_PREVIEW = SERVER_TYPE === 'preview';

// Get port number from environment or use default
const PORT = IS_PREVIEW 
  ? (process.env['WEBSITE_PREVIEW_PORT'] ? parseInt(process.env['WEBSITE_PREVIEW_PORT']) : 4321)
  : (process.env['WEBSITE_PRODUCTION_PORT'] ? parseInt(process.env['WEBSITE_PRODUCTION_PORT']) : 4322);

// Set directory based on server type
const SERVER_DIR = SERVER_TYPE === 'preview' 
  ? join(process.cwd(), 'src', 'website', 'dist')
  : join(process.cwd(), 'dist', SERVER_TYPE);

// Log the directory we're serving
console.log(`Starting ${SERVER_TYPE} server for: ${SERVER_DIR}`);

// Check if the directory exists and has files
try {
  const stats = await stat(SERVER_DIR);
  if (!stats.isDirectory()) {
    console.error(`Error: ${SERVER_DIR} is not a directory`);
    process.exit(1);
  }

  const files = await readdir(SERVER_DIR);
  console.log(`Found ${files.length} files/directories in ${SERVER_DIR}`);

  if (files.length === 0) {
    console.warn(`Warning: ${SERVER_DIR} is empty`);
  }
} catch (error) {
  console.error(`Error accessing ${SERVER_DIR}:`, error);
  process.exit(1);
}

// Create a simple file server
serve({
  port: PORT,
  fetch(request) {
    // Serve static files from the directory
    const url = new URL(request.url);
    let pathname = url.pathname;
    
    // Handle root path
    if (pathname === '/') {
      pathname = 'index.html';
    }
    
    // Handle paths without extensions as potential routes needing index.html
    if (!pathname.includes('.')) {
      pathname = join(pathname, 'index.html');
    }
    
    const filePath = join(SERVER_DIR, pathname);
    
    // Return the file
    return new Response(Bun.file(filePath));
  },
  error(error) {
    // Handle errors
    console.error(`${SERVER_TYPE} server error:`, error);
    return new Response("Server Error", { status: 500 });
  },
});

console.log(`${SERVER_TYPE} server running at http://localhost:${PORT}`);