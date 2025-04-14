# Website Integration and Generation Roadmap

## Overview

This document outlines a concrete plan to add website generation and integration capabilities to the Personal Brain project. The initial focus will be on creating a compelling landing page that showcases the brain owner, with later expansion to blog post publishing and series organization.

## Goals

- Generate a professional landing page from personal brain data
- Implement a simple publish workflow with preview capability
- Create a series organization system for related content
- Support automatic deployment to hosting platforms
- Leverage Astro as the static site generator with Content Collections for type-safe content
- Enable content scheduling with minimal complexity

## Architecture

The website generation and deployment will be implemented with two key principles:
1. Bot-controlled deployment and management
2. Caddy for web serving with automatic HTTPS

### Directory Structure

```
/opt/personal-brain/
├── src/
│   └── website/           # Source website files
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── astro.config.mjs
└── ... (rest of Personal Brain)

/opt/personal-brain-website/
├── preview/               # Preview environment
│   ├── src/
│   ├── public/
│   ├── dist/              # Built website
│   ├── package.json
│   └── astro.config.mjs
└── production/            # Production environment
    ├── src/
    ├── public/
    ├── dist/              # Built website
    ├── package.json
    └── astro.config.mjs
```

### Component Structure

```
src/commands/handlers/
└── websiteCommands.ts     # Bot commands for website management

src/mcp/contexts/website/
├── adapters/
│   └── websiteStorageAdapter.ts
├── core/
│   └── websiteContext.ts
├── formatters/
│   └── websiteFormatter.ts
├── index.ts
├── resources/
│   └── websiteResources.ts
├── services/
│   ├── websiteGenerationService.ts
│   ├── websitePublishingService.ts
│   └── websiteDeploymentService.ts
├── storage/
│   └── websiteStorage.ts
└── tools/
    └── websiteTools.ts
```

## Features by Phase

### Phase 1: Foundation and Bot-Controlled Website Deployment (3 days)

1. **Initial Infrastructure Setup** (1 day)
   - Integrate Caddy installation into GitHub Actions workflow
   - Configure preview and production environments
   - Set up directory structure for both environments
   - Configure automatic HTTPS for domains
   - Create website context and data models

2. **Bot Command Implementation** (1 day)
   - Create website build command for both environments
   - Implement preview → production promotion workflow
   - Add status command for environment monitoring
   - Ensure command interface is intuitive
   - Enable proper error handling and reporting

3. **Landing Page Generation** (1 day)
   - Create profile data extraction pipeline
   - Design landing page template with sections for:
     - Professional introduction
     - Key skills and expertise areas
     - Featured projects or content
     - Contact information
   - Implement customizable sections based on profile data
   - Add automatic social links integration

### Phase 2: Blog Publishing System (4 days) - Post-MVP

1. **Blog Publishing System** (1.5 days)
   - Create note selection and transformation pipeline into Astro content collections
   - Implement Markdown processing with full feature support
   - Set up URL structure and permalinks
   - Create template for blog post pages

2. **Series Implementation** (1.5 days)
   - Design series data model as an Astro content collection
   - Create UI for series pages
   - Implement navigation between series posts
   - Add series overview page
   - Create automatic next/previous navigation

3. **Preview Environment** (1 day)
   - Implement preview bucket deployment
   - Enable switching between preview and production deployments
   - Add preview commands for CLI and Matrix

### Phase 3: Server-Side Rendering and SEO (3 days)

1. **Server-Side Rendering Implementation** (1.5 days)
   - Upgrade Astro to SSR mode with Bun adapter
   - Create server scripts for both environments
   - Update Caddy configuration for reverse proxying
   - Implement PM2 process management
   - Add server control commands to bot

2. **SEO Optimization** (1.5 days)
   - Implement advanced SEO features:
     - Auto-generated meta tags
     - JSON-LD structured data
     - Sitemap generation
     - Open Graph and Twitter card metadata
     - Canonical URL handling
   - Create SEO report generation
   - Leverage Astro's built-in SEO capabilities

### Phase 4: Analytics and Scheduling (2 days)

1. **Analytics Integration** (1 day)
   - Implement third-party analytics connectors
   - Set up privacy-respecting analytics options
   - Create basic reporting dashboard

