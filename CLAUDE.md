# CLAUDE.md - Guidelines for Personal Brain Repository

## Development Commands
- **Install**: `bun install`
- **Run**: `bun run src/index.ts`
- **Typecheck**: `bun run typecheck` (alias for `tsc --noEmit`)
- **Format**: `bun run fmt` (uses Biome or Prettier)
- **Lint**: `bun run lint`
- **Test**: `bun test` (for all tests)
- **Single Test**: `bun test path/to/test.ts`

## Code Style Guidelines
- **TypeScript**: Use strict typing (noImplicitAny, strictNullChecks)
- **Imports**: Group by 1) built-in, 2) external, 3) internal; sort alphabetically
- **Formatting**: 2-space indentation, single quotes, trailing comma
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Use explicit try/catch; avoid throwing in async functions
- **Async**: Prefer async/await over raw promises
- **Comments**: JSDoc for exported functions and complex logic
- **File Structure**: One responsibility per file, max ~300 lines
- **Exports**: Prefer named over default exports

## Project-Specific Patterns
- Use Bun as the runtime environment
- ESM modules preferred (type: "module" in package.json)
- Follow React function component patterns for UI