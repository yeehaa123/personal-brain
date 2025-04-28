#!/bin/bash
# CSS and Caddy Diagnostic Script for Personal Brain

# Configuration
PREVIEW_PORT="${WEBSITE_PREVIEW_PORT:-4321}"
PRODUCTION_PORT="${WEBSITE_PRODUCTION_PORT:-4322}"
DOMAIN="${WEBSITE_DOMAIN:-example.com}"

echo "===== CSS & Caddy Diagnostic Tool ====="
echo "Running diagnostics on $(hostname) at $(date)"
echo ""

# Check basic system info
echo "===== System Information ====="
echo "$(uname -a)"
echo "$(lsb_release -a 2>/dev/null || cat /etc/*release 2>/dev/null || echo 'OS info not available')"
echo ""

# Check if serve and Caddy are installed
echo "===== Package Versions ====="
if command -v serve &> /dev/null; then
    echo "serve: $(serve --version 2>&1 || echo 'Version not available')"
else
    echo "serve: Not installed"
fi

if command -v caddy &> /dev/null; then
    echo "caddy: $(caddy version)"
else
    echo "caddy: Not installed"
fi

echo "bun: $(bun --version 2>/dev/null || echo 'Not installed')"
echo "node: $(node --version 2>/dev/null || echo 'Not installed')"
echo "pm2: $(pm2 --version 2>/dev/null || echo 'Not installed')"
echo ""

# Check running processes
echo "===== Running Processes ====="
echo "PM2 processes:"
pm2 list 2>/dev/null || echo "PM2 not running or not installed"
echo ""

echo "Node/Bun processes:"
ps aux | grep -E 'node|bun' | grep -v grep
echo ""

echo "Caddy process:"
ps aux | grep caddy | grep -v grep
echo ""

# Check ports
echo "===== Port Checks ====="
echo "Checking preview port $PREVIEW_PORT:"
if command -v nc &> /dev/null; then
    timeout 1 nc -zv localhost $PREVIEW_PORT 2>&1 || echo "Port $PREVIEW_PORT not accessible"
else
    echo "netcat not installed, using curl instead:"
    curl -s -I -m 1 http://localhost:$PREVIEW_PORT/ | head -1 || echo "Port $PREVIEW_PORT not accessible"
fi

echo "Checking production port $PRODUCTION_PORT:"
if command -v nc &> /dev/null; then
    timeout 1 nc -zv localhost $PRODUCTION_PORT 2>&1 || echo "Port $PRODUCTION_PORT not accessible"
else
    echo "netcat not installed, using curl instead:"
    curl -s -I -m 1 http://localhost:$PRODUCTION_PORT/ | head -1 || echo "Port $PRODUCTION_PORT not accessible"
fi
echo ""

# Check Caddy configuration
echo "===== Caddy Configuration ====="
if [ -f /etc/caddy/Caddyfile ]; then
    echo "Caddy configuration exists:"
    cat /etc/caddy/Caddyfile
    
    echo ""
    echo "Validating Caddy configuration:"
    caddy validate --config /etc/caddy/Caddyfile 2>&1
    
    echo ""
    echo "Caddy CSS-related configuration:"
    grep -n -A 5 -B 2 "css" /etc/caddy/Caddyfile || echo "No CSS configuration found"
else
    echo "Caddyfile not found at /etc/caddy/Caddyfile"
fi
echo ""

# Check Caddy service status
echo "===== Caddy Service Status ====="
if command -v systemctl &> /dev/null; then
    systemctl status caddy | head -15
else
    echo "systemctl not found, cannot check service status"
fi
echo ""

# Test direct file access
echo "===== Direct File Access Test ====="
# Find a CSS file to test
preview_css=$(find $(pwd)/src/website/dist -name "*.css" 2>/dev/null | head -1)
production_css=$(find $(pwd)/dist/production -name "*.css" 2>/dev/null | head -1)