2. **Content Scheduling** (1 day)
   - Add scheduledPublishDate field to content model
   - Implement scheduled job to check for content to publish
   - Create commands to schedule/unschedule content
   - Add visual indicators for scheduled content

## Command Implementation

### Bot Commands

```typescript
// In src/commands/handlers/websiteCommands.ts

export class WebsiteCommandHandler extends BaseCommandHandler {
  // Website management commands
  async handleWebsiteBuild(environment: string = 'preview'): Promise<CommandResult> {
    // Build website for specified environment (preview or production)
    // Copies source files, builds them, and makes website available
  }
  
  async handleWebsitePromote(): Promise<CommandResult> {
    // Promote preview to production
    // Copies files from preview to production
  }
  
  async handleWebsiteStatus(environment: string = 'production'): Promise<CommandResult> {
    // Check status of specified environment
    // Shows build status, server status, and accessibility
  }
  
  // With SSR upgrade (Phase 3)
  async handleWebsiteServer(environment: string = 'production', action: string = 'restart'): Promise<CommandResult> {
    // Control the SSR server (restart, stop, start)
  }
  
  // Content management commands (Phase 2)
  async handleLandingPageGenerate(): Promise<CommandResult> {
    // Generate landing page from profile
  }
  
  async handleSeriesCreate(name: string, description: string): Promise<CommandResult> {
    // Create new series
  }
  
  async handleSeriesAddNote(noteId: string, seriesId: string, position?: number): Promise<CommandResult> {
    // Add note to series
  }
  
  async handleNotePublish(noteId: string, scheduledDate?: Date): Promise<CommandResult> {
    // Publish note to website, optionally with scheduled date
  }
  
  async handleNoteUnpublish(noteId: string): Promise<CommandResult> {
    // Remove note from website
  }
}
```

### Integrated Note Commands

```typescript
// In src/commands/handlers/noteCommands.ts

export class NoteCommandHandler extends BaseCommandHandler {
  // Existing note commands...
  
  async handleNotePublish(noteId: string, scheduledDate?: Date): Promise<CommandResult> {
    // Delegate to website context
    const websiteContext = WebsiteContext.getInstance();
    return websiteContext.publishNote(noteId, scheduledDate);
  }
  
  async handleNoteUnpublish(noteId: string): Promise<CommandResult> {
    // Delegate to website context
    const websiteContext = WebsiteContext.getInstance();
    return websiteContext.unpublishNote(noteId);
  }
}
```

## Implementation Details

### Astro Content Collections Integration

```typescript
// In src/mcp/contexts/website/services/astroContentService.ts

export class AstroContentService {
  private contentCollectionPath: string;
  
  constructor(astroProjectPath: string) {
    this.contentCollectionPath = path.join(astroProjectPath, 'src/content');
  }
  
  /**
   * Initialize content collection directories and schema files
   */
  async initializeContentCollections(): Promise<void> {
    // Create content collection directories
    await fs.mkdir(path.join(this.contentCollectionPath, 'posts'), { recursive: true });
    await fs.mkdir(path.join(this.contentCollectionPath, 'series'), { recursive: true });
    await fs.mkdir(path.join(this.contentCollectionPath, 'landingPage'), { recursive: true });
    
    // Create content collection schema definition file
    const schemaContent = `
import { z, defineCollection } from 'astro:content';

// Post collection schema
const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    publishDate: z.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    seriesId: z.string().optional(),
    seriesPosition: z.number().optional(),
    description: z.string(),
    isDraft: z.boolean().default(false),
  }),
});

// Series collection schema
const seriesCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    posts: z.array(z.string()).default([]),
    publishDate: z.date().optional(),
  }),
});

// Landing page content collection schema
const landingPageCollection = defineCollection({
  schema: z.object({
    name: z.string(),
    title: z.string(),
    tagline: z.string(),
    bio: z.string(),
    expertise: z.array(z.object({
      name: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    })),
    projects: z.array(z.object({
      title: z.string(),
      description: z.string(),
      link: z.string().optional(),
      image: z.string().optional(),
    })).default([]),
    social: z.record(z.string()).optional(),
    contact: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
    }).optional(),
    showContactForm: z.boolean().default(false),
  }),
  type: 'data',
});

