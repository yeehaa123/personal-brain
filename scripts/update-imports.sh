#!/bin/bash

# Script to update imports from @mcp to @mcp-sdk in test files

# Function to update imports in a file
update_file() {
  local file=$1
  echo "Updating $file..."
  
  # Update import statements
  # Replace protocol imports
  sed -i 's/import \(.*\) from '\''@mcp\/protocol\/brainProtocol'\'';/import \1 from '\''@\/mcp-sdk\/protocol'\'';/g' "$file"
  sed -i 's/import \(.*\) from '\''@mcp\/protocol\/components\/\(.*\)'\'';/import \1 from '\''@\/mcp-sdk\/protocol\/components'\'';/g' "$file"
  sed -i 's/import type \(.*\) from '\''@mcp\/protocol\/components\/\(.*\)'\'';/import type \1 from '\''@\/mcp-sdk\/protocol\/components'\'';/g' "$file"
  sed -i 's/import \(.*\) from '\''@mcp\/protocol\/types'\'';/import \1 from '\''@\/mcp-sdk\/protocol\/types'\'';/g' "$file"
  
  # Replace model imports
  sed -i 's/import \(.*\) from '\''@mcp\/model\/embeddings'\'';/import \1 from '\''@\/mcp-sdk\/model'\'';/g' "$file"
  sed -i 's/import \(.*\) from '\''@mcp\/model\/claude'\'';/import \1 from '\''@\/mcp-sdk\/model'\'';/g' "$file"
  
  # Replace context imports
  sed -i 's/import \(.*\) from '\''@mcp\/context\/externalSourceContext'\'';/import \1 from '\''@\/mcp-sdk\/contexts\/externalSources'\'';/g' "$file"
  sed -i 's/import \(.*\) from '\''@mcp\/context\/noteContext'\'';/import \1 from '\''@\/mcp-sdk\/contexts\/notes'\'';/g' "$file"
  sed -i 's/import \(.*\) from '\''@mcp\/context\/profileContext'\'';/import \1 from '\''@\/mcp-sdk\/contexts\/profiles'\'';/g' "$file"
  
  # Replace sources imports
  sed -i 's/import \(.*\) from '\''@mcp\/context\/sources\/wikipediaSource'\'';/import \1 from '\''@\/mcp-sdk\/contexts\/externalSources\/sources'\'';/g' "$file"
  sed -i 's/import \(.*\) from '\''@mcp\/context\/sources\/newsApiSource'\'';/import \1 from '\''@\/mcp-sdk\/contexts\/externalSources\/sources'\'';/g' "$file"
  
  # Replace type imports
  sed -i 's/import type \(.*\) from '\''@mcp\/context\/sources\/externalSourceInterface'\'';/import type \1 from '\''@\/mcp-sdk\/contexts\/externalSources\/sources'\'';/g' "$file"
  
  # Update import.meta.resolve paths for file existence tests
  sed -i 's/import\.meta\.resolve('\''\.\.\/src\/mcp\/protocol\/brainProtocol'\'')/import\.meta\.resolve('\''\.\.\/src\/mcp-sdk\/protocol\/brainProtocol'\'')/g' "$file"
  sed -i 's/import\.meta\.resolve('\''\.\.\/src\/mcp\/context\/externalSourceContext'\'')/import\.meta\.resolve('\''\.\.\/src\/mcp-sdk\/contexts\/externalSources\/externalSourceContext'\'')/g' "$file"
  sed -i 's/import\.meta\.resolve('\''\.\.\/src\/mcp\/context\/sources\/wikipediaSource'\'')/import\.meta\.resolve('\''\.\.\/src\/mcp-sdk\/contexts\/externalSources\/sources\/wikipediaSource'\'')/g' "$file"
  sed -i 's/import\.meta\.resolve('\''\.\.\/src\/mcp\/context\/sources\/newsApiSource'\'')/import\.meta\.resolve('\''\.\.\/src\/mcp-sdk\/contexts\/externalSources\/sources\/newsApiSource'\'')/g' "$file"
  sed -i 's/import\.meta\.resolve('\''\.\.\/src\/mcp\/context\/sources\/externalSourceInterface'\'')/import\.meta\.resolve('\''\.\.\/src\/mcp-sdk\/contexts\/externalSources\/sources\/externalSourceInterface'\'')/g' "$file"
}

# Find and update all test files that import from @mcp
find /home/yeehaa/Documents/personal-brain/tests -type f -name "*.test.ts" -exec grep -l "@mcp/" {} \; | while read file; do
  update_file "$file"
done

echo "Import updates complete."