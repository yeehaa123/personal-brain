#\!/usr/bin/env bash
# Script to update import patterns to use barrel files

echo "Updating imports to use barrel files..."

# NOTE: This script focuses on specific common patterns and may not catch all cases

# Update imports for WebsiteContext
find src tests -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i "s|import .*WebsiteContext.*from .*@/contexts/website/core/websiteContext.*|import { WebsiteContext } from \"@/contexts\";|g" {} \;

# Update imports for NoteContext
find src tests -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i "s|import .*NoteContext.*from .*@/contexts/notes/core/noteContext.*|import { NoteContext } from \"@/contexts\";|g" {} \;

# Update imports for ProfileContext
find src tests -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i "s|import .*ProfileContext.*from .*@/contexts/profiles/core/profileContext.*|import { ProfileContext } from \"@/contexts\";|g" {} \;

# Update imports for ExternalSourceContext
find src tests -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i "s|import .*ExternalSourceContext.*from .*@/contexts/externalSources/core/externalSourceContext.*|import { ExternalSourceContext } from \"@/contexts\";|g" {} \;

# Update imports for ConversationContext
find src tests -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i "s|import .*ConversationContext.*from .*@/contexts/conversations/core/conversationContext.*|import { ConversationContext } from \"@/contexts\";|g" {} \;

echo "Import updates completed. Manual review recommended."