export const collections = {
  'posts': postsCollection,
  'series': seriesCollection,
  'landingPage': landingPageCollection,
};`;

    await fs.writeFile(path.join(this.contentCollectionPath, 'config.ts'), schemaContent);
  }
  
  /**
   * Write profile data to landing page content collection
   */
  async writeLandingPageContent(profileData: LandingPageData): Promise<void> {
    const contentFilePath = path.join(
      this.contentCollectionPath, 
      'landingPage', 
      'profile.json'
    );
    
    await fs.writeFile(
      contentFilePath, 
      JSON.stringify(profileData, null, 2)
    );
  }
  
  /**
   * Write a post to the posts collection
   */
  async writePostContent(
    slug: string, 
    post: PublishedContent,
    contentDir: string = 'posts'
  ): Promise<void> {
    const contentFilePath = path.join(
      this.contentCollectionPath, 
      contentDir, 
      `${slug}.md`
    );
    
    // Create frontmatter
    const frontmatter = {
      title: post.title,
      publishDate: post.publishedAt || new Date(),
      author: post.author || 'Anonymous',
      tags: post.tags || [],
      image: post.image,
      seriesId: post.seriesId,
      seriesPosition: post.seriesPosition,
      description: post.description || '',
      isDraft: !post.published,
    };
    
    // Write post with frontmatter and content
    const fileContent = `---
${yaml.dump(frontmatter)}
---

${post.content}`;

    await fs.writeFile(contentFilePath, fileContent);
  }
  
  /**
   * Write a series to the series collection
   */
  async writeSeriesContent(series: Series): Promise<void> {
    const contentFilePath = path.join(
      this.contentCollectionPath, 
      'series', 
      `${series.slug}.json`
    );
    
    await fs.writeFile(
      contentFilePath, 
      JSON.stringify({
        title: series.title,
        description: series.description,
        image: series.image,
        posts: series.notes,
        publishDate: series.publishedAt,
      }, null, 2)
    );
  }
}
```

### Website Context

