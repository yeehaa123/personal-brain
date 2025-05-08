# Website Identity Service Implementation Plan

## Overview

Create a new service to manage website identity information that can be used consistently across the entire website, not just the landing page. This service will generate, store, and provide access to identity information derived from the user's profile and enhanced with creative elements.

## Architecture

### 1. WebsiteIdentityService

A new service class following the Component Interface Standardization pattern:

```typescript
export class WebsiteIdentityService {
  private static instance: WebsiteIdentityService | null = null;
  
  // Standard getInstance, resetInstance, createFresh pattern
  
  // Dependencies
  private profileContext: ProfileContext;
  private identityAdapter: WebsiteIdentityNoteAdapter;
  private brainProtocol: BrainProtocol;
}
```

### 2. WebsiteIdentityData Interface

```typescript
export interface WebsiteIdentityData {
  // Personal data from profile
  personalData: {
    name: string;              // Professional's name
    email: string;             // Contact email
    company?: string;          // Company or business name
    location?: string;         // City/region
  };
  
  // Creative content (generated)
  creativeContent: {
    title: string;             // Page title (for SEO/browser tab)
    description: string;       // Meta description (for SEO)
    tagline: string;           // Short value proposition
    pitch?: string;            // Longer pitch/elevator statement
  };
  
  // Metadata
  updatedAt: Date;             // Last updated timestamp
}
```

### 3. WebsiteIdentityNoteAdapter

Following the same pattern as LandingPageNoteAdapter:
- Store identity information as a note with ID "website-identity"
- Convert between WebsiteIdentityData and Note formats
- Handle persistence with proper error handling

```typescript
export class WebsiteIdentityNoteAdapter {
  private static instance: WebsiteIdentityNoteAdapter | null = null;
  
  // Standard pattern methods
  
  // Note ID for identity data
  private readonly noteId: string = 'website-identity';
  
  // Methods
  async getIdentityData(): Promise<WebsiteIdentityData | null>;
  async saveIdentityData(data: WebsiteIdentityData): Promise<boolean>;
  convertNoteToIdentityData(note: Note): WebsiteIdentityData | null;
  convertIdentityDataToNote(data: WebsiteIdentityData): Partial<Note>;
}
```

## Implementation Plan

### Phase 1: Core Service Implementation

1. **Create WebsiteIdentityNoteAdapter**:
   - Implement persistence for identity data as a note
   - Follow the LandingPageNoteAdapter pattern for consistency
   - Use strong typing throughout

2. **Implement WebsiteIdentityService**:
   - `generateIdentity()`: Generate complete identity using profile data and AI
   - `getIdentity()`: Retrieve current identity data
   - `updateIdentity()`: Update identity data
   - `createDefaultIdentity()`: Create basic identity structure with defaults

3. **Add to WebsiteContext**:
   - Add as a direct dependency to WebsiteContextDependencies
   - Add getIdentityService() method for access

### Phase 2: Integration with Landing Page Generation

1. **Update LandingPageGenerationService**:
   - Modify to accept identity data in generateLandingPageData()
   - Use identity information instead of regenerating it
   - Update landing page fields from identity data

2. **Update WebsiteContext.generateLandingPage**:
   - Fetch identity data using the identity service
   - Pass identity to landing page generator

3. **Update WebsiteTools**:
   - Add tools for managing website identity
   - Commands: get-identity, generate-identity, update-identity

## Technical Details

### Identity Generation Logic

```typescript
async generateIdentity(): Promise<WebsiteIdentityData> {
  // Get profile data
  const profile = await this.profileContext.getProfile();
  
  if (!profile) {
    // Create default identity if no profile exists
    return this.createDefaultIdentity();
  }
  
  // Extract personal data from profile
  const personalData = {
    name: profile.fullName,
    email: profile.email || 'contact@example.com',
    company: profile.company,
    location: profile.city ? 
      [profile.city, profile.state, profile.countryName]
        .filter(Boolean)
        .join(', ') : 
      undefined
  };
  
  // Generate creative content using BrainProtocol
  const creativeContent = await this.generateCreativeContent(personalData);
  
  // Combine into identity data
  const identityData: WebsiteIdentityData = {
    personalData,
    creativeContent,
    updatedAt: new Date()
  };
  
  // Save to storage
  await this.identityAdapter.saveIdentityData(identityData);
  
  return identityData;
}

async generateCreativeContent(personalData: WebsiteIdentityData['personalData']): Promise<WebsiteIdentityData['creativeContent']> {
  const prompt = `Generate creative website identity content for a professional named ${personalData.name}${personalData.company ? ` from ${personalData.company}` : ''}.
  Include:
  1. Page title (for browser tab, SEO-optimized)
  2. Meta description (compelling summary for search engines, max 160 characters)
  3. Tagline (short phrase that captures value proposition)
  4. Pitch (optional: brief elevator statement, 1-2 sentences)
  
  Return only these fields formatted as JSON.`;
  
  const result = await this.brainProtocol.processQuery(prompt, {
    userId: 'system',
    userName: 'System'
  });
  
  if (!result.object) {
    // Fallback to default creative content
    return {
      title: `${personalData.name} - Professional Services`,
      description: `Professional services provided by ${personalData.name}${personalData.company ? ` at ${personalData.company}` : ''}.`,
      tagline: 'Expert solutions for your needs'
    };
  }
  
  // Type check and return generated content
  const generatedContent = result.object as Partial<WebsiteIdentityData['creativeContent']>;
  
  return {
    title: typeof generatedContent.title === 'string' ? generatedContent.title : `${personalData.name} - Professional Services`,
    description: typeof generatedContent.description === 'string' ? generatedContent.description : `Professional services provided by ${personalData.name}.`,
    tagline: typeof generatedContent.tagline === 'string' ? generatedContent.tagline : 'Expert solutions for your needs',
    pitch: typeof generatedContent.pitch === 'string' ? generatedContent.pitch : undefined
  };
}
```

