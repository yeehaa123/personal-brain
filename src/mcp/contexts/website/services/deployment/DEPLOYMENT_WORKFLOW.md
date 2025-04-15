# Website Deployment Workflow

This document explains how the website deployment workflow is implemented in Personal Brain.

## Architecture Overview

The website deployment system is built with a clear separation of concerns through dependency injection:

```
WebsiteContext
    ↓ (depends on)
DeploymentManagerFactory
    ↓ (creates)
WebsiteDeploymentManager (interface)
    ↓ (implemented by)
┌─────────────────────┐  ┌─────────────────────┐
│LocalCaddyDeployment│  │LocalDevDeployment   │
│Manager             │  │Manager              │
└─────────────────────┘  └─────────────────────┘
    (Production)             (Development)
```

## Deployment Environments

The system supports two deployment environments:

1. **Preview Environment**: For staging and testing changes before they go live
2. **Production Environment**: For hosting the public-facing website

## Components

### 1. WebsiteContext

The WebsiteContext is responsible for high-level website operations. It:

- Gets the appropriate deployment manager based on the environment
- Provides `handleWebsiteBuild`, `handleWebsitePromote`, and `handleWebsiteStatus` methods
- Delegates actual deployment operations to the deployment manager

### 2. DeploymentManagerFactory

The factory creates the appropriate deployment manager based on:
- Environment settings (NODE_ENV)
- Configuration settings
- Environment variable overrides (WEBSITE_DEPLOYMENT_TYPE)

### 3. WebsiteDeploymentManager Interface

Defines the contract for all deployment managers:
- `getEnvironmentStatus(environment)`: Gets information about a specific environment
- `promoteToProduction()`: Promotes preview content to production

### 4. LocalCaddyDeploymentManager

The production implementation that works with Caddy web server:
- Manages files at `/opt/personal-brain-website/{preview,production}/dist`
- Handles Caddy server interactions (status checks, reloading)
- Implements file operations for promotion

### 5. LocalDevDeploymentManager

The development implementation for local testing:
- Manages files at `./dist/{preview,production}`
- Simulates deployment without needing a real web server
- Uses the same interface for command compatibility

## Workflow Example

```
┌────────────┐   ┌──────────────────┐   ┌───────────────┐  
│User Command│   │WebsiteContext    │   │DeploymentMgr  │  
└─────┬──────┘   └────────┬─────────┘   └───────┬───────┘  
      │                   │                     │          
      │ website-build     │                     │          
      │─────────────────>│                     │          
      │                   │                     │          
      │                   │ buildWebsite()      │          
      │                   │────────────>│      │          
      │                   │                     │          
      │                   │<───────────│      │          
      │                   │                     │          
      │ website-status    │                     │          
      │─────────────────>│                     │          
      │                   │                     │          
      │                   │ getEnvironmentStatus│          
      │                   │────────────────────>│          
      │                   │                     │          
      │                   │<────────────────────│          
      │                   │                     │          
      │ website-promote   │                     │          
      │─────────────────>│                     │          
      │                   │                     │          
      │                   │ promoteToProduction │          
      │                   │────────────────────>│          
      │                   │                     │          
      │                   │<────────────────────│          
      │<─────────────────│                     │          
```

## Environment Detection

The system detects the appropriate environment to use:

1. If `WEBSITE_DEPLOYMENT_TYPE=local-dev` is set, it always uses LocalDevDeploymentManager
2. If `NODE_ENV=development` or `NODE_ENV=test`, it defaults to LocalDevDeploymentManager
3. Otherwise, it uses LocalCaddyDeploymentManager (for production)

## Directory Structure

### Production Environment
```
/opt/personal-brain-website/
  ├── preview/
  │   └── dist/        # Preview environment
  └── production/
      └── dist/        # Production environment
```

### Development Environment
```
./dist/
  ├── preview/         # Preview environment
  └── production/      # Production environment
```

## Testing

The deployment system includes comprehensive tests:
- Unit tests for each manager implementation
- Integration tests for the workflow
- Mock implementations for automated testing

## Configuration

Environment variables that control deployment:

- `NODE_ENV`: Determines default deployment manager type
- `WEBSITE_DEPLOYMENT_TYPE`: Override to force a specific manager type
- `WEBSITE_BASE_DIR`: Base directory for file operations
- `WEBSITE_DOMAIN`: Domain name for the website