```typescript
// In src/mcp/contexts/website/core/websiteContext.ts

export class WebsiteContext extends BaseContext {
  private static instance: WebsiteContext | null = null;
  private astroContentService: AstroContentService;
  
  constructor(options?: WebsiteContextOptions) {
    super(options);
    const websiteConfig = this.storage.getWebsiteConfig();
    this.astroContentService = new AstroContentService(websiteConfig.astroProjectPath);
  }
  
  static getInstance(): WebsiteContext {
    if (!WebsiteContext.instance) {
      WebsiteContext.instance = new WebsiteContext();
    }
    return WebsiteContext.instance;
  }
  
  static resetInstance(): void {
    WebsiteContext.instance = null;
  }
  
  static createFresh(options?: WebsiteContextOptions): WebsiteContext {
    return new WebsiteContext(options);
  }
  
  // Core methods for website generation and management
  async generateLandingPage(): Promise<void> {
    // Get profile data
    const profileService = new WebsiteGenerationService();
    const landingPageData = await profileService.generateLandingPageData();
    
    // Write to Astro content collection
    await this.astroContentService.writeLandingPageContent(landingPageData);
  }
  
  async previewWebsite(): Promise<string> {
    // Generate and return preview URL
    const publishingService = new WebsitePublishingService();
    return publishingService.startPreviewServer();
  }
  
  async publishWebsite(): Promise<string> {
    // Build and deploy website
    const publishingService = new WebsitePublishingService();
    return publishingService.buildAndDeploy();
  }
  
  // Series management
  async createSeries(name: string, description: string): Promise<Series> {
    // Create series in storage
    const series = await this.storage.createSeries({ name, description });
    
    // Add to Astro content collection
    await this.astroContentService.writeSeriesContent(series);
    
    return series;
  }
  
  async addNoteToSeries(noteId: string, seriesId: string, position?: number): Promise<void> {
    // Add note to series in storage
    await this.storage.addNoteToSeries(noteId, seriesId, position);
    
    // Update series in content collection
    const series = await this.storage.getSeries(seriesId);
    await this.astroContentService.writeSeriesContent(series);
  }
  
  async listSeries(): Promise<Series[]> {
    // List all series
    return this.storage.getAllSeries();
  }
  
  // Note publishing
  async publishNote(noteId: string, scheduledDate?: Date): Promise<string> {
    // Get note data
    const noteContext = NoteContext.getInstance();
    const note = await noteContext.getNote(noteId);
    
    // Create published content entry
    const publishedContent = await this.storage.createPublishedContent({
      sourceId: noteId,
      sourceType: 'note',
      title: note.title,
      content: note.content,
      slug: this.generateSlug(note.title),
      tags: note.tags,
      published: !scheduledDate, // If scheduled, not immediately published
      scheduledPublishDate: scheduledDate,
    });
    
    // Write to Astro content collection if not scheduled
    if (!scheduledDate) {
      await this.astroContentService.writePostContent(
        publishedContent.slug,
        publishedContent
      );
    }
    
    return publishedContent.id;
  }
  
  async unpublishNote(noteId: string): Promise<void> {
    // Find published content for this note
    const publishedContent = await this.storage.getPublishedContentBySourceId(noteId);
    
    if (!publishedContent) {
      throw new Error(`No published content found for note ${noteId}`);
    }
    
    // Remove from storage
    await this.storage.deletePublishedContent(publishedContent.id);
    
    // Remove from Astro content collection
    await this.removeFromContentCollection('posts', publishedContent.slug);
  }
  
  // Scheduling
  async getScheduledContent(): Promise<PublishedContent[]> {
    // Get all content with scheduledPublishDate in the future
    return this.storage.getScheduledContent();
  }
  
  async checkScheduledContent(): Promise<void> {
    // Check for content to publish based on schedule
    const now = new Date();
    const dueContent = await this.storage.getDueScheduledContent(now);
    
    for (const content of dueContent) {
      // Update storage
      await this.storage.updatePublishedContent({
        ...content,
        published: true,
        publishedAt: now,
      });
      
      // Write to content collection
      await this.astroContentService.writePostContent(
        content.slug,
        { ...content, published: true, publishedAt: now }
      );
    }
    
    // Rebuild site if any content was published
    if (dueContent.length > 0) {
      await this.publishWebsite();
    }
  }
  
  // Helper methods
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  private async removeFromContentCollection(collection: string, slug: string): Promise<void> {
    const filePath = path.join(
      this.storage.getWebsiteConfig().astroProjectPath,
      'src/content',
      collection,
      `${slug}.md`
    );
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to remove file: ${filePath}`, error);
    }
  }
}
```

### Storage Schemas

```typescript
// In src/mcp/contexts/website/storage/websiteStorage.ts

export const WebsiteConfigSchema = z.object({
  title: z.string().default('Personal Brain'),
  description: z.string(),
  author: z.string(),
  social: z.record(z.string()).optional(),
  baseUrl: z.string().url(),
  deploymentType: z.enum(['s3']),
  deploymentConfig: z.record(z.unknown()),
  astroProjectPath: z.string(), // Path to Astro project root
  seo: z.object({
    defaultImage: z.string().optional(),
    twitterHandle: z.string().optional(),
    siteName: z.string(),
  }).optional(),
});

export const SeriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  notes: z.array(z.string()), // Note IDs in order
  published: z.boolean().default(false),
  publishedAt: z.date().optional(),
  updatedAt: z.date(),
  slug: z.string(),
  image: z.string().optional(),
});

