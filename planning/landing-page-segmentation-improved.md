# Improved Landing Page Segmentation with Section-Level Quality Assessment (CORE IMPLEMENTATION)

## Core Concept
Transform the landing page generation by making all sections required in the data model but controllable via section-level `enabled` flags. Implement a two-phase editorial process that first improves content quality, then evaluates quality and confidence metrics to determine which sections to include in the final output.

## Current Implementation Issues

The current segmented approach has several pain points:

1. **Excessive Type Complexity**: Dealing with optional fields creates verbose type handling
2. **Duplicated Logic**: Each segment generator contains similar boilerplate code
3. **Unclear Quality Control**: No systematic way to determine which sections should be included
4. **Difficult Testing**: Optional fields make test scenarios more complex
5. **All-or-Nothing Sections**: No granular control over which sections to include

## Enhanced Architecture

### 1. Section-Level Required Fields with Enabled Flag

Make all sections required in the schema with section-level enablement flags:

```typescript
// BEFORE: Optional fields approach at segment level
export const CredibilitySegmentSchema = z.object({
  caseStudies: CaseStudiesSectionSchema.optional(), // Problematic
  // Other optional sections...
});

// AFTER: Required fields with section-level enabled flag
export const CredibilitySegmentSchema = z.object({
  // Segment metadata
  segmentType: z.literal('credibility'),
  version: z.number().default(1),
  generatedAt: z.string().default(() => new Date().toISOString()),
  
  // Required sections with individual enabled flags
  caseStudies: z.object({
    title: z.string().default('Case Studies'),
    items: z.array(CaseStudyItemSchema),
    enabled: z.boolean().default(true),
    // Quality assessment fields (added during review)
    quality: SectionQualityAssessmentSchema.optional(),
  }),
  
  expertise: z.object({
    title: z.string().default('Expertise'),
    items: z.array(ExpertiseItemSchema),
    enabled: z.boolean().default(true),
    // Quality assessment fields (added during review)
    quality: SectionQualityAssessmentSchema.optional(),
  }),
  
  // Other required sections...
});
```

### 2. Quality and Confidence Assessment

Each section will have both quality and confidence scores:

```typescript
const SectionQualityAssessmentSchema = z.object({
  // How good the content is (clarity, relevance, persuasiveness)
  qualityScore: z.number().min(1).max(10),
  qualityJustification: z.string(),
  
  // How confident the AI is about the content's appropriateness
  confidenceScore: z.number().min(1).max(10),
  confidenceJustification: z.string(),
  
  // Combined score (formula can be adjusted)
  combinedScore: z.number().min(1).max(10),
  
  // Suggested improvements (from first review phase)
  suggestedImprovements: z.string().optional(),
});
```

### 3. Two-Phase Editorial Process

#### Phase 1: Content Improvement
First review and improve each section's content:

```typescript
async improveContent(segments: SegmentStore): Promise<SegmentStore> {
  try {
    // Create an improvement prompt for each segment
    const improvementPrompt = `
      You are a professional content editor improving website content.
      
      For each section below:
      1. Identify areas that can be improved (clarity, persuasiveness, specificity)
      2. Suggest specific edits to enhance the content
      3. Provide an improved version of the content
      
      CONTENT TO IMPROVE:
      ${JSON.stringify(segments, null, 2)}
    `;
    
    // Process improvements
    const result = await this.brainProtocol.processQuery(improvementPrompt, {
      userId: 'system',
      userName: 'System',
      schema: ContentImprovementSchema,
    });
    
    // Extract improved segments
    const improvedSegments = result.object?.segments || segments;
    
    // Update cache with improved segments
    for (const segmentType in improvedSegments) {
      this.segmentCache.saveSegment(segmentType, improvedSegments[segmentType]);
    }
    
    this.segmentGenerationStatus.improved = true;
    return improvedSegments;
  } catch (error) {
    this.logger.error('Error during content improvement', {
      error: error instanceof Error ? error.message : String(error),
      context: 'LandingPageGenerationService',
    });
    return segments; // Return original segments if improvement fails
  }
}
```

