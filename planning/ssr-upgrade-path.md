# Server-Side Rendering (SSR) Upgrade Plan

## Overview

This document outlines the plan for upgrading the static website deployment to a full server-side rendering (SSR) implementation using Astro SSR with Bun as the runtime. This upgrade maintains the bot-centered deployment approach and works seamlessly with the hybrid PM2-Caddy architecture.

## Goals

- Implement Astro SSR with Bun runtime
- Maintain the existing preview → production workflow
- Update bot commands to handle SSR processes
- Configure Caddy as a reverse proxy to Bun servers
- Ensure process management and reliability
- Preserve existing command interface for seamless transition

## Architecture Changes

### Current Static Architecture with Caddy

```
Client Request → Caddy → PM2 Static Server → Static Files
```

### New SSR Architecture with Caddy

```
Client Request → Caddy → PM2-managed Bun Server (Astro SSR) → Dynamic Response
```

### Process Structure

- **Preview Environment**: 
  - Bun server running on port 3001
  - Managed via PM2 as "website-preview"
  - Proxied through Caddy at preview.yourdomain.com

- **Production Environment**:
  - Bun server running on port 3000
  - Managed via PM2 as "website-production"
  - Proxied through Caddy at yourdomain.com

## Implementation Plan

### 1. Update Astro Configuration

1. **Add Bun Adapter to Project**:
   ```bash
   cd /home/yeehaa/Documents/personal-brain/src/website
   bun add @astrojs/bun
   ```

2. **Update astro.config.mjs**:
   ```javascript
   // astro.config.mjs
   import { defineConfig } from 'astro/config';
   import bun from '@astrojs/bun';
   
   export default defineConfig({
     output: 'server',  // Change from 'static' to 'server'
     adapter: bun(),
     // Other configuration remains the same
   });
   ```

### 2. Create Server Scripts

Create server scripts for both environments:

**For Preview** (`/home/yeehaa/Documents/personal-brain/src/website/server.js`):
```javascript
import { serve } from "bun";
import { handler } from "./dist/server/entry.mjs";

console.log("Starting preview server on port 3001");

serve({
  port: 3001,
  fetch: handler,
  // For production use, add error handling and logging
  error(error) {
    console.error("Server error:", error);
    return new Response("Server Error", { status: 500 });
  }
});
```

**For Production** (`/home/yeehaa/Documents/personal-brain/dist/production/server.js`):
```javascript
import { serve } from "bun";
import { handler } from "./dist/server/entry.mjs";

console.log("Starting production server on port 3000");

serve({
  port: 3000,
  fetch: handler,
  // For production use, add error handling and logging
  error(error) {
    console.error("Server error:", error);
    return new Response("Server Error", { status: 500 });
  }
});
```

### 3. Update Caddy Configuration

Modify the Caddy configuration to reverse proxy to the Bun servers instead of serving static files:

```
# Production website
yourdomain.com {
  # Reverse proxy to Bun server
  reverse_proxy localhost:3000
  
  # Enable compression
  encode gzip
  
  # Security headers remain the same
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    X-XSS-Protection "1; mode=block"
    Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
  }
  
  # Logging
  log {
    output file /var/log/caddy/yourdomain.com.access.log
    format json
  }
}

# Preview website
preview.yourdomain.com {
  # Reverse proxy to preview Bun server
  reverse_proxy localhost:3001
  
  # Enable compression
  encode gzip
  
  # Security headers remain the same
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    X-XSS-Protection "1; mode=block"
    Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
  }
  
  # Logging
  log {
    output file /var/log/caddy/preview.yourdomain.com.access.log
    format json
  }
}
```

### 4. Update the HybridPm2CaddyManager Implementation

Modify the HybridPm2CaddyManager to handle SSR servers:

