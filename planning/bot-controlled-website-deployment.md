# Bot-Controlled Website Deployment

## Overview

This document outlines the implementation of a hybrid PM2-Caddy approach for deploying and managing the Personal Brain website. This approach combines the strengths of both technologies:

- **PM2**: Process management for Astro development servers
- **Caddy**: Web server with automatic HTTPS, security headers, and domain routing

## Architecture

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

### Network Configuration

- **Preview Server (PM2)**: Runs on localhost:4321, accessible internally
- **Production Server (PM2)**: Runs on localhost:4322, accessible internally
- **Caddy Proxy**: Listens on ports 80/443, routes to the appropriate PM2 server
- **Domain Routing**:
  - `yourdomain.com` → localhost:4322 (Production)
  - `preview.yourdomain.com` → localhost:4321 (Preview)

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

## Implementation

### GitHub Actions Setup

The GitHub Actions workflow now includes Caddy installation and configuration in the deployment process:

1. **Install Caddy**: 
   - Add Caddy repository and install the latest version
   - Set up Caddy as a system service
   - Create necessary directories for preview and production environments

2. **Configure Caddy**:
   - Create and validate Caddyfile configuration
   - Set up domain routing for both preview and production environments
   - Add security headers and HTTPS configuration
   - Reload Caddy to apply changes

3. **Initialize Directories**:
   - Create website directory structure for both environments
   - Set appropriate permissions for the website directories
   - Add placeholder files if directories are empty

### Deployment Manager Implementation

The system uses two main deployment manager implementations:

1. **LocalDevDeploymentManager**:
   - Used for local development on developer machines
   - Manages PM2 processes through DeploymentAdapter
   - Handles build, promotion, and server lifecycle
   - Uses localhost URLs with direct ports

2. **LocalCaddyDeploymentManager**: 
   - Used for production deployments on server
   - Works with Caddy for routing and SSL
   - Manages file operations for preview and production environments
   - Uses domain-based HTTPS URLs

### Deployment Workflow

1. **Build Process**:
   - User runs `website-build` command
   - Bot builds Astro site to `src/website/dist` (preview environment)
   - PM2 serves the preview site

2. **Preview Process**:
   - Preview site is available at `https://preview.yourdomain.com`
   - User can verify the site before promoting to production

3. **Promotion Process**:
   - User runs `website-promote` command
   - Bot copies files from preview to production directory
   - Caddy automatically serves from the production directory
   - Production site is available at `https://yourdomain.com`

### Fallback and Recovery

- **Empty Directory Handling**: If directories are empty, template files are used
- **Server Restart**: PM2 ensures servers restart on failure or system reboot
- **SSL Certificate Management**: Caddy automatically handles SSL certificate renewal

## Advantages

1. **Simplified Deployment**: Bot manages the entire deployment process
2. **Automatic HTTPS**: Caddy handles SSL certificates automatically
3. **Security**: Built-in security headers and HTTPS enforcement
4. **Reliability**: PM2 ensures processes remain running
5. **Preview/Production Separation**: Distinct environments for testing and production
6. **Zero Downtime Deployment**: Promotion process avoids downtime
7. **Scalability**: Architecture supports future growth (SSR, dynamic content)

## Implementation Timeline

The implementation is divided into three phases:

### Phase 1: Basic Infrastructure (1 day)

- [x] GitHub Actions workflow for Caddy setup
- [x] Directory structure for preview and production environments
- [x] Caddy configuration for domain routing
- [x] Deployment managers implementation

### Phase 2: Command Interface (1 day)

- [x] Update website commands to work with hybrid approach
- [x] Implement status checking for both environments
- [x] Add build and promotion workflow
- [x] Set up error handling and reporting

### Phase 3: Landing Page Generation (1 day)

- [ ] Implement profile to landing page transformation
- [ ] Set up content collection initialization
- [ ] Create template loading and rendering
- [ ] Add automatic deployment after generation

## Configuration

### Environment Variables

- `WEBSITE_DOMAIN`: Primary domain for your website (default: example.com)
- `WEBSITE_DEPLOYMENT_TYPE`: Deployment type (local-dev or caddy)
- `WEBSITE_PREVIEW_DIR`: Directory for preview environment
- `WEBSITE_PRODUCTION_DIR`: Directory for production environment
- `WEBSITE_PREVIEW_PORT`: Port for preview server
- `WEBSITE_PRODUCTION_PORT`: Port for production server

### Caddyfile Sample

```
# Main production domain
example.com {
    root * /opt/personal-brain-website/production/dist
    file_server
    encode gzip
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline';"
    }
    
    # Handle SPA fallback
    try_files {path} /index.html
}

# Preview subdomain
preview.example.com {
    root * /opt/personal-brain-website/preview/dist
    file_server
    encode gzip
    
    # Security headers (same as production)
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline';"
    }
    
    # Handle SPA fallback
    try_files {path} /index.html
}
```

## Testing and Verification

After deployment, verify the following:

1. **Caddy Status**: `systemctl status caddy`
2. **Preview Site**: Access `https://preview.yourdomain.com`
3. **Production Site**: Access `https://yourdomain.com`
4. **SSL Certificates**: Verify HTTPS is working correctly
5. **Bot Commands**: Test `website-status`, `website-build`, and `website-promote` commands