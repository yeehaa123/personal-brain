import { serve } from 'bun';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import config from '../../src/config';

// Get server type from command line args (preview or live)
const SERVER_TYPE = process.argv[2] || 'live';
const IS_PREVIEW = SERVER_TYPE === 'preview';

// Get port number from configuration
const PORT = IS_PREVIEW 
  ? config.website.deployment.previewPort
  : config.website.deployment.livePort;

// Set directory based on server type
const SERVER_DIR = SERVER_TYPE === 'preview' 
  ? join(process.cwd(), 'src', 'website', 'dist')
  : join(process.cwd(), 'dist', 'live');

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
    
    // Debug CSS requests specifically
    if (pathname.includes('.css')) {
      console.log(`CSS file requested: ${pathname}`);
    }
    
    // Handle root path
    if (pathname === '/') {
      pathname = 'index.html';
    }
    
    // Handle paths without extensions as potential routes needing index.html
    if (!pathname.includes('.')) {
      pathname = join(pathname, 'index.html');
    }
    
    const filePath = join(SERVER_DIR, pathname);
    
    // Debug file path for CSS files
    if (pathname.includes('.css')) {
      console.log(`Looking for CSS at: ${filePath}`);
      // Check if file exists
      try {
        const stat = Bun.file(filePath).size;
        console.log(`CSS file size: ${stat} bytes`);
      } catch (e) {
        console.error(`CSS file not found or inaccessible: ${filePath}`);
      }
    }
    
    // Set correct MIME types based on file extension
    const fileExtension = pathname.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'json': 'application/json',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
    };
    
    // Get the appropriate Content-Type header
    const contentType = fileExtension && mimeTypes[fileExtension] ? mimeTypes[fileExtension] : 'application/octet-stream';
    
    if (pathname.includes('.css')) {
      console.log(`Using content type: ${contentType} for ${pathname}`);
    }
    
    // Create file reference
    const file = Bun.file(filePath);
    
    // Return the file with the correct Content-Type header
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });
  },
  error(error) {
    // Handle errors
    console.error(`${SERVER_TYPE} server error:`, error);
    return new Response("Server Error", { status: 500 });
  },
});

console.log(`${SERVER_TYPE} server running at http://localhost:${PORT}`);