#### Phase 2: Quality Assessment and Section Enablement
After improvement, assess quality, confidence, and determine which sections to enable:

```typescript
async reviewAndEnableSections(segments: SegmentStore): Promise<SegmentStore> {
  try {
    // Create quality assessment prompt
    const assessmentPrompt = `
      You are a professional website content evaluator.
      
      For each section, evaluate:
      
      QUALITY (1-10):
      - How well-written is the content?
      - How persuasive and compelling is it?
      - How relevant is it to the target audience?
      
      CONFIDENCE (1-10):
      - How certain are you that this content is appropriate?
      - How well does it align with the brand identity?
      - How consistent is it with best practices?
      
      For each section, provide:
      1. Quality score (1-10) with justification
      2. Confidence score (1-10) with justification
      3. Combined score (average of quality and confidence)
      4. Enable/disable recommendation (enable if combined score ≥ 7)
      
      Required sections (must be enabled regardless of score):
      - Hero section
      - Services section
      
      CONTENT TO EVALUATE:
      ${JSON.stringify(segments, null, 2)}
    `;
    
    // Process assessment
    const result = await this.brainProtocol.processQuery(assessmentPrompt, {
      userId: 'system',
      userName: 'System',
      schema: QualityAssessmentSchema,
    });
    
    // Extract assessed segments with enable/disable decisions
    const assessedSegments = result.object?.segments || segments;
    
    // Force enable required sections
    this.enforceRequiredSections(assessedSegments);
    
    // Update cache with assessed segments
    for (const segmentType in assessedSegments) {
      this.segmentCache.saveSegment(segmentType, assessedSegments[segmentType]);
    }
    
    this.segmentGenerationStatus.assessed = true;
    return assessedSegments;
  } catch (error) {
    this.logger.error('Error during quality assessment', {
      error: error instanceof Error ? error.message : String(error),
      context: 'LandingPageGenerationService',
    });
    return segments; // Return original segments if assessment fails
  }
}

// Ensure required sections are always enabled
private enforceRequiredSections(segments: SegmentStore): void {
  // Hero section is always required
  if (segments.identity?.hero) {
    segments.identity.hero.enabled = true;
  }
  
  // Services section is always required
  if (segments.serviceOffering?.services) {
    segments.serviceOffering.services.enabled = true;
  }
  
  // Other required sections can be added here
}
```

### 4. Unified Segment Generation

Create a generic segment generator to eliminate code duplication:

```typescript
async generateSegment<T>(
  type: SegmentType, 
  prompt: string, 
  schema: z.ZodType<T>
): Promise<T> {
  try {
    // Check cache first
    if (this.segmentCache.hasSegment(type)) {
      const cached = this.segmentCache.getSegment(type);
      if (cached) {
        this.segmentGenerationStatus[type] = true;
        return cached as T;
      }
    }
    
    // Generate content
    const result = await this.brainProtocol.processQuery(prompt, {
      userId: 'system',
      userName: 'System',
      schema: schema,
    });
    
    // Parse through Zod to validate and apply defaults
    const segment = schema.parse({
      ...result.object,
      segmentType: type,
      version: 1,
      generatedAt: new Date().toISOString(),
    });
    
    // Store in cache and update status
    this.segmentCache.saveSegment(type, segment);
    this.segmentGenerationStatus[type] = true;
    
    return segment;
  } catch (error) {
    this.logger.error(`Error generating ${type} segment`, {
      error: error instanceof Error ? error.message : String(error),
      context: 'LandingPageGenerationService',
    });
    throw error;
  }
}
```

### 5. Final Landing Page Assembly

Include only enabled sections and respect their priority in the final landing page:

