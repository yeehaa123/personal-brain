# Hybrid PM2-Caddy Website Deployment Plan

## Overview

This document outlines the implementation plan for a hybrid deployment approach that combines our existing PM2-based process management with Caddy as a front-end proxy. The Personal Brain bot will continue to be responsible for building websites and managing the promotion from preview to production environments, with Caddy handling web serving, HTTPS, and domain routing.

## Goals

- Maintain the bot as the central controller for website deployment
- Keep the existing PM2-based server management implementation
- Add Caddy as a front-end proxy for enhanced security and domain support
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

2. **Bot Commands** (Existing Implementation):
   - `website-build` - Build website (always to preview environment)
   - `website-status` - Check status of preview or production environment
   - `website-promote` - Promote preview to production
   - `website-config` - Configure website title and metadata

3. **PM2 Process Management** (Existing Implementation):
   - Manages local server processes on ports 4321 (preview) and 4322 (production)
   - Handles server lifecycle (start, stop, restart)
   - Serves built files from respective directories

4. **Caddy Web Server** (New Addition):
   - Acts as a reverse proxy to PM2-managed servers
   - Handles HTTPS certificates automatically
   - Manages domain routing
   - Adds security headers and other web serving optimizations

### System Architecture

```
                  ┌──────────────────────────────────────┐
                  │         Hetzner VPS Server           │
                  │                                      │
                  │  ┌─────────────┐    ┌────────────┐   │
Internet ─────────┼─►│   Caddy     │───►│  PM2       │   │
                  │  │ (Web Proxy) │    │ (Processes)│   │
                  │  └─────────────┘    └────────────┘   │
                  │        │                 │           │
                  │        ▼                 ▼           │
                  │  ┌─────────────┐    ┌────────────┐   │
                  │  │ SSL Certs   │    │Website Files│   │
                  │  └─────────────┘    └────────────┘   │
                  └──────────────────────────────────────┘
```

### Directory Structure

```
/home/yeehaa/Documents/personal-brain/
├── src/
│   └── website/           # Source website files (built to dist/ by Astro)
│       ├── src/
│       ├── public/
│       ├── dist/          # Built preview website
│       ├── package.json
│       └── astro.config.mjs
└── ... (rest of Personal Brain)

/home/yeehaa/Documents/personal-brain/dist/
└── production/            # Production environment (copied from preview)
    └── index.html         # Default template or promoted content
```

### Network Configuration

- **Preview Server (PM2)**: Runs on localhost:4321, accessible internally
- **Production Server (PM2)**: Runs on localhost:4322, accessible internally
- **Caddy Proxy**: Listens on ports 80/443, routes to the appropriate PM2 server
- **Domain Routing**:
  - `yourdomain.com` → localhost:4322 (Production)
  - `preview.yourdomain.com` → localhost:4321 (Preview)

## Implementation Plan

### 1. GitHub Actions Setup (One-Time)

Update the existing deployment workflow to include Caddy as a reverse proxy:

```yaml
# Add to existing deploy.yml workflow
- name: Install Caddy and Configure as Reverse Proxy
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
      
      # Ensure the local production directory exists
      mkdir -p ${HOME}/Documents/personal-brain/dist/production
      
      # Configure Caddy as a reverse proxy to PM2 servers
      sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
    # Production website
    ${WEBSITE_DOMAIN} {
      # Reverse proxy to local PM2-managed production server
      reverse_proxy localhost:4322
      
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
      
      # Logging
      log {
        output file /var/log/caddy/${WEBSITE_DOMAIN}.access.log
        format json
      }
    }
    
    # Preview website (automatically as subdomain)
    preview.${WEBSITE_DOMAIN} {
      # Reverse proxy to local PM2-managed preview server
      reverse_proxy localhost:4321
      
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
      
      # Logging
      log {
        output file /var/log/caddy/preview.${WEBSITE_DOMAIN}.access.log
        format json
      }
    }
    EOF
      
      # Start and enable Caddy 
      sudo systemctl enable caddy
      sudo systemctl restart caddy
      
      # Configure firewall to allow Caddy, block direct PM2 ports
      sudo ufw allow 80/tcp
      sudo ufw allow 443/tcp
      sudo ufw deny 4321/tcp
      sudo ufw deny 4322/tcp
    "
```

### 2. Leveraging Existing PM2 Implementation

The implementation will continue to use the existing PM2-based server management that's already in place. We don't need to change the core website command implementations, as they will continue to work as before. The only changes are:

1. The URLs returned by commands will now be HTTPS domain URLs instead of localhost port URLs
2. The status check will be enhanced to also report on Caddy proxy status

