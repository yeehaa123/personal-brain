#!/bin/bash
# Script to test the Caddy-PM2 hybrid deployment setup
# This script verifies that the hybrid deployment approach is properly set up
# Run this script on the server to check the Caddy and PM2 configuration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Hybrid PM2-Caddy Deployment ===${NC}"

# 1. Check if Caddy is installed and running
echo -e "\n${YELLOW}Checking Caddy Installation:${NC}"
if command -v caddy &> /dev/null; then
    echo -e "${GREEN}✓ Caddy is installed${NC}"
    
    # Check if Caddy service is running
    if systemctl is-active --quiet caddy; then
        echo -e "${GREEN}✓ Caddy service is running${NC}"
    else
        echo -e "${RED}✗ Caddy service is not running${NC}"
        echo -e "  Run: ${YELLOW}sudo systemctl start caddy${NC}"
    fi
else
    echo -e "${RED}✗ Caddy is not installed${NC}"
    echo -e "  Run GitHub Action or install manually: ${YELLOW}sudo apt-get install caddy${NC}"
fi

# 2. Check if PM2 is available
echo -e "\n${YELLOW}Checking PM2 Installation:${NC}"
if command -v bun &> /dev/null && bun run pm2 --version &> /dev/null; then
    echo -e "${GREEN}✓ PM2 is available through Bun${NC}"
    
    # Check if PM2 has website servers registered
    if bun run pm2 list | grep -q "website-preview\|website-production"; then
        echo -e "${GREEN}✓ Website servers are registered in PM2${NC}"
        
        # List running servers
        echo -e "  Running website servers:"
        bun run pm2 list | grep "website-" | awk '{print "  - " $2 " (" $10 ")"}'
    else
        echo -e "${YELLOW}! No website servers found in PM2${NC}"
        echo -e "  Run: ${YELLOW}bun run start${NC} to start the website servers"
    fi
else
    echo -e "${RED}✗ PM2 is not available${NC}"
    echo -e "  Run: ${YELLOW}bun install${NC} to install dependencies including PM2"
fi

# 3. Check directory structure
echo -e "\n${YELLOW}Checking Directory Structure:${NC}"
# Check website directories
PREVIEW_DIR="/opt/personal-brain-website/preview/dist"
PRODUCTION_DIR="/opt/personal-brain-website/production/dist"

if [ -d "$PREVIEW_DIR" ]; then
    PREVIEW_FILES=$(find "$PREVIEW_DIR" -type f | wc -l)
    echo -e "${GREEN}✓ Preview directory exists with $PREVIEW_FILES files${NC}"
else
    echo -e "${RED}✗ Preview directory missing: $PREVIEW_DIR${NC}"
fi

if [ -d "$PRODUCTION_DIR" ]; then
    PRODUCTION_FILES=$(find "$PRODUCTION_DIR" -type f | wc -l)
    echo -e "${GREEN}✓ Production directory exists with $PRODUCTION_FILES files${NC}"
else
    echo -e "${RED}✗ Production directory missing: $PRODUCTION_DIR${NC}"
fi

# 4. Check Caddy configuration
echo -e "\n${YELLOW}Checking Caddy Configuration:${NC}"
if [ -f "/etc/caddy/Caddyfile" ]; then
    echo -e "${GREEN}✓ Caddyfile exists${NC}"
    
    # Validate the Caddyfile
    if caddy validate --config /etc/caddy/Caddyfile &> /dev/null; then
        echo -e "${GREEN}✓ Caddyfile is valid${NC}"
    else
        echo -e "${RED}✗ Caddyfile is invalid${NC}"
    fi
    
    # Check the domain configuration
    DOMAIN=$(grep -v "^#" /etc/caddy/Caddyfile | grep -o "^[^{]*" | head -1 | tr -d ' ')
    if [ -n "$DOMAIN" ]; then
        echo -e "${GREEN}✓ Domain configured: $DOMAIN${NC}"
        
        # Check if preview subdomain is configured
        if grep -q "preview.$DOMAIN" /etc/caddy/Caddyfile; then
            echo -e "${GREEN}✓ Preview subdomain configured: preview.$DOMAIN${NC}"
        else
            echo -e "${RED}✗ Preview subdomain not configured${NC}"
        fi
    else
        echo -e "${RED}✗ No domain found in Caddyfile${NC}"
    fi
else
    echo -e "${RED}✗ Caddyfile not found at /etc/caddy/Caddyfile${NC}"
fi