```typescript
combineLandingPage(segments: SegmentStore): LandingPageData {
  // Start with base properties
  const landingPage: LandingPageData = {
    title: segments.identity.title,
    description: segments.identity.description,
    name: segments.identity.name,
    tagline: segments.identity.tagline,
    sectionOrder: [],
  };
  
  // Add sections based on their enabled status (independent for each section)
  
  // Hero is always included (required section)
  landingPage.hero = segments.identity.hero;
  landingPage.sectionOrder.push('hero');
  
  // Add other sections only if they're enabled
  if (segments.identity.problemStatement.enabled) {
    landingPage.problemStatement = segments.identity.problemStatement;
    landingPage.sectionOrder.push('problemStatement');
  }
  
  // Services is always included (required section)
  landingPage.services = segments.serviceOffering.services;
  landingPage.sectionOrder.push('services');
  
  // Add process if enabled
  if (segments.serviceOffering.process.enabled) {
    landingPage.process = segments.serviceOffering.process;
    landingPage.sectionOrder.push('process');
  }
  
  // Continue for all other sections...
  
  return landingPage;
}
```

## Complete Generation Flow

```typescript
async generateLandingPageData(
  options?: {
    regenerateSegments?: boolean;
    segmentsToGenerate?: SegmentType[];
    skipImprovement?: boolean;
    skipQualityAssessment?: boolean;
  },
  overrides?: Partial<LandingPageData>
): Promise<LandingPageData> {
  try {
    // Get profile data
    const profile = await this.getProfileData();
    if (!profile) throw new Error('No profile found');
    
    // Reset if regenerating
    if (options?.regenerateSegments) {
      this.resetGenerationStatus();
      this.segmentCache.clearAllSegments();
    }
    
    const segmentsToGenerate = options?.segmentsToGenerate || [
      'identity', 'serviceOffering', 'credibility', 'conversion'
    ];
    
    // Generate all segments
    const segments: SegmentStore = {};
    
    // Generate each segment
    if (segmentsToGenerate.includes('identity')) {
      segments.identity = await this.generateSegment(
        'identity', identitySegmentPrompt, IdentitySegmentSchema
      );
    } else if (this.segmentCache.hasSegment('identity')) {
      segments.identity = this.segmentCache.getSegment('identity');
    }
    
    // Generate other segments similarly...
    
    // PHASE 1: Content Improvement (unless skipped)
    let improvedSegments = segments;
    if (!options?.skipImprovement) {
      improvedSegments = await this.improveContent(segments);
    }
    
    // PHASE 2: Quality Assessment and Section Enablement (unless skipped)
    let assessedSegments = improvedSegments;
    if (!options?.skipQualityAssessment) {
      assessedSegments = await this.reviewAndEnableSections(improvedSegments);
    }
    
    // Combine segments, respecting enabled flags
    let landingPage = this.combineLandingPage(assessedSegments);
    
    // Apply any overrides
    if (overrides) {
      landingPage = { ...landingPage, ...overrides };
    }
    
    return landingPage;
  } catch (error) {
    this.logger.error('Error generating landing page data', {
      error: error instanceof Error ? error.message : String(error),
      context: 'LandingPageGenerationService',
    });
    throw error;
  }
}
```

## Quality Metrics

Track and expose quality metrics for analytics and reporting:

```typescript
getQualityMetrics(): SectionQualityMetrics {
  const metrics: SectionQualityMetrics = {};
  
  // Extract quality scores from all segments in cache
  const segments = this.segmentCache.getAllSegments();
  
  // Identity segment sections
  if (segments.identity) {
    if (segments.identity.hero.quality) {
      metrics.hero = {
        quality: segments.identity.hero.quality.qualityScore,
        confidence: segments.identity.hero.quality.confidenceScore,
        combined: segments.identity.hero.quality.combinedScore,
        enabled: segments.identity.hero.enabled,
      };
    }
    
    if (segments.identity.problemStatement.quality) {
      metrics.problemStatement = {
        quality: segments.identity.problemStatement.quality.qualityScore,
        confidence: segments.identity.problemStatement.quality.confidenceScore,
        combined: segments.identity.problemStatement.quality.combinedScore,
        enabled: segments.identity.problemStatement.enabled,
      };
    }
  }
  
  // Continue for other sections...
  
  return metrics;
}
```

## Implementation Plan

### Phase 1: Schema Updates

1. Revise segment schemas to make all sections required with section-level enabled flags
2. Update types to reflect the new approach
3. Add quality assessment and confidence schemas for each section

### Phase 2: Two-Phase Editorial Process