```typescript
// We'll make minimal changes to src/commands/handlers/websiteCommands.ts
// We're already using the ServerManager implementation with:

import { BaseCommandHandler } from '@/commands/core/baseCommandHandler';
import { CommandResult } from '@/commands/core/commandTypes';
import { ServerManager } from '@/mcp/contexts/website/services/serverManager';

// Existing methods will be used, but modified to include public domain URLs

// Update the handleWebsiteStatus method to include Caddy status
async handleWebsiteStatus(environment: string = 'preview'): Promise<CommandResult> {
  try {
    // Get status from ServerManager
    const serverManager = ServerManager.getInstance();
    const serverStatus = await serverManager.areServersRunning();
    
    // Get file status and other details from existing implementation
    const serverEnv = environment === 'production' 
      ? 'production'
      : 'preview';
    
    // Get domain for URL - read from configuration
    const domain = this.getDomain(environment);
    
    // Check Caddy status using systemctl
    let caddyStatus = 'Unknown';
    try {
      const { stdout } = await execAsync('systemctl is-active caddy');
      caddyStatus = stdout.trim() === 'active' ? 'Running' : 'Not running';
    } catch (error) {
      caddyStatus = 'Not running';
    }
    
    // Check HTTPS accessibility
    let accessStatus = 'Unknown';
    try {
      const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" https://${domain}`);
      accessStatus = stdout.trim() === '200' ? 'Accessible' : `Status: ${stdout.trim()}`;
    } catch (error) {
      accessStatus = 'Not accessible';
    }
    
    // Format URL with HTTPS domain
    const url = `https://${domain}`;
    
    return {
      success: true,
      message: `${environment} website status: ${buildStatus}, Server: ${serverStatus}, Caddy: ${caddyStatus}, Access: ${accessStatus}`,
      data: {
        environment,
        buildStatus,
        fileCount,
        serverStatus: serverStatus ? 'Running' : 'Not running',
        caddyStatus,
        domain,
        accessStatus,
        url
      }
    };
  } catch (error) {
    // Error handling
    return {
      success: false,
      message: `Failed to check ${environment} status: ${error.message}`,
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
```

### 3. Configuration Updates

Update the configuration with Caddy-specific settings:

```typescript
// In src/config.ts

export const websiteConfig = {
  // ...existing config
  
  // Deployment settings
  deployment: {
    // Deployment type (local-dev with Caddy proxy)
    type: 'local-dev',
    
    // Port settings (for local servers)
    previewPort: Number(process.env['WEBSITE_PREVIEW_PORT']) || 4321,
    productionPort: Number(process.env['WEBSITE_PRODUCTION_PORT']) || 4322,
    
    // Caddy configuration
    caddy: {
      // Whether Caddy is being used as a front-end proxy
      enabled: Boolean(process.env['WEBSITE_USE_CADDY']) || true,
      // Domain configuration (from env or default)
      domains: {
        base: process.env['WEBSITE_DOMAIN'] || 'example.com',
        preview: `preview.${process.env['WEBSITE_DOMAIN'] || 'example.com'}`,
        production: process.env['WEBSITE_DOMAIN'] || 'example.com',
      },
    },
  },
};

### 4. DNS Configuration

Configure your DNS records to point to your Hetzner server:

1. **A Record**: `yourdomain.com` → [Hetzner Server IP]
2. **A Record**: `preview.yourdomain.com` → [Hetzner Server IP]

### 5. Environment Variables

You only need to set a few environment variables:

```
# Domain for the website 
WEBSITE_DOMAIN=yourdomain.com

# Whether to use Caddy as a proxy (default: true)
WEBSITE_USE_CADDY=true

# Ports for local PM2 servers (defaults: 4321/4322)
WEBSITE_PREVIEW_PORT=4321
WEBSITE_PRODUCTION_PORT=4322
## Workflow Usage

### Typical Development Workflow

1. **Make Changes to Website**:
   - Update files in `src/website/*`

2. **Build to Preview**:
   ```
   website-build
   ```
   This builds the site to `src/website/dist` using Astro

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
   This copies from `src/website/dist` to `dist/production`

6. **Verify Production**:
   ```
   website-status production
   ```
   - Open browser to https://yourdomain.com

## Implementation Timeline

1. **GitHub Actions Update**: 0.5 day
   - Add Caddy installation
   - Configure Caddy as a reverse proxy 
   - Set up DNS records

2. **Configuration Updates**: 0.5 day
   - Update config.ts with Caddy settings
   - Add domain support to status reporting
   - Update URL generation to use domains instead of localhost ports

3. **Testing and Debugging**: 0.5 day
   - Test Caddy proxy to PM2 servers
   - Verify HTTPS certificates
   - Test complete workflow with domains

Total: 1.5 days

## Advantages of the Hybrid Approach

1. **Minimal Changes to Existing Code**: Leverages the PM2 implementation that's already working
2. **Enhanced Security**: Adds HTTPS termination, security headers via Caddy
3. **Professional URLs**: Uses proper domains instead of port-based URLs
4. **Separation of Concerns**:
   - PM2 manages process and application lifecycle
   - Caddy handles web server concerns (SSL, domains, security)
5. **Simpler Implementation**: No need to rewrite the existing deployment code
6. **Improved User Experience**: Users see proper URLs in command output

## Success Criteria

1. Website can be built via bot commands (existing functionality)
2. Preview environment works for testing changes (existing functionality)
3. Promotion to production works reliably (existing functionality)
4. Caddy handles HTTPS automatically (new functionality)
5. Environments are properly isolated (existing functionality)
6. Domain-based access works for both environments (new functionality)
7. Security is enhanced with HTTPS and headers (new functionality)
8. PM2 management continues to work as before (existing functionality)