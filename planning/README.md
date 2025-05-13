# Planning Documents

This directory contains planning documents for Personal Brain features and architectural enhancements.

## Directory Structure

The planning documents have been organized into the following categories:

- **current/**: Planning documents for features in active development (post-MVP)
- **completed/**: Planning documents for features that have been fully implemented
- **archive/**: Planning documents that are outdated or superseded by newer plans

## Development Status

For a comprehensive overview of the project's current development status, see [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md).

## Completed Features

The following major features have been implemented:

1. **Protocol Response Simplification** - [details](completed/protocol-response-simplification.md)
2. **Bot-Controlled Website Deployment** - [details](completed/bot-controlled-website-deployment.md)
3. **Landing Page Segmentation** - [details](completed/landing-page-segmentation-improved.md)
4. **Landing Page Error Recovery** - [details](current/landing-page-section-error-recovery.md)
5. **Landing Page Note Persistence** - [details](current/landing-page-note-persistence.md)
6. **Website Identity Service** - [details](current/website-identity-service.md)
7. **Matrix Progress Tracking** - [details](current/matrix-progress-tracking-implementation.md)
8. **Test Suite Refactoring** - [details](completed/test-refactoring-results.md)

## MVP Status

The MVP implementation is nearly complete, with all core features implemented according to the [MVP Implementation Plan](current/mvp-implementation-plan.md).

## Current Development Priority

The current top development priority is:

- **Profile Note Migration** - [details](current/profile-note-migration.md)

This architectural improvement will simplify the codebase by consolidating the data model, storing Profile data as a Note like we do with landing pages.

## Post-MVP Plans

After the MVP completion and Profile Note Migration, the following features are planned:

1. Blog publishing system
2. SEO optimization
3. Content scheduling
4. Analytics integration
5. Theme customization options
6. Advanced memory management

## How to Use These Documents

When implementing new features:

1. First check if there's a planning document in the `current/` directory
2. Reference completed implementations for patterns and approaches
3. For features without a specific document, follow the architectural patterns documented in `CLAUDE.md`

When adding new planning documents, place them directly in the `planning/` directory. Once implemented, they will be moved to the appropriate category.