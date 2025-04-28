#!/bin/bash
# Script to set up Caddy for the hybrid PM2-Caddy deployment

# Get domain and port configuration from environment variables or defaults
DOMAIN="${1:-$WEBSITE_DOMAIN}"
PREVIEW_PORT="${WEBSITE_PREVIEW_PORT:-4321}"
PRODUCTION_PORT="${WEBSITE_PRODUCTION_PORT:-4322}"

# Create website directories if they don't exist (still needed for temporary files)
echo "Setting up website directories..."
sudo mkdir -p /opt/personal-brain-website/preview/dist
sudo mkdir -p /opt/personal-brain-website/production/dist
sudo chown -R $(whoami):$(whoami) /opt/personal-brain-website

# Install Caddy if not already installed
if ! command -v caddy &> /dev/null; then
  echo "Installing Caddy..."
  sudo apt-get update
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update
  sudo apt-get install -y caddy
  
  # Ensure Caddy is enabled
  sudo systemctl enable caddy
else
  echo "Caddy is already installed"
fi

# Get domain from environment or use default
echo "Configuring Caddy for domain: $DOMAIN"

# Create Caddyfile - configure as reverse proxy to PM2 servers
cat > /tmp/Caddyfile << EOF
# Main production domain
$DOMAIN {
    # Disable compression globally to prevent content transformation issues
    encode identity
    
    # Explicitly handle CSS files with highest priority
    @css_files {
        path *.css
    }
    
    # Special handler for CSS files - fixes MIME type and empty response issues
    handle @css_files {
        # Force correct Content-Type header
        header Content-Type "text/css; charset=utf-8"
        
        # Other useful headers
        header Cache-Control "no-cache, must-revalidate"
        header X-Content-Type-Options "nosniff"
        
        # Remove any problematic headers that might affect content
        header -Content-Encoding
        header -Transfer-Encoding
        header -Content-Length
        
        # Special proxy config for CSS files
        reverse_proxy localhost:$PRODUCTION_PORT {
            # Ensure headers are properly set for CSS
            header_down -Content-Type
            header_down +Content-Type "text/css; charset=utf-8"
            header_down -Content-Encoding
            header_down -Transfer-Encoding
        }
    }
    
    # Handle all other requests
    handle {
        # Reverse proxy to PM2-managed production server
        reverse_proxy localhost:$PRODUCTION_PORT {
            # Add health checks to ensure the server is running
            health_uri /
            health_interval 30s
            health_timeout 5s
            health_status 200
            
            # Preserve original host header
            header_up Host {host}
            
            # Forward the real client IP
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # Ensure content is properly proxied without transformation
            header_down -Content-Security-Policy
        }
    }
    
    # Security headers for all responses with relaxed CSP
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        # More permissive CSP for style sources
        Content-Security-Policy "default-src 'self' *; style-src 'self' * 'unsafe-inline'; script-src 'self' * 'unsafe-inline'; img-src 'self' * data:; font-src 'self' * data:; connect-src 'self' *;"
    }
}

# Preview subdomain
preview.$DOMAIN {
    # Disable compression globally to prevent content transformation issues
    encode identity
    
    # Explicitly handle CSS files with highest priority
    @css_files {
        path *.css
    }
    
    # Special handler for CSS files - fixes MIME type and empty response issues
    handle @css_files {
        # Force correct Content-Type header
        header Content-Type "text/css; charset=utf-8"
        
        # Other useful headers
        header Cache-Control "no-cache, must-revalidate"
        header X-Content-Type-Options "nosniff"
        
        # Remove any problematic headers that might affect content
        header -Content-Encoding
        header -Transfer-Encoding
        header -Content-Length
        
        # Special proxy config for CSS files
        reverse_proxy localhost:$PREVIEW_PORT {
            # Ensure headers are properly set for CSS
            header_down -Content-Type
            header_down +Content-Type "text/css; charset=utf-8"
            header_down -Content-Encoding
            header_down -Transfer-Encoding
        }
    }
    
    # Handle all other requests
    handle {
        # Reverse proxy to PM2-managed preview server
        reverse_proxy localhost:$PREVIEW_PORT {
            # Add health checks to ensure the server is running
            health_uri /
            health_interval 30s
            health_timeout 5s
            health_status 200
            
            # Preserve original host header
            header_up Host {host}
            
            # Forward the real client IP
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # Ensure content is properly proxied without transformation
            header_down -Content-Security-Policy
        }
    }
    
    # Security headers for all responses with relaxed CSP
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        # More permissive CSP for preview environment
        Content-Security-Policy "default-src 'self' *; style-src 'self' * 'unsafe-inline'; script-src 'self' * 'unsafe-inline'; img-src 'self' * data:; font-src 'self' * data:; connect-src 'self' *;"
    }
}
EOF

# Move Caddyfile to the correct location
sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile

# Format the Caddyfile to fix inconsistencies
echo "Formatting Caddyfile..."
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Validate the Caddyfile
echo "Validating Caddyfile..."
sudo caddy validate --config /etc/caddy/Caddyfile
if [ $? -eq 0 ]; then
  echo "Caddy configuration is valid"
else
  echo "Caddy configuration is invalid"
  exit 1
fi

# Reload Caddy to apply new configuration
echo "Reloading Caddy..."
sudo systemctl reload caddy

# Create placeholder files for health checks if needed
# These files are only used until the PM2 servers are running
if [ ! -f /opt/personal-brain-website/production/dist/index.html ]; then
  echo "Creating default production template..."
  cp /opt/personal-brain/src/mcp/contexts/website/services/deployment/productionTemplate.html /opt/personal-brain-website/production/dist/index.html
  echo "<p>Note: This is a placeholder. The actual site will be served by PM2 on port $PRODUCTION_PORT.</p>" >> /opt/personal-brain-website/production/dist/index.html
fi

if [ ! -f /opt/personal-brain-website/preview/dist/index.html ]; then
  echo "Creating default preview template..."
  cp /opt/personal-brain/src/mcp/contexts/website/services/deployment/productionTemplate.html /opt/personal-brain-website/preview/dist/index.html
  # Update the title to indicate it's the preview environment
  sed -i 's/Production Environment/Preview Environment/g' /opt/personal-brain-website/preview/dist/index.html
  echo "<p>Note: This is a placeholder. The actual site will be served by PM2 on port $PREVIEW_PORT.</p>" >> /opt/personal-brain-website/preview/dist/index.html
fi

echo "Website environment setup complete!"
echo "Caddy is now configured as a reverse proxy to PM2 servers."
echo "Production URL: https://$DOMAIN (proxies to localhost:$PRODUCTION_PORT)"
echo "Preview URL: https://preview.$DOMAIN (proxies to localhost:$PREVIEW_PORT)"
echo ""
echo "Note: Make sure PM2 servers are running on the configured ports."