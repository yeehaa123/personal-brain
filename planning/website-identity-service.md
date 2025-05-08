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
    occupation?: string;       // Professional title
    industry?: string;         // Industry or field
    yearsExperience?: number;  // Years of professional experience
  };
  
  // Creative content (generated)
  creativeContent: {
    title: string;             // Page title (for SEO/browser tab)
    description: string;       // Meta description (for SEO)
    tagline: string;           // Short value proposition
    pitch?: string;            // Longer elevator statement (1-2 sentences)
    uniqueValue?: string;      // What sets this professional apart
    keyAchievements?: string[];// Notable professional achievements
  };
  
  // Brand identity (for consistent content generation)
  brandIdentity: {
    // Voice and tone settings
    tone: {
      formality: 'casual' | 'conversational' | 'professional' | 'academic'; // Level of formality
      personality: string[];   // Personality traits (e.g., "friendly", "authoritative", "innovative")
      emotion: string;         // Emotional quality (e.g., "inspiring", "reassuring", "exciting")
    };
    
    // Writing style guidance
    contentStyle: {
      writingStyle: string;    // Description of writing approach (e.g., "Clear and concise with technical accuracy")
      sentenceLength: 'short' | 'medium' | 'varied' | 'long'; // Preferred sentence structure
      vocabLevel: 'simple' | 'moderate' | 'advanced' | 'technical'; // Vocabulary complexity
      useJargon: boolean;      // Whether industry jargon is appropriate
      useHumor: boolean;       // Whether humor should be incorporated
      useStories: boolean;     // Whether to use storytelling approaches
    };
    
    // Brand values and audience
    values: {
      coreValues: string[];    // Core principles and values (e.g., "innovation", "reliability")
      targetAudience: string[];// Primary audience segments
      painPoints: string[];    // Problems the professional solves
      desiredAction: string;   // What visitors should do (e.g., "Schedule a consultation")
    };
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
    occupation: profile.occupation,
    industry: profile.industry,
    yearsExperience: profile.yearsExperience ? parseInt(profile.yearsExperience) : undefined,
    location: profile.city ? 
      [profile.city, profile.state, profile.countryName]
        .filter(Boolean)
        .join(', ') : 
      undefined
  };
  
  // Generate creative content using BrainProtocol
  const creativeContent = await this.generateCreativeContent(personalData);
  
  // Generate brand identity using BrainProtocol
  const brandIdentity = await this.generateBrandIdentity(personalData, creativeContent);
  
  // Combine into identity data
  const identityData: WebsiteIdentityData = {
    personalData,
    creativeContent,
    brandIdentity,
    updatedAt: new Date()
  };
  
  // Save to storage
  await this.identityAdapter.saveIdentityData(identityData);
  
  return identityData;
}

async generateCreativeContent(personalData: WebsiteIdentityData['personalData']): Promise<WebsiteIdentityData['creativeContent']> {
  const prompt = `Generate creative website identity content for a professional named ${personalData.name}${personalData.company ? ` from ${personalData.company}` : ''}${personalData.occupation ? ` who is a ${personalData.occupation}` : ''}.
  
  Include:
  1. Page title (for browser tab, SEO-optimized)
  2. Meta description (compelling summary for search engines, max 160 characters)
  3. Tagline (short phrase that captures value proposition)
  4. Pitch (brief elevator statement, 1-2 sentences)
  5. uniqueValue (what sets this professional apart)
  6. keyAchievements (array of 2-3 notable professional achievements)
  
  Return only these fields formatted as JSON.`;
  
  const result = await this.brainProtocol.processQuery(prompt, {
    userId: 'system',
    userName: 'System'
  });
  
  if (!result.object) {
    // Fallback to default creative content
    return {
      title: `${personalData.name} - ${personalData.occupation || 'Professional Services'}`,
      description: `Professional services provided by ${personalData.name}${personalData.company ? ` at ${personalData.company}` : ''}.`,
      tagline: 'Expert solutions for your needs',
      keyAchievements: []
    };
  }
  
  // Type check and return generated content
  const generatedContent = result.object as Partial<WebsiteIdentityData['creativeContent']>;
  
  return {
    title: typeof generatedContent.title === 'string' ? generatedContent.title : `${personalData.name} - ${personalData.occupation || 'Professional Services'}`,
    description: typeof generatedContent.description === 'string' ? generatedContent.description : `Professional services provided by ${personalData.name}.`,
    tagline: typeof generatedContent.tagline === 'string' ? generatedContent.tagline : 'Expert solutions for your needs',
    pitch: typeof generatedContent.pitch === 'string' ? generatedContent.pitch : undefined,
    uniqueValue: typeof generatedContent.uniqueValue === 'string' ? generatedContent.uniqueValue : undefined,
    keyAchievements: Array.isArray(generatedContent.keyAchievements) ? generatedContent.keyAchievements : []
  };
}