### Integration with WebsiteContext

```typescript
export interface WebsiteContextDependencies {
  // Existing dependencies...
  
  /** WebsiteIdentityService instance */
  identityService: WebsiteIdentityService;
}

export class WebsiteContext {
  // Add to existing properties
  private identityService: WebsiteIdentityService;
  
  // Update constructor to include identity service
  constructor(
    config: WebsiteContextConfig = {},
    dependencies: WebsiteContextDependencies,
  ) {
    // Existing initialization...
    this.identityService = dependencies.identityService;
  }
  
  // Add getter method
  getIdentityService(): WebsiteIdentityService {
    return this.identityService;
  }
  
  // Update createDefaultDependencies
  private static createDefaultDependencies(): WebsiteContextDependencies {
    // Existing dependencies...
    
    // Add identity service
    const identityService = WebsiteIdentityService.getInstance();
    
    return {
      // Existing dependencies...
      identityService,
    };
  }
  
  // Update generateLandingPage
  async generateLandingPage(): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
    try {
      // Get services
      const landingPageService = this.getLandingPageGenerationService();
      const identityService = this.getIdentityService();
      
      // Get current identity or generate if needed
      let identity = await identityService.getIdentity();
      if (!identity) {
        identity = await identityService.generateIdentity();
      }
      
      // Generate landing page with identity
      const landingPageData = await landingPageService.generateLandingPageData(identity);
      
      // Rest of implementation...
    }
  }
}
```

### Integration with LandingPageGenerationService

```typescript
export class LandingPageGenerationService {
  // Update method signature
  async generateLandingPageData(identity?: WebsiteIdentityData): Promise<LandingPageData> {
    // Create basic landing page
    let landingPage = this.createBasicLandingPage();
    
    // Apply identity if provided
    if (identity) {
      landingPage.name = identity.personalData.name;
      landingPage.tagline = identity.creativeContent.tagline;
      landingPage.title = identity.creativeContent.title;
      landingPage.description = identity.creativeContent.description;
      
      // Also update the footer with contact information
      if (landingPage.footer && landingPage.footer.contactDetails) {
        landingPage.footer.contactDetails.email = identity.personalData.email;
        landingPage.footer.copyrightText = `© ${new Date().getFullYear()} ${identity.personalData.name}`;
      }
    }
    
    // Generate sections using the applied identity
    landingPage = await this.generateAllSections(landingPage);
    
    return landingPage;
  }
}
```

## Benefits

1. **Separation of Concerns**: Clear separation between personal profile data and generated creative content
2. **Consistency**: Identity information managed in one place and used consistently
3. **Persistence**: Identity stored separately and not regenerated unnecessarily
4. **Type Safety**: Strong typing throughout the implementation
5. **Pattern Consistency**: Follows established project patterns and standards
6. **Reusability**: Identity can be used by multiple website features, not just the landing page

## Testing Strategy

1. **Unit Tests**:
   - Test WebsiteIdentityNoteAdapter conversion methods
   - Test WebsiteIdentityService with mocked dependencies
   - Test integration with LandingPageGenerationService

2. **Integration Tests**:
   - Test end-to-end flow from profile to identity to landing page
   - Test persistence and retrieval

3. **Test Mocks**:
   - Create MockWebsiteIdentityService following project standards
   - Create test fixtures for identity data

## Next Steps

1. Create WebsiteIdentityData interface
2. Implement WebsiteIdentityNoteAdapter
3. Implement WebsiteIdentityService
4. Update WebsiteContext to use the service
5. Modify LandingPageGenerationService to use identity information
6. Add identity-related tools to WebsiteToolService
7. Update tests
8. Document the new features