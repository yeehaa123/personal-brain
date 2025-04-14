# Server-Side Rendering (SSR) Upgrade Plan

## Overview

This document outlines the plan for upgrading the static website deployment to a full server-side rendering (SSR) implementation using Astro SSR with Bun as the runtime. This upgrade maintains the bot-centered deployment approach while adding the benefits of SSR.

## Goals

- Implement Astro SSR with Bun runtime
- Maintain the existing preview → production workflow
- Update bot commands to handle SSR processes
- Configure Caddy as a reverse proxy to Bun servers
- Ensure process management and reliability
- Preserve existing command interface for seamless transition

## Architecture Changes

### Current Static Architecture

```
Client Request → Caddy → Static Files
```

### New SSR Architecture

```
Client Request → Caddy → Bun Server (Astro SSR) → Dynamic Response
```

### Process Structure

- **Preview Environment**: 
  - Bun server running on port 3001
  - Managed via PM2 as "website-preview"

- **Production Environment**:
  - Bun server running on port 3000
  - Managed via PM2 as "website-production"

## Implementation Plan

### 1. Update Astro Configuration

1. **Add Bun Adapter to Project**:
   ```bash
   cd /opt/personal-brain/src/website
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

**For Preview** (`/opt/personal-brain-website/preview/server.js`):
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

**For Production** (`/opt/personal-brain-website/production/server.js`):
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

Modify the Caddy configuration to reverse proxy to the Bun servers:

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

### 4. Update Bot Commands

Update the WebsiteCommandHandler to manage SSR processes:

```typescript
// In src/commands/handlers/websiteCommands.ts

// Inside handleWebsiteBuild method, add after build:
async handleWebsiteBuild(environment: string = 'preview'): Promise<CommandResult> {
  try {
    // ... existing build code ...
    
    // After building, start/restart the SSR server
    const port = environment === 'production' ? 3000 : 3001;
    const serviceName = `website-${environment}`;
    
    // Check if server script exists, if not create it
    const serverScriptPath = path.join(targetDir, 'server.js');
    if (!fs.existsSync(serverScriptPath)) {
      const serverScript = `
import { serve } from "bun";
import { handler } from "./dist/server/entry.mjs";

console.log("Starting ${environment} server on port ${port}");

serve({
  port: ${port},
  fetch: handler,
  error(error) {
    console.error("Server error:", error);
    return new Response("Server Error", { status: 500 });
  }
});`;
      
      await fs.writeFile(serverScriptPath, serverScript);
    }
    
    // Start or restart the server using PM2
    await execAsync(`cd ${targetDir} && pm2 restart ${serviceName} || pm2 start server.js --name ${serviceName}`);
    
    // ... rest of the method ...
  } catch (error) {
    // ... error handling ...
  }
}

// Update promote method to restart production server after promotion
async handleWebsitePromote(): Promise<CommandResult> {
  try {
    // ... existing promotion code ...
    
    // Copy the server script as well
    await execAsync(`cp ${this.previewDir}/server.js ${this.productionDir}/`);
    
    // Restart the production server
    await execAsync(`cd ${this.productionDir} && pm2 restart website-production || pm2 start server.js --name website-production`);
    
    // ... rest of the method ...
  } catch (error) {
    // ... error handling ...
  }
}

// Update status method to include server status
async handleWebsiteStatus(environment: string = 'production'): Promise<CommandResult> {
  try {
    // ... existing status code ...
    
    // Check SSR server status
    const serviceName = `website-${environment}`;
    const { stdout: serverStatus, stderr: serverError } = await execAsync(
      `pm2 show ${serviceName} | grep "status\\|memory\\|cpu" || echo "Not running"`
    ).catch(() => ({ stdout: 'Not running', stderr: '' }));
    
    // Include server status in the response
    return {
      success: true,
      message: `${statusMessage}, Server: ${serverStatus.includes('online') ? 'Running' : 'Stopped'}`,
      data: {
        // ... existing data ...
        serverStatus: serverStatus.trim(),
        isServerRunning: serverStatus.includes('online')
      }
    };
  } catch (error) {
    // ... error handling ...
  }
}

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
    
    const targetDir = environment === 'production' 
      ? this.productionDir 
      : this.previewDir;
    
    const serviceName = `website-${environment}`;
    
    // Execute the requested action
    if (action === 'restart' || action === 'start') {
      await execAsync(`cd ${targetDir} && pm2 ${action} server.js --name ${serviceName}`);
    } else {
      await execAsync(`pm2 stop ${serviceName}`);
    }
    
    return {
      success: true,
      message: `${environment} server ${action}ed successfully`,
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

### 5. Register New Command

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
   - Modify for reverse proxying

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