```typescript
// In src/mcp/contexts/website/services/deployment/hybridPm2CaddyManager.ts

// Update the startServers method to use SSR servers
async startServers(): Promise<boolean> {
  try {
    // First make sure servers are stopped
    await this.stopServers();
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Define paths
    const rootDir = path.resolve(process.cwd());
    const previewDir = path.join(rootDir, 'src', 'website');
    const productionDir = path.join(rootDir, 'dist', 'production');
    
    // Ensure both directories exist
    await fs.mkdir(previewDir, { recursive: true });
    await fs.mkdir(productionDir, { recursive: true });
    
    // Prepare server scripts for both environments
    // For Preview
    const previewServerScript = `
import { serve } from "bun";
import { handler } from "./dist/server/entry.mjs";

console.log("Starting preview server on port 3001");

serve({
  port: 3001,
  fetch: handler,
  error(error) {
    console.error("Server error:", error);
    return new Response("Server Error", { status: 500 });
  }
});`;

    // For Production
    const productionServerScript = `
import { serve } from "bun";
import { handler } from "./dist/server/entry.mjs";

console.log("Starting production server on port 3000");

serve({
  port: 3000,
  fetch: handler,
  error(error) {
    console.error("Server error:", error);
    return new Response("Server Error", { status: 500 });
  }
});`;

    // Write server scripts
    await fs.writeFile(path.join(previewDir, 'server.js'), previewServerScript);
    await fs.writeFile(path.join(productionDir, 'server.js'), productionServerScript);
    
    // Initialize the deployment adapter
    await this.deploymentAdapter.initialize();
    
    // Start the preview server
    const previewSuccess = await this.deploymentAdapter.startServer(
      'preview',
      3001,
      previewDir,
      'bun server.js'  // Use Bun to run the server script instead of static hosting
    );
    
    // Start the production server
    const productionSuccess = await this.deploymentAdapter.startServer(
      'production',
      3000,
      productionDir,
      'bun server.js'  // Use Bun to run the server script instead of static hosting
    );
    
    // Verify Caddy is running
    try {
      const childProcess = await import('child_process');
      const util = await import('util');
      const exec = util.promisify(childProcess.exec);
      
      // Check if Caddy is running
      const { stdout } = await exec('systemctl is-active caddy');
      const caddyActive = stdout.trim() === 'active';
      
      if (!caddyActive) {
        this.logger.warn('Caddy is not running. HTTPS may not be available.', {
          context: 'HybridPm2CaddyManager',
        });
        
        // Try to restart Caddy if it's installed
        try {
          await exec('command -v caddy && sudo systemctl restart caddy');
          this.logger.info('Restarted Caddy service', {
            context: 'HybridPm2CaddyManager',
          });
        } catch (restartError) {
          this.logger.warn('Could not restart Caddy. Website will only be available via local ports.', {
            error: restartError,
            context: 'HybridPm2CaddyManager',
          });
        }
      } else {
        this.logger.info('Caddy is running. HTTPS should be available.', {
          context: 'HybridPm2CaddyManager',
        });
      }
    } catch (caddyCheckError) {
      // Non-critical error, just log it
      this.logger.warn('Could not check Caddy status', {
        error: caddyCheckError,
        context: 'HybridPm2CaddyManager',
      });
    }
    
    return previewSuccess && productionSuccess;
  } catch (error) {
    this.logger.error('Error starting SSR servers', {
      error,
      context: 'HybridPm2CaddyManager',
    });
    return false;
  }
}
```

### 5. Update Bot Commands

Add explicit server management to the WebsiteCommandHandler:

