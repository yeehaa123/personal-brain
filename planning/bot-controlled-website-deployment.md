# Bot-Controlled Website Deployment Plan (MVP)

## Overview

This document outlines the implementation plan for integrating website deployment capabilities directly into the Personal Brain bot. The bot will be responsible for building websites and managing the promotion from preview to production environments, with Caddy handling the web serving and HTTPS.

## Goals

- Make the bot the central controller for website deployment
- Support simple preview → production promotion workflow
- Implement minimal, intuitive commands for website management
- Leverage Caddy for always-on web serving with automatic HTTPS
- Eliminate the need for deployment providers and complex initialization
- Prepare for future upgrade to server-side rendering (SSR)

## Architecture

### Components

1. **GitHub Actions** (Initial Setup Only):
   - Installs Caddy
   - Sets up directory structure
   - Configures domains and Caddy config
   - Only runs once for infrastructure setup

2. **Bot Commands**:
   - `website-build` - Build website (always to preview environment)
   - `website-status` - Check status of preview or production environment
   - `website-promote` - Promote preview to production
   - `website-config` - Configure website title and metadata

3. **Caddy Web Server**:
   - Serves static files from respective environments
   - Handles HTTPS certificates automatically
   - Manages domain routing

### Directory Structure

```
/opt/personal-brain/
├── src/
│   └── website/           # Source website files
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── astro.config.mjs
└── ... (rest of Personal Brain)

/opt/personal-brain-website/
├── preview/               # Preview environment
│   ├── src/
│   ├── public/
│   ├── dist/              # Built website
│   ├── package.json
│   └── astro.config.mjs
└── production/            # Production environment
    ├── src/
    ├── public/
    ├── dist/              # Built website
    ├── package.json
    └── astro.config.mjs
```

## Implementation Plan

### 1. GitHub Actions Setup (One-Time)

Update the existing deployment workflow to include Caddy and website setup:

```yaml
# Add to existing deploy.yml workflow
- name: Install Caddy and Configure Website
  run: |
    ssh ${{ secrets.SSH_USER }}@${{ secrets.SERVER_IP }} "
      # Install Caddy if not already installed
      if ! command -v caddy &> /dev/null; then
        echo \"Installing Caddy...\"
        sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
        sudo apt update
        sudo apt install -y caddy
        
        # Create log directory
        sudo mkdir -p /var/log/caddy
      fi
      
      # Set up website directories if they don't exist
      mkdir -p /opt/personal-brain-website/{production,preview}/dist
      
      # Configure Caddy
      sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
    # Production website
    ${WEBSITE_DOMAIN} {
      # Serve static files directly
      root * /opt/personal-brain-website/production/dist
      file_server
      
      # Enable compression
      encode gzip
      
      # Basic security headers
      header {
        Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"
        X-Content-Type-Options \"nosniff\"
        X-Frame-Options \"SAMEORIGIN\"
        X-XSS-Protection \"1; mode=block\"
        Content-Security-Policy \"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:;\"
        Referrer-Policy \"strict-origin-when-cross-origin\"
        Permissions-Policy \"camera=(), microphone=(), geolocation=()\"
      }
      
      # Handle errors with custom 404 page if it exists
      handle_errors {
        @404 {
          expression {http.error.status_code} == 404
        }
        handle @404 {
          root * /opt/personal-brain-website/production/dist
          try_files /404.html
          file_server
        }
      }
      
      # Logging
      log {
        output file /var/log/caddy/${WEBSITE_DOMAIN}.access.log
        format json
      }
    }
    
    # Preview website (automatically as subdomain)
    preview.${WEBSITE_DOMAIN} {
      # Serve static files directly
      root * /opt/personal-brain-website/preview/dist
      file_server
      
      # Enable compression
      encode gzip
      
      # Basic security headers
      header {
        Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"
        X-Content-Type-Options \"nosniff\"
        X-Frame-Options \"SAMEORIGIN\"
        X-XSS-Protection \"1; mode=block\"
        Content-Security-Policy \"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:;\"
        Referrer-Policy \"strict-origin-when-cross-origin\"
        Permissions-Policy \"camera=(), microphone=(), geolocation=()\"
      }
      
      # Handle errors with custom 404 page if it exists
      handle_errors {
        @404 {
          expression {http.error.status_code} == 404
        }
        handle @404 {
          root * /opt/personal-brain-website/preview/dist
          try_files /404.html
          file_server
        }
      }
      
      # Logging
      log {
        output file /var/log/caddy/preview.${WEBSITE_DOMAIN}.access.log
        format json
      }
    }
    EOF
      
      # Set permissions and restart Caddy
      sudo chown -R $USER:$USER /opt/personal-brain-website
      sudo setfacl -R -m u:caddy:rx /opt/personal-brain-website || true
      sudo systemctl reload caddy || sudo systemctl restart caddy
    "
```