export const PublishedContentSchema = z.object({
  id: z.string(),
  sourceId: z.string(), // ID of original note
  sourceType: z.enum(['note', 'profile', 'custom']),
  title: z.string(),
  content: z.string(),
  slug: z.string(),
  author: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).default([]),
  seriesId: z.string().optional(),
  seriesPosition: z.number().optional(),
  published: z.boolean().default(false),
  publishedAt: z.date().optional(),
  scheduledPublishDate: z.date().optional(), // Added for scheduling
  seo: z.object({
    description: z.string().optional(),
    image: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});
```

### Integration with Profile Data

```typescript
// In src/mcp/contexts/website/services/websiteGenerationService.ts

export class WebsiteGenerationService {
  private profileContext: ProfileContext;
  
  constructor() {
    this.profileContext = ProfileContext.getInstance();
  }
  
  async generateLandingPageData(): Promise<LandingPageData> {
    // Get active profile
    const profile = await this.profileContext.getActiveProfile();
    
    // Extract expertise from profile skills/expertise data
    const expertise = (profile.expertise || []).map(exp => ({
      name: exp.name || exp,
      description: exp.description || '',
      icon: exp.icon || '',
    }));
    
    // Extract projects
    const projects = (profile.projects || []).map(proj => ({
      title: proj.title || proj.name || proj,
      description: proj.description || '',
      link: proj.link || proj.url || '',
      image: proj.image || '',
    }));
    
    // Create Astro-compatible data structure
    return {
      name: profile.name,
      title: `${profile.name} - ${profile.title || profile.tagline || 'Personal Website'}`,
      tagline: profile.tagline || profile.bio?.substring(0, 100) || '',
      bio: profile.bio || '',
      expertise,
      projects,
      social: profile.social || {},
      contact: {
        email: profile.contact?.email || profile.email || '',
        phone: profile.contact?.phone || profile.phone || '',
        location: profile.contact?.location || profile.location || '',
      },
      showContactForm: Boolean(profile.contact?.showContactForm),
    };
  }
}
```

## Testing Strategy

The website integration will follow the project's comprehensive testing approach, with tests integrated throughout development:

### 1. Unit Tests (Integrated with each phase)

Each component will have dedicated unit tests focusing on:

```typescript
// Example unit tests for AstroContentService
describe('AstroContentService', () => {
  let contentService: AstroContentService;
  const testProjectPath = path.join(os.tmpdir(), 'astro-test-project');
  
  beforeEach(async () => {
    // Create temp directory for test
    await fs.mkdir(testProjectPath, { recursive: true });
    contentService = new AstroContentService(testProjectPath);
  });
  
  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });
  
  test('should initialize content collections with correct schema', async () => {
    await contentService.initializeContentCollections();
    
    // Check if config file exists
    const configPath = path.join(testProjectPath, 'src/content/config.ts');
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    
    expect(configExists).toBe(true);
    
    // Check if directories exist
    const postsExists = await fs.access(path.join(testProjectPath, 'src/content/posts')).then(() => true).catch(() => false);
    const seriesExists = await fs.access(path.join(testProjectPath, 'src/content/series')).then(() => true).catch(() => false);
    const landingPageExists = await fs.access(path.join(testProjectPath, 'src/content/landingPage')).then(() => true).catch(() => false);
    
    expect(postsExists).toBe(true);
    expect(seriesExists).toBe(true);
    expect(landingPageExists).toBe(true);
  });
  
  test('should write landing page data to correct format', async () => {
    // Setup
    await contentService.initializeContentCollections();
    
    // Test data
    const landingPageData = {
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer & AI Enthusiast',
      bio: 'This is a test bio',
      expertise: [{ name: 'Web Development', description: 'Frontend and backend development' }],
      projects: [],
      social: { twitter: '@testuser' },
      contact: { email: 'test@example.com' },
      showContactForm: false,
    };
    
    // Write landing page data
    await contentService.writeLandingPageContent(landingPageData);
    
    // Check if file exists and contains correct data
    const filePath = path.join(testProjectPath, 'src/content/landingPage/profile.json');
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    
    expect(fileExists).toBe(true);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsedContent = JSON.parse(fileContent);
    
    expect(parsedContent.name).toBe('Test User');
    expect(parsedContent.tagline).toBe('Web Developer & AI Enthusiast');
    expect(parsedContent.expertise[0].name).toBe('Web Development');
  });
  
  // More tests...
});

