# Improved Landing Page Segmentation with Quality-Driven Enablement

## Core Concept
Transform the segmented landing page generation by making all sections required in the data model but controllable via an `enabled` flag, with an AI-powered editorial review that assesses quality and determines final section inclusion.

## Current Implementation Issues

The current segmented approach has several pain points:

1. **Excessive Type Complexity**: Dealing with optional fields creates verbose type handling
2. **Duplicated Logic**: Each segment generator contains similar boilerplate code
3. **Unclear Quality Control**: No systematic way to determine which sections should be included
4. **Difficult Testing**: Optional fields make test scenarios more complex

## Improved Architecture

### 1. Required Fields with Enabled Flag

Instead of making sections optional in the schema, make them required but controllable via an `enabled` flag:

```typescript
// BEFORE: Optional fields approach
export const CredibilitySegmentSchema = z.object({
  caseStudies: CaseStudiesSectionSchema.optional(), // Problematic
  // Other optional sections...
});

// AFTER: Required fields with enabled flag
export const CredibilitySegmentSchema = z.object({
  caseStudies: z.object({
    title: z.string().default('Case Studies'),
    items: z.array(CaseStudyItemSchema),
    enabled: z.boolean().default(true), // Default to enabled for generation
    // Other required fields...
  }),
  // Other required sections with enabled flags...
});
```

### 2. Unified Segment Generation

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

### 3. Editorial Quality Assessment

Add a quality evaluation step that determines which sections should be enabled:

```typescript
// Quality assessment schema
const SectionQualitySchema = z.object({
  qualityScore: z.number().min(1).max(10),
  justification: z.string(),
});

// Review and enable/disable sections based on quality
async reviewLandingPage(segments: SegmentStore): Promise<SegmentStore> {
  try {
    // Create a review prompt that includes quality assessment criteria
    const reviewPrompt = `
      You are a professional editor evaluating website content quality.
      
      Review each section of this landing page and rate its quality on a scale of 1-10.
      Disable sections that score below 7/10.
      
      Criteria:
      - Relevance to target audience
      - Clarity and persuasiveness
      - Alignment with brand identity
      - Actionability and value proposition
      
      For each section, provide:
      1. Quality score (1-10)
      2. Brief justification
      3. Whether to enable (true/false) based on score (7+ = enable)
      
      CONTENT TO REVIEW:
      ${JSON.stringify(segments, null, 2)}
    `;
    
    // Process the review
    const result = await this.brainProtocol.processQuery(reviewPrompt, {
      userId: 'system',
      userName: 'System',
      schema: EditorialReviewSchema,
    });
    
    // Extract reviewed segments with quality-based enabled flags
    const reviewedSegments = result.object?.segments || segments;
    
    // Update cache with reviewed segments
    for (const segmentType in reviewedSegments) {
      this.segmentCache.saveSegment(segmentType, reviewedSegments[segmentType]);
    }
    
    this.segmentGenerationStatus.reviewed = true;
    return reviewedSegments;
  } catch (error) {
    this.logger.error('Error during editorial review', {
      error: error instanceof Error ? error.message : String(error),
      context: 'LandingPageGenerationService',
    });
    return segments; // Return original segments if review fails
  }
}
```

### 4. Simplified Landing Page Assembly

Only include sections that passed the quality review:

```typescript
combineLandingPage(segments: SegmentStore): LandingPageData {
  // Start with base properties
  const landingPage: LandingPageData = {
    title: segments.identity.title,
    description: segments.identity.description,
    name: segments.identity.name,
    tagline: segments.identity.tagline,
    hero: segments.identity.hero,
    sectionOrder: ['hero'], // Always include hero
  };
  
  // Add sections based on their enabled status (set by quality review)
  if (segments.identity.problemStatement.enabled) {
    landingPage.problemStatement = segments.identity.problemStatement;
    landingPage.sectionOrder.push('problemStatement');
  }
  
  if (segments.serviceOffering.services.enabled) {
    landingPage.services = segments.serviceOffering.services;
    landingPage.sectionOrder.push('services');
  }
  
  // Continue for all other sections...
  
  return landingPage;
}
```

## Implementation Plan

### Phase 1: Schema Updates

1. Revise segment schemas to make all sections required with enabled flags
2. Update types to reflect the new approach
3. Add quality assessment schemas

### Phase 2: Streamlined Generation

1. Implement the generic segment generator method
2. Update existing segment generation methods to use the generic implementation
3. Add proper validation and default handling using Zod

### Phase 3: Quality-Driven Enablement

1. Implement the editorial review with quality assessment
2. Enhance the landing page assembly to respect enabled flags
3. Add quality score tracking for analytics

### Phase 4: Testing and Refinement

1. Update tests to verify quality-based enablement
2. Add specific test cases for edge conditions
3. Create performance benchmarks

## Benefits

1. **Simplified Data Model**: All sections required in the schema with consistent structure
2. **Quality-Driven Content**: Only high-quality sections appear in the final page
3. **Reduced Code Duplication**: Generic segment generation eliminates redundancy
4. **Better Type Safety**: Zod handles validation and defaults properly
5. **Easier Testing**: Consistent structure simplifies test cases
6. **Transparent Quality Control**: Clear criteria for section inclusion

## Implementation Example

```typescript
// Usage example in WebsiteContext
async generateLandingPage(options?: {
  regenerateSegments?: boolean;
  segmentsToGenerate?: SegmentType[];
  skipQualityReview?: boolean;
}): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
  try {
    // Get service
    const landingPageService = this.getLandingPageGenerationService();
    
    // Generate landing page with quality review
    const landingPageData = await landingPageService.generateLandingPageData({
      regenerateSegments: options?.regenerateSegments,
      segmentsToGenerate: options?.segmentsToGenerate,
      skipQualityReview: options?.skipQualityReview,
    });
    
    // Get quality information for reporting
    const status = landingPageService.getSegmentGenerationStatus();
    const qualityScores = landingPageService.getSegmentQualityScores();
    
    // Build success message based on quality scores
    let successMessage = 'Successfully generated landing page';
    if (qualityScores) {
      const highQualitySections = Object.entries(qualityScores)
        .filter(([_, score]) => score >= 8)
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

1. **Quality Assessment Tests**
   - Test different quality score thresholds for section enablement
   - Verify that low-quality sections are properly disabled
   - Test edge cases where all sections have low quality

2. **Segment Generation Tests**
   - Test the generic segment generator with various schemas
   - Verify that defaults are properly applied
   - Test error handling scenarios

3. **Integration Tests**
   - Verify end-to-end flow from generation to quality review to final assembly
   - Test selective regeneration of segments
   - Verify caching and invalidation

## Next Steps

1. Define the full set of quality criteria for each section type
2. Create guidance examples for high-quality versus low-quality content
3. Set up monitoring for section quality trends over time
4. Consider A/B testing different quality thresholds for section enablement