async generateBrandIdentity(
  personalData: WebsiteIdentityData['personalData'],
  creativeContent: WebsiteIdentityData['creativeContent']
): Promise<WebsiteIdentityData['brandIdentity']> {
  const prompt = `Generate brand identity information for a professional website for ${personalData.name}${personalData.occupation ? `, a ${personalData.occupation}` : ''}.
  
  Their tagline is: "${creativeContent.tagline}"
  ${creativeContent.pitch ? `Their pitch is: "${creativeContent.pitch}"` : ''}
  ${creativeContent.uniqueValue ? `Their unique value is: "${creativeContent.uniqueValue}"` : ''}
  
  Create a comprehensive brand identity with:
  
  1. Tone:
     - formality: Choose one of: "casual", "conversational", "professional", or "academic"
     - personality: Array of 3-5 personality traits (e.g., "friendly", "authoritative", "innovative")
     - emotion: The primary emotional quality of the content (e.g., "inspiring", "reassuring")
  
  2. Content Style:
     - writingStyle: Description of the ideal writing approach
     - sentenceLength: Choose one of: "short", "medium", "varied", or "long"
     - vocabLevel: Choose one of: "simple", "moderate", "advanced", or "technical"
     - useJargon: Boolean - whether industry terminology is appropriate
     - useHumor: Boolean - whether humor should be incorporated
     - useStories: Boolean - whether to use storytelling approaches
  
  3. Values:
     - coreValues: Array of 3-5 principles or values that define the brand
     - targetAudience: Array of 2-3 primary audience segments
     - painPoints: Array of 2-4 problems this professional solves
     - desiredAction: What website visitors should do (e.g., "Schedule a consultation")
  
  Format as JSON with these exact fields.`;
  
  const result = await this.brainProtocol.processQuery(prompt, {
    userId: 'system',
    userName: 'System'
  });
  
  if (!result.object) {
    // Fallback to default brand identity
    return this.createDefaultBrandIdentity(personalData);
  }
  
  const generatedIdentity = result.object as Partial<WebsiteIdentityData['brandIdentity']>;
  
  // Build full brand identity with fallbacks for missing fields
  const defaultIdentity = this.createDefaultBrandIdentity(personalData);
  
  // Check for required nested objects
  const tone = generatedIdentity.tone || defaultIdentity.tone;
  const contentStyle = generatedIdentity.contentStyle || defaultIdentity.contentStyle;
  const values = generatedIdentity.values || defaultIdentity.values;
  
  return {
    tone: {
      formality: tone.formality || defaultIdentity.tone.formality,
      personality: Array.isArray(tone.personality) ? tone.personality : defaultIdentity.tone.personality,
      emotion: tone.emotion || defaultIdentity.tone.emotion
    },
    contentStyle: {
      writingStyle: contentStyle.writingStyle || defaultIdentity.contentStyle.writingStyle,
      sentenceLength: contentStyle.sentenceLength || defaultIdentity.contentStyle.sentenceLength,
      vocabLevel: contentStyle.vocabLevel || defaultIdentity.contentStyle.vocabLevel,
      useJargon: typeof contentStyle.useJargon === 'boolean' ? contentStyle.useJargon : defaultIdentity.contentStyle.useJargon,
      useHumor: typeof contentStyle.useHumor === 'boolean' ? contentStyle.useHumor : defaultIdentity.contentStyle.useHumor,
      useStories: typeof contentStyle.useStories === 'boolean' ? contentStyle.useStories : defaultIdentity.contentStyle.useStories
    },
    values: {
      coreValues: Array.isArray(values.coreValues) ? values.coreValues : defaultIdentity.values.coreValues,
      targetAudience: Array.isArray(values.targetAudience) ? values.targetAudience : defaultIdentity.values.targetAudience,
      painPoints: Array.isArray(values.painPoints) ? values.painPoints : defaultIdentity.values.painPoints,
      desiredAction: values.desiredAction || defaultIdentity.values.desiredAction
    }
  };
}

/**
 * Create default brand identity when generation fails
 */
private createDefaultBrandIdentity(personalData: WebsiteIdentityData['personalData']): WebsiteIdentityData['brandIdentity'] {
  return {
    tone: {
      formality: 'professional',
      personality: ['knowledgeable', 'trustworthy', 'helpful'],
      emotion: 'confident'
    },
    contentStyle: {
      writingStyle: 'Clear and straightforward with a focus on expertise',
      sentenceLength: 'varied',
      vocabLevel: 'moderate',
      useJargon: false,
      useHumor: false,
      useStories: true
    },
    values: {
      coreValues: ['expertise', 'quality', 'integrity'],
      targetAudience: ['professionals', 'businesses'],
      painPoints: ['lack of expertise', 'need for specialized knowledge'],
      desiredAction: 'Contact for professional services'
    }
  };
}

/**
 * Create default identity when no profile exists
 */