```typescript
// In src/commands/handlers/websiteCommands.ts

// Add new method to handle server control
async handleWebsiteServer(environment: string = 'production', action: string = 'restart'): Promise<CommandResult> {
  try {
    // Validate environment
    if (environment !== 'production' && environment !== 'preview') {
      return {
        success: false,
        message: 'Environment must be "production" or "preview"',
      };
    }
    
    // Validate action
    if (action !== 'restart' && action !== 'stop' && action !== 'start') {
      return {
        success: false,
        message: 'Action must be "restart", "stop", or "start"',
      };
    }
    
    // Get deployment manager
    const context = this.getWebsiteContext();
    const deploymentManager = await context.getDeploymentManager();
    
    if (!deploymentManager) {
      return {
        success: false,
        message: 'Deployment manager not available',
      };
    }
    
    // Perform the requested action
    let result = false;
    
    switch (action) {
      case 'start':
        // Start only the specified environment
        result = await deploymentManager.startServer(environment);
        break;
      case 'stop':
        // Stop only the specified environment
        result = await deploymentManager.stopServer(environment);
        break;
      case 'restart':
        // Stop and start the specified environment
        await deploymentManager.stopServer(environment);
        result = await deploymentManager.startServer(environment);
        break;
    }
    
    return {
      success: result,
      message: `${environment} server ${action}ed ${result ? 'successfully' : 'with errors'}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to ${action} ${environment} server: ${error.message}`,
      data: { error: error.message }
    };
  }
}
```

### 6. Register New Command

```typescript
// In src/commands/index.ts

// Add server control command
registry.registerCommand('website server', {
  handler: (args) => websiteCommands.handleWebsiteServer(args.environment, args.action),
  description: 'Control the SSR server for an environment',
  usage: 'website server [environment] [action]',
  args: {
    environment: { 
      type: 'string', 
      optional: true, 
      description: 'Environment (preview or production)', 
      validate: (val) => ['preview', 'production'].includes(val),
      default: 'production'
    },
    action: {
      type: 'string',
      optional: true,
      description: 'Action (restart, stop, or start)',
      validate: (val) => ['restart', 'stop', 'start'].includes(val),
      default: 'restart'
    }
  }
});
```

## Process Management with PM2

PM2 will be used to manage the Bun server processes:

1. **Starting/Restarting Servers**:
   ```bash
   pm2 start server.js --name website-production
   pm2 restart website-preview
   ```

2. **Stopping Servers**:
   ```bash
   pm2 stop website-production
   ```

3. **Checking Server Status**:
   ```bash
   pm2 status
   pm2 show website-production
   ```

4. **Server Monitoring**:
   ```bash
   pm2 monit
   ```

5. **Automatic Restart on Failure**:
   PM2 automatically restarts the process if it crashes

## Migration Strategy

To migrate from static to SSR:

1. **Update Source Code**:
   - Add Bun adapter
   - Update Astro config
   - Create server scripts

2. **Update Caddy Config**:
   - Modify for reverse proxying to Bun servers

3. **Update Bot Commands**:
   - Add SSR process management
   - Implement server control command

4. **Deployment Process**:
   - Build preview with SSR
   - Test preview environment
   - Promote to production when ready
   - Verify production SSR functionality

## SSR-Specific Benefits

1. **Dynamic Content**:
   - Server-side data fetching
   - Personalized content
   - API integrations

2. **Improved SEO**:
   - Fully rendered HTML for search engines
   - Dynamic meta tags

3. **Enhanced Performance**:
   - Fast Time to First Byte (TTFB)
   - Reduced client-side JavaScript
   - Better Core Web Vitals

4. **API Routes**:
   - Backend functionality in the same app
   - Simplified architecture

## Implementation Timeline

1. **Configuration Updates**: 0.5 day
   - Update Astro config
   - Create server scripts
   - Update Caddy config

2. **Command Implementation**: 1 day
   - Update bot commands for SSR
   - Implement server control command

3. **Testing and Debugging**: 1 day
   - Test SSR functionality
   - Verify process management
   - Load testing

Total: 2.5 days

## Success Criteria

1. SSR websites successfully run on Bun
2. Preview → Production workflow continues to work
3. Bot commands properly manage SSR processes
4. Caddy correctly proxies to Bun servers
5. PM2 reliably manages server processes
6. Website performance is improved with SSR