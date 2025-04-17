#!/bin/bash

# Script to update import paths in test files after MCP directory flattening

echo "Updating import paths in test files..."

# Update contexts imports
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|@/mcp/contexts/|@/contexts/|g' {} \;
echo "Updated @/mcp/contexts/ references"

# Update protocol imports
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|@/mcp/protocol/|@/protocol/|g' {} \;
echo "Updated @/mcp/protocol/ references"

# Update transport imports
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|@/mcp/transport/|@/transport/|g' {} \;
echo "Updated @/mcp/transport/ references"

# Update resources imports
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|@/mcp/resources/|@/resources/|g' {} \;
echo "Updated @/mcp/resources/ references"

# Update model imports (model is now in resources/ai)
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|@/mcp/model/|@/resources/ai/|g' {} \;
echo "Updated @/mcp/model/ references"

# Update relative imports
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|src/mcp/contexts/|src/contexts/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|src/mcp/protocol/|src/protocol/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|src/mcp/transport/|src/transport/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|src/mcp/resources/|src/resources/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|src/mcp/model/|src/resources/ai/|g' {} \;
echo "Updated relative import paths"

# Update jest mock module paths
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|mock.module(.@/mcp/contexts/|mock.module(.@/contexts/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|mock.module(.@/mcp/protocol/|mock.module(.@/protocol/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|mock.module(.@/mcp/transport/|mock.module(.@/transport/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|mock.module(.@/mcp/resources/|mock.module(.@/resources/|g' {} \;
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.ts" -exec sed -i 's|mock.module(.@/mcp/model/|mock.module(.@/resources/ai/|g' {} \;
echo "Updated mock module paths"

echo "Import path updates complete."