1. Implement the content improvement phase
2. Implement the quality assessment phase with combined quality/confidence scoring
3. Add required section enforcement logic

### Phase 3: Generation and Assembly

1. Implement the generic segment generator method
2. Add segment-based caching
3. Update the landing page assembly to respect section-level enabled flags

### Phase 4: Testing and Analytics

1. Update tests to verify the two-phase editorial process
2. Add quality metrics reporting
3. Implement analytics for tracking section quality over time

## Benefits

1. **Section-Level Control**: Fine-grained control over which sections are included
2. **Quality-Driven Content**: Only high-quality sections appear in the final page
3. **Content Improvement**: First phase focuses on enhancing content before assessment
4. **Dual Metrics**: Both quality and confidence scores provide nuanced evaluation
5. **Required Sections**: Core sections are always included regardless of quality
6. **Simplified Testing**: Consistent structure with predictable behavior
7. **Quality Analytics**: Track and report on content quality metrics

## Usage Example

```typescript
// Usage in WebsiteContext
async generateLandingPage(options?: {
  regenerateSegments?: boolean;
  segmentsToGenerate?: SegmentType[];
  skipImprovement?: boolean;
  skipQualityAssessment?: boolean;
}): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
  try {
    const landingPageService = this.getLandingPageGenerationService();
    
    // Generate landing page with two-phase editorial process
    const landingPageData = await landingPageService.generateLandingPageData(options);
    
    // Get quality metrics for reporting
    const qualityMetrics = landingPageService.getQualityMetrics();
    
    // Build success message with quality insights
    let successMessage = 'Successfully generated landing page';
    
    // Add quality metrics to message
    if (qualityMetrics) {
      const highQualitySections = Object.entries(qualityMetrics)
        .filter(([_, metrics]) => metrics.combined >= 8)
        .map(([section]) => section);
      
      if (highQualitySections.length > 0) {
        successMessage += ` with outstanding sections: ${highQualitySections.join(', ')}`;
      }
    }
    
    return {
      success: true,
      message: successMessage,
      data: landingPageData,
    };
  } catch (error) {
    // Error handling...
  }
}
```

## Testing Strategy

1. **Editorial Process Tests**
   - Test content improvement phase in isolation
   - Test quality assessment with various input contents
   - Verify threshold-based enable/disable decisions

2. **Required Sections Tests**
   - Verify that required sections are always enabled
   - Test edge cases with low-quality required sections

3. **Integration Tests**
   - Test complete flow from generation through both editorial phases
   - Verify selective regeneration of segments
   - Test caching behavior

## Implementation Status

The core components for section-level quality assessment have been created:

1. **SectionQualitySchema** - Created a new schema defining quality assessment metrics
2. **SectionQualityService** - Implemented a service for section assessment and improvement
3. **Review Prompts** - Created templates for assessment and improvement
4. **LandingPageGenerationService Integration** - Updated to use the quality assessment approach
5. **Test Suite** - Added tests for the quality assessment functionality

The implementation follows the Component Interface Standardization pattern with:

- Singleton pattern with getInstance/resetInstance/createFresh methods
- Clean separation of assessment and improvement responsibilities
- Clear threshold-based enablement logic
- Required section enforcement

### Remaining Implementation Work

To complete the full implementation, the following work is still needed:

1. **Final integration** - Connect the quality assessment to the website generation process
2. **Rendering integration** - Ensure the section enablement flags affect the final rendered content
3. **Content generation** - Complete the connection between quality scores and the actual content shown
4. **Quality reporting** - Add functionality to report on section quality metrics

### API Changes

The landing page generation API now supports:

```typescript
// Quality threshold customization
generateLandingPageData({
  qualityThresholds: {
    minCombinedScore: 7,
    minQualityScore: 6,
    minConfidenceScore: 6,
  },
  skipReview: false, // Controls whether quality assessment runs
});

// Get quality metrics
const assessments = landingPageService.getSectionQualityAssessments();
```

## Next Steps

1. Track quality metrics over time to analyze trends
2. Add a dashboard UI for quality visualization
3. A/B test different thresholds to optimize landing page performance
4. Add more section-specific assessment criteria