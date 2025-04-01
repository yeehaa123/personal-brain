#!/bin/bash

# Script to update import paths from mcp-sdk to mcp
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's|from '\''@/mcp-sdk|from '\''@/mcp|g' {} \;
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's|from "\.\.\/mcp-sdk|from "\.\.\/mcp|g' {} \;
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's|from '\''\.\.\/mcp-sdk|from '\''\.\.\/mcp|g' {} \;

# Also update the paths for import.meta.resolve
find /home/yeehaa/Documents/personal-brain -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's|import\.meta\.resolve('\''\.\.\/src\/mcp-sdk|import\.meta\.resolve('\''\.\.\/src\/mcp|g' {} \;

echo "Import paths updated."