private createDefaultIdentity(): WebsiteIdentityData {
  const defaultPersonalData = {
    name: 'Professional Expert',
    email: 'contact@example.com'
  };
  
  return {
    personalData: defaultPersonalData,
    creativeContent: {
      title: 'Professional Services',
      description: 'Expert professional services tailored to your needs',
      tagline: 'Expert solutions for your needs',
      keyAchievements: []
    },
    brandIdentity: this.createDefaultBrandIdentity(defaultPersonalData),
    updatedAt: new Date()
  };
}
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
      // Apply core identity fields
      landingPage.name = identity.personalData.name;
      landingPage.tagline = identity.creativeContent.tagline;
      landingPage.title = identity.creativeContent.title;
      landingPage.description = identity.creativeContent.description;
      
      // Update the footer with contact information
      if (landingPage.footer && landingPage.footer.contactDetails) {
        landingPage.footer.contactDetails.email = identity.personalData.email;
        landingPage.footer.copyrightText = `© ${new Date().getFullYear()} ${identity.personalData.name}`;
      }
      
      // Customize hero section based on identity
      if (landingPage.hero) {
        landingPage.hero.headline = identity.creativeContent.tagline;
        landingPage.hero.subheading = identity.creativeContent.pitch || '';
      }
      
      // Customize about section
      if (landingPage.about) {
        // Build about content from unique value and achievements
        let aboutContent = '';
        
        if (identity.personalData.occupation) {
          aboutContent += `${identity.personalData.name} is a ${identity.personalData.occupation}`;
          if (identity.personalData.yearsExperience) {
            aboutContent += ` with ${identity.personalData.yearsExperience} years of experience`;
          }
          aboutContent += '. ';
        }
        
        if (identity.creativeContent.uniqueValue) {
          aboutContent += identity.creativeContent.uniqueValue + ' ';
        }
        
        if (identity.creativeContent.keyAchievements && identity.creativeContent.keyAchievements.length > 0) {
          aboutContent += 'Key achievements include: ';
          aboutContent += identity.creativeContent.keyAchievements.join(', ') + '.';
        }
        
        landingPage.about.content = aboutContent.trim();
      }
    }
    
    // Pass identity to generateAllSections for use in section generation
    landingPage = await this.generateAllSections(landingPage, identity);
    
    return landingPage;
  }
  
  /**
   * Generate all sections with access to identity
   * @param landingPage The base landing page
   * @param identity Optional website identity data
   */
  private async generateAllSections(
    landingPage: LandingPageData, 
    identity?: WebsiteIdentityData
  ): Promise<LandingPageData> {
    // Updated to pass identity information to section generation
    const updatedLandingPage = { ...landingPage };
    
    // Generate identity information first if not provided
    if (!identity) {
      await this.generateIdentityInfo(updatedLandingPage);
    }
    
    // Generate each section one by one, now with identity information
    for (const sectionType of updatedLandingPage.sectionOrder) {
      if (this.sectionSchemas[sectionType as keyof typeof this.sectionSchemas]) {
        await this.generateSectionContent(updatedLandingPage, sectionType, identity);
      }
    }
    
    return updatedLandingPage;
  }
  
  /**
   * Generate content for a specific section with identity information
   * @param landingPage Landing page to update
   * @param sectionType Type of section to generate
   * @param identity Optional website identity data
   */
  private async generateSectionContent(
    landingPage: LandingPageData, 
    sectionType: string, 
    identity?: WebsiteIdentityData
  ): Promise<void> {
    // Get the prompt template for this section
    const promptTemplate = this.sectionPrompts[sectionType];
    
    // Enhanced prompt with identity information when available
    let prompt = promptTemplate
      .replace(/\{\{name\}\}/g, landingPage.name)
      .replace(/\{\{tagline\}\}/g, landingPage.tagline);
    
    // Enhance prompt with brand identity information if available
    if (identity && identity.brandIdentity) {
      prompt += `\n\nUse the following brand identity guidelines:\n`;
      
      // Add tone guidance
      prompt += `\nTone: ${identity.brandIdentity.tone.formality} formality with a ${identity.brandIdentity.tone.emotion} quality. `;
      prompt += `Personality traits: ${identity.brandIdentity.tone.personality.join(', ')}.`;
      
      // Add writing style guidance
      prompt += `\nWriting style: ${identity.brandIdentity.contentStyle.writingStyle}.`;
      prompt += ` Use ${identity.brandIdentity.contentStyle.sentenceLength} sentences with ${identity.brandIdentity.contentStyle.vocabLevel} vocabulary.`;
      
      // Add value guidance
      prompt += `\nCore values: ${identity.brandIdentity.values.coreValues.join(', ')}.`;
      prompt += `\nTarget audience: ${identity.brandIdentity.values.targetAudience.join(', ')}.`;
      prompt += `\nPain points to address: ${identity.brandIdentity.values.painPoints.join(', ')}.`;
      prompt += `\nDesired action: ${identity.brandIdentity.values.desiredAction}.`;
    }
    
    // Generate section content with enhanced prompt
    // Rest of implementation...
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