### 2. Bot Command Implementation

Create a new module for website commands:

```typescript
// In src/commands/handlers/websiteCommands.ts

import { BaseCommandHandler } from '@/commands/core/baseCommandHandler';
import { CommandResult } from '@/commands/core/commandTypes';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import config from '@/config';

const execAsync = promisify(exec);

export class WebsiteCommandHandler extends BaseCommandHandler {
  // Base directories
  private readonly baseDir = '/opt/personal-brain-website';
  private readonly previewDir = path.join(this.baseDir, 'preview');
  private readonly productionDir = path.join(this.baseDir, 'production');
  private readonly sourceDir = '/opt/personal-brain/src/website';
  
  /**
   * Build website for preview environment
   * Copies source files from repository and builds them
   */
  async handleWebsiteBuild(): Promise<CommandResult> {
    try {
      // Always build to preview environment
      const targetDir = this.previewDir;
      
      // Copy source files
      await execAsync(`cp -r ${this.sourceDir}/* ${targetDir}/`);
      
      // Make sure dist directory exists
      await fs.mkdir(path.join(targetDir, 'dist'), { recursive: true });
      
      // Install dependencies and build
      const { stdout, stderr } = await execAsync(
        `cd ${targetDir} && bun install && bun run build`
      );
      
      // Check for critical errors (but ignore warnings)
      if (stderr && !stderr.includes('warning')) {
        return {
          success: false,
          message: `Error building preview environment: ${stderr}`,
        };
      }
      
      // Reload Caddy to ensure it picks up any changes
      await execAsync('sudo systemctl reload caddy');
      
      // Get domain for URL
      const domain = this.getDomain('preview');
      
      return {
        success: true,
        message: `Website built successfully for preview. Available at https://${domain}`,
        data: { 
          environment: 'preview',
          url: `https://${domain}`,
          output: stdout
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to build ${environment} environment: ${error.message}`,
        data: { error: error.message }
      };
    }
  }
  
  /**
   * Promote the preview environment to production
   * Copies the built files from preview to production
   */
  async handleWebsitePromote(): Promise<CommandResult> {
    try {
      // Check if preview exists
      try {
        await fs.access(path.join(this.previewDir, 'dist'));
      } catch (error) {
        return {
          success: false,
          message: 'Preview environment not built or missing dist folder. Build preview first.',
        };
      }
      
      // Copy from preview to production
      await execAsync(`cp -r ${this.previewDir}/dist/* ${this.productionDir}/dist/`);
      
      // Also copy source files in case they need to be rebuilt
      await execAsync(`cp -r ${this.previewDir}/src ${this.productionDir}/`);
      await execAsync(`cp -r ${this.previewDir}/public ${this.productionDir}/`);
      await execAsync(`cp ${this.previewDir}/package.json ${this.productionDir}/`);
      await execAsync(`cp ${this.previewDir}/astro.config.mjs ${this.productionDir}/`);
      
      // Reload Caddy to ensure it picks up any changes
      await execAsync('sudo systemctl reload caddy');
      
      // Get production domain for URL
      const domain = this.getDomain('production');
      
      return {
        success: true,
        message: `Preview successfully promoted to production. Available at https://${domain}`,
        data: {
          url: `https://${domain}`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to promote to production: ${error.message}`,
        data: { error: error.message }
      };
    }
  }
  
  /**
   * Check the status of a website environment
   * Provides information about build status and accessibility
   */
  async handleWebsiteStatus(environment: string = 'preview'): Promise<CommandResult> {
    try {
      // Validate environment
      if (environment !== 'production' && environment !== 'preview') {
        return {
          success: false,
          message: 'Environment must be "production" or "preview"',
        };
      }
      
      const targetDir = environment === 'production' 
        ? this.productionDir 
        : this.previewDir;
      
      // Check if the environment exists
      let buildStatus = 'Not built';
      let fileCount = 0;
      try {
        const stats = await fs.stat(path.join(targetDir, 'dist'));
        if (stats.isDirectory()) {
          const files = await fs.readdir(path.join(targetDir, 'dist'));
          fileCount = files.length;
          buildStatus = files.length > 0 ? 'Built' : 'Empty';
        }
      } catch (error) {
        buildStatus = 'Not built';
      }
      
      // Check Caddy status
      const { stdout: caddyStatus } = await execAsync(
        'sudo systemctl is-active caddy && echo "Running" || echo "Not running"'
      );
      
      // Get domain and check accessibility
      const domain = this.getDomain(environment);
      
      let accessStatus = 'Unknown';
      try {
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" https://${domain} || echo "Failed"`);
        accessStatus = stdout.trim() === '200' ? 'Accessible' : `Status: ${stdout.trim()}`;
      } catch (error) {
        accessStatus = 'Not accessible';
      }
      
      const statusMessage = `${environment} website status: ${buildStatus}, Caddy: ${caddyStatus.trim()}, Files: ${fileCount}, Access: ${accessStatus}`;
      
      return {
        success: true,
        message: statusMessage,
        data: {
          environment,
          buildStatus,
          fileCount,
          caddyStatus: caddyStatus.trim(),
          domain,
          accessStatus,
          url: `https://${domain}`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to check ${environment} status: ${error.message}`,
        data: { error: error.message }
      };
    }
  }
  
  /**
   * Helper method to get the domain for an environment
   */
  private getDomain(environment: string): string {
    const baseDomain = process.env.WEBSITE_DOMAIN || config.website?.baseUrl || 'example.com';
    
    // Remove protocol if present
    const cleanDomain = baseDomain.replace(/^https?:\/\//, '');
    
    // Add preview subdomain if needed
    return environment === 'production' ? cleanDomain : `preview.${cleanDomain}`;
  }
}
```

### 3. Register Commands with the Bot

```typescript
// In src/commands/index.ts

// Website management commands
registry.registerCommand('website-build', {
  handler: () => websiteCommands.handleWebsiteBuild(),
  description: 'Build website to preview environment',
  usage: 'website-build',
  args: {}
});

registry.registerCommand('website-promote', {
  handler: () => websiteCommands.handleWebsitePromote(),
  description: 'Promote preview environment to production',
  usage: 'website-promote',
  args: {}
});

registry.registerCommand('website-status', {
  handler: (args) => websiteCommands.handleWebsiteStatus(args.environment),
  description: 'Check website environment status',
  usage: 'website-status [environment]',
  args: {
    environment: { 
      type: 'string', 
      optional: true, 
      description: 'Environment (preview or production)', 
      validate: (val) => ['preview', 'production'].includes(val),
      default: 'preview'
    }
  }
});

registry.registerCommand('website-config', {
  handler: (args) => websiteCommands.handleWebsiteConfig(args.title, args.description, args.author),
  description: 'Configure website metadata',
  usage: 'website-config [--title=value] [--description=value] [--author=value]',
  args: {
    title: { 
      type: 'string', 
      optional: true, 
      description: 'Website title'
    },
    description: { 
      type: 'string', 
      optional: true, 
      description: 'Website description'
    },
    author: { 
      type: 'string', 
      optional: true, 
      description: 'Website author'
    }
  }
});
```

### 4. Environment Variables

Add only a single environment variable to your `.env` file and GitHub secrets:

```
WEBSITE_DOMAIN=yourdomain.com
```

The preview URL is automatically derived as `preview.yourdomain.com`.

## Workflow Usage

### Typical Development Workflow

1. **Make Changes to Website**:
   - Update files in `/opt/personal-brain/src/website/*`

2. **Build to Preview**:
   ```
   website-build
   ```

3. **Check Preview Status**:
   ```
   website-status
   ```

4. **Visit Preview Site**:
   - Open browser to https://preview.yourdomain.com
   - Verify changes and functionality

5. **Promote to Production**:
   ```
   website-promote
   ```

6. **Verify Production**:
   ```
   website-status production
   ```
   - Open browser to https://yourdomain.com

## Implementation Timeline

1. **GitHub Actions Update**: 0.5 day
   - Add Caddy installation
   - Configure domains
   - Set up initial structure

2. **Bot Command Implementation**: 1 day
   - website-build command (always to preview)
   - website-promote command
   - website-status command
   - website-config command

3. **Testing and Debugging**: 0.5 day
   - Test build process
   - Test promotion flow
   - Verify Caddy configuration

Total: 2 days

## Success Criteria

1. Website can be built via bot commands
2. Preview environment works for testing changes
3. Promotion to production works reliably
4. Caddy handles HTTPS automatically
5. Environments are properly isolated
6. No external scripts or manual steps required
7. Clear path for future SSR implementation