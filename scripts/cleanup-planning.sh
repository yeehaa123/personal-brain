#!/bin/bash
# Script to archive planning documents after implementation is complete

# Create an archive directory if it doesn't exist
mkdir -p archive/planning

# Move completed planning documents to archive
mv planning/brain-protocol-refactoring-implementation.md archive/planning/
mv planning/brain-protocol-refactoring.md archive/planning/
mv planning/commands-refactoring.md archive/planning/
mv planning/documentation-plan.md archive/planning/
mv planning/profile-refactoring.md archive/planning/
mv planning/refactoring-plan.md archive/planning/

echo "Planning documents have been archived to ./archive/planning/"
echo "The completed refactoring documentation is now available at:"
echo "- docs/BRAIN_PROTOCOL_ARCHITECTURE.md - Comprehensive BrainProtocol documentation"
echo "- docs/TIERED_MEMORY.md - Tiered memory system documentation"
echo "- docs/TEST_ARCHITECTURE.md - Testing approach documentation"
echo "- src/mcp/protocol/README.md - Protocol component implementation details"