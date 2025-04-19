#!/bin/bash

echo "=== Updating imports in src/ ==="

# More comprehensive imports update for all import styles
find ./src -type f -name "*.ts" -exec sed -i "s|from ['\"]\(@/protocol/core/\)contextOrchestratorExtended['\"]|from \1contextOrchestrator\"|g" {} \;

# Specific import cases
find ./src -type f -name "*.ts" -exec sed -i "s|import { ContextOrchestratorExtended }|import { ContextOrchestrator }|g" {} \;
find ./src -type f -name "*.ts" -exec sed -i "s|import type { ContextOrchestratorExtended }|import type { ContextOrchestrator }|g" {} \;
find ./src -type f -name "*.ts" -exec sed -i "s|import { ContextId, ContextOrchestratorExtended }|import { ContextId, ContextOrchestrator }|g" {} \;

# Update usage of ContextOrchestratorExtended type to ContextOrchestrator in files
find ./src -type f -name "*.ts" -exec sed -i "s|ContextOrchestratorExtended|ContextOrchestrator|g" {} \;

echo "=== Updating imports in tests/ ==="

# More comprehensive imports update for all import styles in tests
find ./tests -type f -name "*.ts" -exec sed -i "s|from ['\"]\(@/protocol/core/\)contextOrchestratorExtended['\"]|from \1contextOrchestrator\"|g" {} \;
find ./tests -type f -name "*.ts" -exec sed -i "s|from ['\"]\(@test/__mocks__/protocol/core/\)contextOrchestratorExtended['\"]|from \1contextOrchestrator\"|g" {} \;

# Specific import cases
find ./tests -type f -name "*.ts" -exec sed -i "s|import { ContextOrchestratorExtended }|import { ContextOrchestrator }|g" {} \;
find ./tests -type f -name "*.ts" -exec sed -i "s|import type { ContextOrchestratorExtended }|import type { ContextOrchestrator }|g" {} \;
find ./tests -type f -name "*.ts" -exec sed -i "s|import { ContextId, ContextOrchestratorExtended }|import { ContextId, ContextOrchestrator }|g" {} \;

# Update usage of ContextOrchestratorExtended type to ContextOrchestrator in test files
find ./tests -type f -name "*.ts" -exec sed -i "s|ContextOrchestratorExtended|ContextOrchestrator|g" {} \;

echo "Import updates completed"