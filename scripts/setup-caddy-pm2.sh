#!/bin/bash
# Script to set up Caddy and PM2 for the hybrid deployment approach

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo permissions"
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Setting up Hybrid PM2-Caddy Deployment ===${NC}"

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo -e "${RED}Domain name is required. Exiting.${NC}"
  exit 1
fi

# 1. Install Caddy
echo -e "\n${YELLOW}Installing Caddy...${NC}"
apt-get update
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# 2. Create website directories
echo -e "\n${YELLOW}Creating website directories...${NC}"
mkdir -p /opt/personal-brain-website/preview/dist
mkdir -p /opt/personal-brain-website/production/dist

# Set permissions - get the current user
CURRENT_USER=$(logname || echo "$SUDO_USER" || echo "$USER")
echo -e "Setting ownership to user: ${CURRENT_USER}"
chown -R "$CURRENT_USER":"$CURRENT_USER" /opt/personal-brain-website

# 3. Create Caddyfile
echo -e "\n${YELLOW}Creating Caddyfile...${NC}"
cat > /etc/caddy/Caddyfile << EOF
# Main production domain
$DOMAIN_NAME {
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
preview.$DOMAIN_NAME {
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

# 4. Validate and reload Caddy
echo -e "\n${YELLOW}Validating Caddyfile...${NC}"
if caddy validate --config /etc/caddy/Caddyfile; then
  echo -e "${GREEN}Caddyfile is valid${NC}"
  systemctl reload caddy
  echo -e "${GREEN}Caddy reloaded successfully${NC}"
else
  echo -e "${RED}Caddyfile validation failed${NC}"
fi

# 5. Create placeholder files
echo -e "\n${YELLOW}Creating placeholder files...${NC}"

# Get the personal-brain location
PERSONAL_BRAIN_DIR="/opt/personal-brain"
if [ ! -d "$PERSONAL_BRAIN_DIR" ]; then
  read -p "Enter the path to your personal-brain repository: " PERSONAL_BRAIN_DIR
  if [ ! -d "$PERSONAL_BRAIN_DIR" ]; then
    echo -e "${RED}Directory not found. Using default template files.${NC}"
    
    # Create default production template
    cat > /opt/personal-brain-website/production/dist/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal Brain - Production Environment</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    h1 { color: #2563eb; }
    h2 { color: #4b5563; }
    .container {
      background-color: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Personal Brain</h1>
    <p>Production Environment</p>
    <h2>Welcome!</h2>
    <p>This is a placeholder page for your production environment.</p>
  </div>
</body>
</html>
EOF

    # Create default preview template
    cat > /opt/personal-brain-website/preview/dist/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal Brain - Preview Environment</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    h1 { color: #2563eb; }
    h2 { color: #4b5563; }
    .container {
      background-color: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Personal Brain</h1>
    <p>Preview Environment</p>
    <h2>Welcome!</h2>
    <p>This is a placeholder page for your preview environment.</p>
  </div>
</body>
</html>
EOF
  else
    # Copy from template file if it exists
    TEMPLATE_PATH="$PERSONAL_BRAIN_DIR/src/mcp/contexts/website/services/deployment/productionTemplate.html"
    if [ -f "$TEMPLATE_PATH" ]; then
      cp "$TEMPLATE_PATH" /opt/personal-brain-website/production/dist/index.html
      cp "$TEMPLATE_PATH" /opt/personal-brain-website/preview/dist/index.html
      # Update the title to indicate it's the preview environment
      sed -i 's/Production Environment/Preview Environment/g' /opt/personal-brain-website/preview/dist/index.html
      echo -e "${GREEN}Template files copied successfully${NC}"
    else
      echo -e "${RED}Template file not found at $TEMPLATE_PATH${NC}"
    fi
  fi
else
  # Copy from template file
  TEMPLATE_PATH="$PERSONAL_BRAIN_DIR/src/mcp/contexts/website/services/deployment/productionTemplate.html"
  if [ -f "$TEMPLATE_PATH" ]; then
    cp "$TEMPLATE_PATH" /opt/personal-brain-website/production/dist/index.html
    cp "$TEMPLATE_PATH" /opt/personal-brain-website/preview/dist/index.html
    # Update the title to indicate it's the preview environment
    sed -i 's/Production Environment/Preview Environment/g' /opt/personal-brain-website/preview/dist/index.html
    echo -e "${GREEN}Template files copied successfully${NC}"
  else
    echo -e "${RED}Template file not found at $TEMPLATE_PATH${NC}"
  fi
fi

# 6. Update environment variables if personal-brain directory exists
if [ -d "$PERSONAL_BRAIN_DIR" ]; then
  echo -e "\n${YELLOW}Updating environment variables...${NC}"
  
  # Check if .env file exists
  ENV_FILE="$PERSONAL_BRAIN_DIR/.env"
  if [ -f "$ENV_FILE" ]; then
    # Check if WEBSITE_DOMAIN is already set
    if grep -q "WEBSITE_DOMAIN" "$ENV_FILE"; then
      sed -i "s/WEBSITE_DOMAIN=.*/WEBSITE_DOMAIN=$DOMAIN_NAME/" "$ENV_FILE"
    else
      echo "WEBSITE_DOMAIN=$DOMAIN_NAME" >> "$ENV_FILE"
    fi
    
    # Check if WEBSITE_DEPLOYMENT_TYPE is already set
    if grep -q "WEBSITE_DEPLOYMENT_TYPE" "$ENV_FILE"; then
      sed -i "s/WEBSITE_DEPLOYMENT_TYPE=.*/WEBSITE_DEPLOYMENT_TYPE=caddy/" "$ENV_FILE"
    else
      echo "WEBSITE_DEPLOYMENT_TYPE=caddy" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}Environment variables updated in $ENV_FILE${NC}"
  else
    echo -e "${YELLOW}No .env file found at $ENV_FILE${NC}"
  fi
else
  echo -e "${YELLOW}Personal brain directory not found. Environment variables not updated.${NC}"
fi

# 7. Start Caddy service
echo -e "\n${YELLOW}Starting Caddy service...${NC}"
systemctl enable caddy
systemctl start caddy

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "You need to ensure your DNS records are set up correctly:"
echo -e "- An A record for $DOMAIN_NAME pointing to your server's IP"
echo -e "- An A record for preview.$DOMAIN_NAME pointing to your server's IP"
echo -e "\nTest your setup by running: ${YELLOW}bash test-caddy-pm2-setup.sh${NC}"
echo -e "Run your bot and use the website commands: ${YELLOW}website-build, website-status, website-promote${NC}"