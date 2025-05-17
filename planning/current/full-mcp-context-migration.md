# Full MCP Context Migration Plan

## Overview
Replace all old context implementations with new MCP contexts throughout the codebase.

## Step 1: Update Context Export Files
1. Update each context's index.ts to export the new MCP context alongside the old one
2. Add type exports for the new context configurations

## Step 2: Update Protocol Layer
1. Update all protocol files to import the new MCP contexts
2. Ensure type compatibility with the new interfaces

## Step 3: Update Main Entry Points
1. Update src/index.ts to use MCPNoteContext
2. Update CLI, Matrix, and other interfaces

## Step 4: Remove Old Context Implementations
1. Delete old context files (BaseContext, individual contexts)
2. Clean up imports and exports
3. Remove migration compatibility layers

## Step 5: Update Tests and Documentation
1. Update all test imports
2. Update documentation with new patterns
3. Remove legacy test files