# 5. Check environment variables
echo -e "\n${YELLOW}Checking Environment Variables:${NC}"
cd /opt/personal-brain 2>/dev/null || cd ~/Documents/personal-brain 2>/dev/null || { echo -e "${RED}✗ Cannot find personal-brain directory${NC}"; exit 1; }

if [ -f ".env" ]; then
    if grep -q "WEBSITE_DOMAIN" .env; then
        WEBSITE_DOMAIN=$(grep "WEBSITE_DOMAIN" .env | cut -d '=' -f2)
        echo -e "${GREEN}✓ WEBSITE_DOMAIN is set: $WEBSITE_DOMAIN${NC}"
    else
        echo -e "${YELLOW}! WEBSITE_DOMAIN not found in .env${NC}"
    fi
    
    if grep -q "WEBSITE_DEPLOYMENT_TYPE" .env; then
        WEBSITE_DEPLOYMENT_TYPE=$(grep "WEBSITE_DEPLOYMENT_TYPE" .env | cut -d '=' -f2)
        echo -e "${GREEN}✓ WEBSITE_DEPLOYMENT_TYPE is set: $WEBSITE_DEPLOYMENT_TYPE${NC}"
    else
        echo -e "${YELLOW}! WEBSITE_DEPLOYMENT_TYPE not found in .env${NC}"
    fi
else
    echo -e "${RED}✗ .env file not found${NC}"
fi

# 6. Test website accessibility
echo -e "\n${YELLOW}Testing Website Accessibility:${NC}"

# Get the domain name from environment or fallback
WEBSITE_DOMAIN=${WEBSITE_DOMAIN:-$(grep -v "^#" /etc/caddy/Caddyfile 2>/dev/null | grep -o "^[^{]*" | head -1 | tr -d ' ')}
WEBSITE_DOMAIN=${WEBSITE_DOMAIN:-"localhost"}

if [[ "$WEBSITE_DOMAIN" == "localhost" ]]; then
    # Test local ports for development mode
    echo -e "Testing local development ports..."
    
    # Test preview server
    if curl -s http://localhost:4321 -o /dev/null; then
        echo -e "${GREEN}✓ Preview server accessible at http://localhost:4321${NC}"
    else
        echo -e "${RED}✗ Preview server not accessible at http://localhost:4321${NC}"
    fi
    
    # Test production server
    if curl -s http://localhost:4322 -o /dev/null; then
        echo -e "${GREEN}✓ Production server accessible at http://localhost:4322${NC}"
    else
        echo -e "${RED}✗ Production server not accessible at http://localhost:4322${NC}"
    fi
else
    # For domain-based setup, show links but don't actually test (might not be public)
    echo -e "${BLUE}i Preview URL: https://preview.$WEBSITE_DOMAIN${NC}"
    echo -e "${BLUE}i Production URL: https://$WEBSITE_DOMAIN${NC}"
    echo -e "${YELLOW}! Domain-based access cannot be automatically verified from this script${NC}"
    echo -e "  Please manually verify these URLs in a web browser"
fi

# 7. Summary and next steps
echo -e "\n${BLUE}=== Summary ===${NC}"

if command -v caddy &> /dev/null && [ -d "$PREVIEW_DIR" ] && [ -d "$PRODUCTION_DIR" ] && [ -f "/etc/caddy/Caddyfile" ]; then
    echo -e "${GREEN}✓ Basic hybrid PM2-Caddy setup is in place${NC}"
    
    echo -e "\n${BLUE}=== Next Steps ===${NC}"
    echo -e "1. Run ${YELLOW}bun run website-build${NC} to generate the website in preview environment"
    echo -e "2. Check the preview site at the URL shown in the command output"
    echo -e "3. Run ${YELLOW}bun run website-promote${NC} to promote the preview site to production"
    echo -e "4. Run ${YELLOW}bun run website-status${NC} to check both environments"
else
    echo -e "${RED}✗ Hybrid PM2-Caddy setup is incomplete${NC}"
    
    echo -e "\n${BLUE}=== Fix Required ===${NC}"
    if ! command -v caddy &> /dev/null; then
        echo -e "- Install Caddy: Run the GitHub Action or install manually"
    fi
    if [ ! -d "$PREVIEW_DIR" ] || [ ! -d "$PRODUCTION_DIR" ]; then
        echo -e "- Create missing directories: $PREVIEW_DIR and $PRODUCTION_DIR"
    fi
    if [ ! -f "/etc/caddy/Caddyfile" ]; then
        echo -e "- Create Caddyfile: /etc/caddy/Caddyfile"
    fi
fi

echo -e "\n${BLUE}=== End of Test ===${NC}"