if [ -n "$preview_css" ]; then
    echo "Testing preview CSS file: $preview_css"
    echo "File size: $(du -h "$preview_css" | cut -f1)"
    echo "File content sample (first 100 bytes):"
    head -c 100 "$preview_css" | xxd
    
    # Extract relative path
    rel_path=${preview_css#$(pwd)/src/website/dist/}
    
    echo "Testing direct access to CSS through serve:"
    curl -s -I -X GET "http://localhost:$PREVIEW_PORT/$rel_path"
    echo "First 100 bytes of direct CSS response:"
    curl -s -X GET "http://localhost:$PREVIEW_PORT/$rel_path" | head -c 100 | xxd
else
    echo "No CSS files found in preview directory"
fi

if [ -n "$production_css" ]; then
    echo "Testing production CSS file: $production_css"
    echo "File size: $(du -h "$production_css" | cut -f1)"
    echo "File content sample (first 100 bytes):"
    head -c 100 "$production_css" | xxd
    
    # Extract relative path
    rel_path=${production_css#$(pwd)/dist/production/}
    
    echo "Testing direct access to CSS through serve:"
    curl -s -I -X GET "http://localhost:$PRODUCTION_PORT/$rel_path"
    echo "First 100 bytes of direct CSS response:"
    curl -s -X GET "http://localhost:$PRODUCTION_PORT/$rel_path" | head -c 100 | xxd
else
    echo "No CSS files found in production directory"
fi
echo ""

# Test through Caddy
echo "===== Caddy Proxy Test ====="
if [ -n "$preview_css" ]; then
    rel_path=${preview_css#/opt/personal-brain-website/preview/dist/}
    
    echo "Testing CSS through Caddy proxy (preview):"
    echo "curl -s -I -X GET \"https://preview.$DOMAIN/$rel_path\""
    echo "First 100 bytes of proxied CSS response:"
    echo "curl -s -X GET \"https://preview.$DOMAIN/$rel_path\" | head -c 100 | xxd"
    echo "(Run these commands manually to check Caddy responses)"
fi

if [ -n "$production_css" ]; then
    rel_path=${production_css#/opt/personal-brain-website/production/dist/}
    
    echo "Testing CSS through Caddy proxy (production):"
    echo "curl -s -I -X GET \"https://$DOMAIN/$rel_path\""
    echo "First 100 bytes of proxied CSS response:"
    echo "curl -s -X GET \"https://$DOMAIN/$rel_path\" | head -c 100 | xxd"
    echo "(Run these commands manually to check Caddy responses)"
fi
echo ""

# Find HTML files and check CSS references
echo "===== HTML File Analysis ====="
preview_html=$(find $(pwd)/src/website/dist -name "*.html" 2>/dev/null | head -1)
production_html=$(find $(pwd)/dist/production -name "*.html" 2>/dev/null | head -1)

if [ -n "$preview_html" ]; then
    echo "Preview HTML file: $preview_html"
    echo "CSS references in HTML:"
    grep -o '<link[^>]*\.css[^>]*>' "$preview_html" || echo "No CSS references found"
else
    echo "No HTML files found in preview directory"
fi

if [ -n "$production_html" ]; then
    echo "Production HTML file: $production_html"
    echo "CSS references in HTML:"
    grep -o '<link[^>]*\.css[^>]*>' "$production_html" || echo "No CSS references found"
else
    echo "No HTML files found in production directory"
fi
echo ""

# Check for potential issues with transparent response bodies
echo "===== Caddy Response Transformation Test ====="
echo "Creating test file..."
echo "body { color: red; }" > /tmp/test.css

echo "Testing direct serve response for test file:"
echo "Starting temporary serve process..."
cd /tmp && nohup serve -p 9876 > /dev/null 2>&1 &
SERVE_PID=$!
sleep 2

# Test direct serve response
echo "Direct serve headers:"
curl -s -I -X GET "http://localhost:9876/test.css"
echo "Direct serve content:"
curl -s -X GET "http://localhost:9876/test.css"

# Clean up
kill $SERVE_PID
rm /tmp/test.css
echo ""

echo "===== Suggested Fixes ====="
echo "Based on common Caddy CSS issues, try this updated configuration:"
cat << 'EOF'
# Place this in your Caddyfile and reload Caddy

yourdomain.com {
  # Disable HTTP compression for all responses to ensure no encoding issues
  encode identity
  
  # Handle CSS files first with highest priority
  @css_files {
    path *.css
  }
  
  # Special CSS handling
  handle @css_files {
    # Critical: Send CSS files unaltered
    header Content-Type "text/css; charset=utf-8"
    header -Content-Encoding identity
    header -Content-Length
    header -Transfer-Encoding identity
    
    # Forward request to backend without alterations
    reverse_proxy localhost:4322 {
      header_down -Content-Encoding
      header_down -Transfer-Encoding
    }
  }
  
  # All other requests
  handle {
    reverse_proxy localhost:4322
  }
}

# Similar configuration for preview site
preview.yourdomain.com {
  # Disable HTTP compression for all responses
  encode identity
  
  @css_files {
    path *.css
  }
  
  handle @css_files {
    header Content-Type "text/css; charset=utf-8"
    header -Content-Encoding identity
    header -Content-Length
    header -Transfer-Encoding identity
    
    reverse_proxy localhost:4321 {
      header_down -Content-Encoding
      header_down -Transfer-Encoding
    }
  }
  
  handle {
    reverse_proxy localhost:4321
  }
}
EOF
echo ""

echo "===== Diagnostic Complete ====="
echo "Remember to check the browser's Developer Tools Network tab to see:"
echo "1. The Content-Type header for CSS files"
echo "2. The Content-Encoding header (should be missing or 'identity')"
echo "3. Whether the Response size matches the actual file size"
echo ""
echo "Diagnostic completed at $(date)"

# Generate a compact, copy-pastable summary
echo ""
echo "-----COPY FROM HERE-----"
echo "## CSS DIAGNOSTIC RESULTS"
echo "Date: $(date)"
echo "Host: $(hostname)"
echo ""
echo "### Server Status"
echo "PM2 preview server: $(pm2 list | grep "website-preview" | grep "online" > /dev/null && echo "Running" || echo "Not running")"
echo "PM2 production server: $(pm2 list | grep "website-production" | grep "online" > /dev/null && echo "Running" || echo "Not running")"
echo "Caddy service: $(systemctl is-active caddy 2>/dev/null || echo "Unknown")"
echo ""
echo "### Preview CSS Issues"
if [ -n "$preview_css" ]; then
    echo "CSS file: $(basename "$preview_css")"
    echo "File size: $(du -h "$preview_css" | cut -f1)"
    css_content=$(head -c 20 "$preview_css" | xxd -p)
    echo "CSS begins with: $css_content"
    
    # Test direct serve response
    direct_headers=$(curl -s -I -X GET "http://localhost:$PREVIEW_PORT/$rel_path")
    direct_type=$(echo "$direct_headers" | grep -i "Content-Type" | sed 's/^.*: //')
    direct_encoding=$(echo "$direct_headers" | grep -i "Content-Encoding" | sed 's/^.*: //')
    echo "Serve Content-Type: $direct_type"
    echo "Serve Content-Encoding: ${direct_encoding:-None}"
    
    # Get content length from direct serve
    direct_content=$(curl -s -X GET "http://localhost:$PREVIEW_PORT/$rel_path")
    direct_size=${#direct_content}
    echo "Serve response size: $direct_size bytes"
    echo "Comparison: $(if [ "$direct_size" -gt 0 ]; then echo "CSS served directly ✅"; else echo "Empty CSS from serve ❌"; fi)"
else
    echo "No CSS files found in preview directory ❌"
fi

echo ""
echo "### Production CSS Issues"
if [ -n "$production_css" ]; then
    echo "CSS file: $(basename "$production_css")"
    echo "File size: $(du -h "$production_css" | cut -f1)"
    css_content=$(head -c 20 "$production_css" | xxd -p)
    echo "CSS begins with: $css_content"
    
    # Test direct serve response
    direct_headers=$(curl -s -I -X GET "http://localhost:$PRODUCTION_PORT/$rel_path")
    direct_type=$(echo "$direct_headers" | grep -i "Content-Type" | sed 's/^.*: //')
    direct_encoding=$(echo "$direct_headers" | grep -i "Content-Encoding" | sed 's/^.*: //')
    echo "Serve Content-Type: $direct_type"
    echo "Serve Content-Encoding: ${direct_encoding:-None}"
    
    # Get content length from direct serve
    direct_content=$(curl -s -X GET "http://localhost:$PRODUCTION_PORT/$rel_path")
    direct_size=${#direct_content}
    echo "Serve response size: $direct_size bytes"
    echo "Comparison: $(if [ "$direct_size" -gt 0 ]; then echo "CSS served directly ✅"; else echo "Empty CSS from serve ❌"; fi)"
else
    echo "No CSS files found in production directory ❌"
fi

echo ""
echo "### Caddy Configuration"
caddy_valid=$(caddy validate --config /etc/caddy/Caddyfile 2>&1 > /dev/null && echo "Valid" || echo "Invalid")
echo "Caddyfile validation: $caddy_valid"
css_headers=$(grep -n "@css" /etc/caddy/Caddyfile 2>/dev/null || echo "No CSS-specific rules found")
echo "CSS handling found at lines: ${css_headers:-None}"

# Extract the most relevant Caddy config
if grep -q "@css" /etc/caddy/Caddyfile 2>/dev/null; then
    echo "CSS handler configuration:"
    grep -A 10 -B 2 "@css" /etc/caddy/Caddyfile | head -15
else
    echo "No CSS-specific handler found in Caddyfile"
fi

echo "-----COPY UNTIL HERE-----"