// Example unit tests for WebsiteContext
describe('WebsiteContext', () => {
  beforeEach(() => {
    WebsiteContext.resetInstance();
    MockNoteContext.resetInstance();
    MockProfileContext.resetInstance();
    MockAstroContentService.resetInstance();
  });
  
  test('should generate landing page from profile data', async () => {
    // Setup mocks
    const mockProfile = {
      name: 'Test User',
      bio: 'This is a test bio',
      // ...other profile data
    };
    
    MockProfileContext.getInstance().getActiveProfile.mockResolvedValue(mockProfile);
    const mockAstroContentService = MockAstroContentService.getInstance();
    
    // Create context with mock services
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });
    
    // Generate landing page
    await context.generateLandingPage();
    
    // Verify content was written
    expect(mockAstroContentService.writeLandingPageContent).toHaveBeenCalled();
    const data = mockAstroContentService.writeLandingPageContent.mock.calls[0][0];
    
    // Assertions
    expect(data.name).toBe(mockProfile.name);
    expect(data.bio).toBe(mockProfile.bio);
  });
  
  // More tests...
});
```

### 2. Integration Tests

Focus on cross-component interactions:

```typescript
describe('WebsiteCommandHandler Integration', () => {
  let commandHandler: WebsiteCommandHandler;
  let websiteContext: WebsiteContext;
  
  beforeEach(() => {
    // Setup test environment with mocks
    WebsiteContext.resetInstance();
    websiteContext = WebsiteContext.getInstance();
    commandHandler = new WebsiteCommandHandler();
  });
  
  test('should publish note through command handler', async () => {
    // Test full publication flow from command to storage and Astro content
  });
  
  test('should preview website and return accessible URL', async () => {
    // Test preview generation and server
  });
});

describe('Astro Build Integration', () => {
  test('should build a valid Astro site with content collections', async () => {
    // Test the full build process
  });
});
```

### 3. End-to-End Tests

Validate complete workflows:

```typescript
describe('Website E2E Tests', () => {
  test('should generate landing page from profile and preview it', async () => {
    // Test full landing page generation flow
  });
  
  test('should publish note, add to series, and verify in content collection', async () => {
    // Test complete publishing workflow
  });
});
```

### 4. Test Mocks

Following the project's Component Interface Standardization pattern:

```typescript
// In tests/__mocks__/contexts/website/astroContentService.ts
export class MockAstroContentService implements AstroContentServiceInterface {
  private static instance: MockAstroContentService | null = null;
  
  // Mock functions
  public initializeContentCollections = jest.fn().mockResolvedValue(undefined);
  public writeLandingPageContent = jest.fn().mockResolvedValue(undefined);
  public writePostContent = jest.fn().mockResolvedValue(undefined);
  public writeSeriesContent = jest.fn().mockResolvedValue(undefined);
  
  static getInstance(): MockAstroContentService {
    if (!MockAstroContentService.instance) {
      MockAstroContentService.instance = new MockAstroContentService();
    }
    return MockAstroContentService.instance;
  }
  
  static resetInstance(): void {
    if (MockAstroContentService.instance) {
      MockAstroContentService.instance.initializeContentCollections.mockClear();
      MockAstroContentService.instance.writeLandingPageContent.mockClear();
      MockAstroContentService.instance.writePostContent.mockClear();
      MockAstroContentService.instance.writeSeriesContent.mockClear();
    }
    MockAstroContentService.instance = null;
  }
  
  static createFresh(): MockAstroContentService {
    return new MockAstroContentService();
  }
}
```

## Timeline

- **Total Estimated Time**: 12 days
- **Phase 1 (Foundation and Landing Page)**: 3 days
- **Phase 2 (Content Publishing and Series)**: 4 days
- **Phase 3 (Deployment and SEO)**: 3 days
- **Phase 4 (Analytics and Scheduling)**: 2 days

## Success Criteria

1. **MVP (Phase 1):**
   - Bot successfully manages website building and promotion
   - Preview and production environments function correctly
   - Caddy provides automatic HTTPS for both environments
   - Simple commands available for full website lifecycle
   - Landing page generation works from profile data

2. **Full Implementation:**
   - Notes can be published individually or as part of a series
   - Series can be created and managed with ordered content
   - Content can be scheduled for future publication
   - Server-side rendering works for dynamic content
   - SEO features are implemented and optimized
   - Analytics integration provides basic visibility
   - Comprehensive test coverage ensures reliability and maintainability

## Future Enhancements

1. **Theme Customization**
   - User-configurable themes
   - Custom CSS injection
   - Template selection

2. **Advanced Content Scheduling**
   - Calendar-based publishing
   - Recurring schedules
   - Publishing workflows

3. **Interactive Components**
   - Web components for interactive demos
   - CodePen/JSFiddle-like embedded examples