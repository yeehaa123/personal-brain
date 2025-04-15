#!/bin/bash
# Script to set up Caddy for the hybrid PM2-Caddy deployment

# Get domain from argument or environment variable
DOMAIN="${1:-$WEBSITE_DOMAIN}"

# Create website directories if they don't exist
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

# Create Caddyfile - using direct variable substitution instead of placeholders
cat > /tmp/Caddyfile << EOF
# Main production domain
$DOMAIN {
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
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';"
    }
    
    # Handle SPA fallback
    try_files {path} /index.html
}

# Preview subdomain
preview.$DOMAIN {
    root * /opt/personal-brain-website/preview/dist
    file_server
    encode gzip
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';"
    }
    
    # Handle SPA fallback
    try_files {path} /index.html
}
EOF

# Move Caddyfile to the correct location
sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile

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

# Copy template file to production and preview directories if they're empty
if [ ! -f /opt/personal-brain-website/production/dist/index.html ]; then
  echo "Creating default production template..."
  cp /opt/personal-brain/src/mcp/contexts/website/services/deployment/productionTemplate.html /opt/personal-brain-website/production/dist/index.html
fi

if [ ! -f /opt/personal-brain-website/preview/dist/index.html ]; then
  echo "Creating default preview template..."
  cp /opt/personal-brain/src/mcp/contexts/website/services/deployment/productionTemplate.html /opt/personal-brain-website/preview/dist/index.html
  # Update the title to indicate it's the preview environment
  sed -i 's/Production Environment/Preview Environment/g' /opt/personal-brain-website/preview/dist/index.html
fi

echo "Website environment setup complete!"
echo "Production URL: https://$DOMAIN"
echo "Preview URL: https://preview.$DOMAIN"