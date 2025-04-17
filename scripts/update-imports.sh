#!/bin/bash

# Script to update import paths after removing MCP directory
# This replaces all import paths that still reference @/mcp

echo "Updating import paths in source and test files..."

# Update context imports
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|@/mcp/contexts/|@/contexts/|g' {} \;
echo "Updated @/mcp/contexts/ references"

# Update protocol imports
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|@/mcp/protocol/|@/protocol/|g' {} \;
echo "Updated @/mcp/protocol/ references"

# Update transport imports
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|@/mcp/transport/|@/transport/|g' {} \;
echo "Updated @/mcp/transport/ references"

# Update resources imports
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|@/mcp/resources/|@/resources/|g' {} \;
echo "Updated @/mcp/resources/ references"

# Update model imports (model is now in resources/ai)
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|@/mcp/model/|@/resources/ai/|g' {} \;
echo "Updated @/mcp/model/ references"

# Update imports for unifiedMcpServer
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|import.*from.*@/mcp|import { createUnifiedMcpServer } from "@/mcpServer"|g' {} \;
echo "Updated @/mcp imports for createUnifiedMcpServer"

# Update exports in index.ts
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -exec sed -i 's|export.*from.*@/mcp|export { createUnifiedMcpServer } from "@/mcpServer"|g' {} \;
echo "Updated exports from @/mcp"

echo "Import path updates complete."