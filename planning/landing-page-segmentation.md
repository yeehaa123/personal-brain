# Landing Page Generation Segmentation Plan

## Current Challenges

The current landing page generation process attempts to create all sections in one go, leading to several issues:

1. **Exceeds AI Context Window**: The complete landing page JSON is too large for a single AI generation pass
2. **Quality Suffers**: When trying to generate all sections at once, the quality of each section is reduced
3. **Review Complexity**: Reviewing the entire landing page as one unit is difficult and error-prone
4. **Difficult Refinement**: Making targeted improvements to specific sections becomes challenging

## Proposed Architecture: Segment and Combine Approach

### 1. Segment Generation

Split the landing page generation into logical segment groups:

**Group 1: Core Identity**
- Hero section
- Problem statement
- Basic metadata (title, description, name, tagline)

**Group 2: Service Offering**
- Services section
- Process section
- Pricing section (if applicable)

**Group 3: Credibility Proof**
- Testimonials
- Expertise
- About section

**Group 4: Conversion Elements**
- FAQ
- CTA
- Footer

### 2. Implementation Strategy

Update the `LandingPageGenerationService` to:

1. Generate each segment group separately with targeted prompts
2. Store intermediate segment results
3. Combine segments into a complete landing page
4. Perform a final editorial review on the combined result

```typescript
// Pseudo-implementation
async generateLandingPageData(overrides?: Partial<LandingPageData>): Promise<LandingPageData> {
  // 1. Generate core identity segment
  const identitySegment = await this.generateIdentitySegment();
  
  // 2. Generate service offering segment
  const servicesSegment = await this.generateServicesSegment();
  
  // 3. Generate credibility proof segment
  const credibilitySegment = await this.generateCredibilitySegment();
  
  // 4. Generate conversion elements segment
  const conversionSegment = await this.generateConversionSegment();
  
  // 5. Combine segments
  const combinedData = this.combineSegments([
    identitySegment,
    servicesSegment,
    credibilitySegment,
    conversionSegment
  ]);
  
  // 6. Final editorial review and section ordering
  const finalData = await this.reviewAndFinalize(combinedData);
  
  // 7. Apply any manual overrides
  return {
    ...finalData,
    ...overrides
  } as LandingPageData;
}
```

### 3. Segment-Specific Prompt Design

Create targeted prompts for each segment group:

- **Identity Prompt**: Focus on capturing the essence of the individual/business and the problem they solve
- **Services Prompt**: Focus on clear service descriptions and process steps
- **Credibility Prompt**: Focus on expertise presentation and social proof
- **Conversion Prompt**: Focus on addressing objections and crafting compelling CTAs

### 4. Storage and Caching Strategy

Implement caching for individual segments to:

1. Allow regeneration of specific segments without starting over
2. Enable iterative refinement of the landing page
3. Support A/B testing of different segment variations

## Technical Implementation

### 1. New Segment Interfaces

```typescript
// Example segment interfaces
interface IdentitySegment {
  title: string;
  description: string;
  name: string;
  tagline: string;
  hero: HeroSection;
  problemStatement?: ProblemStatementSection;
}

interface ServicesSegment {
  services: ServicesSection;
  process?: ProcessSection;
  pricing?: PricingSection;
}

// Similar interfaces for other segments
```

### 2. Modified Generation Service

Update the `LandingPageGenerationService` to:

1. Add segment-specific generation methods
2. Implement segment combination logic
3. Add segment caching capabilities
4. Support targeted segment regeneration

### 3. Enhanced Review Process

Implement a two-phase review workflow:

1. **Segment-Level Review**: Review each segment individually after generation
2. **Holistic Review**: Final review of the complete landing page focusing on consistency and flow

## Implementation Phases

### Phase 1: Core Architecture

1. Define segment interfaces
2. Implement segment generation methods
3. Create segment-specific prompts
4. Update LandingPageGenerationService

### Phase 2: Segment Storage

1. Implement segment caching
2. Add segment version tracking
3. Support segment regeneration

### Phase 3: Enhanced Review

1. Implement segment-level review
2. Add holistic review capabilities
3. Support selective segment regeneration based on review feedback

## Benefits

1. **Improved Quality**: Each segment gets focused attention
2. **Iterative Refinement**: Specific segments can be regenerated without starting over
3. **Better Performance**: Generation can be parallelized for faster results
4. **More Control**: Targeted improvements become easier
5. **Enhanced Reusability**: Segment caching enables template-like functionality

## Testing Strategy

### 1. Unit Testing

1. **Segment Generation Tests**
   - Test each segment generation method in isolation
   - Verify schema compliance for each segment output
   - Test with various profile inputs to ensure robustness

2. **Combination Tests**
   - Test the segment combination logic
   - Verify that segments are properly merged
   - Test handling of missing or incomplete segments

3. **Review Logic Tests**
   - Test the review functionality with mock segments
   - Verify that review suggestions are properly applied

### 2. Mock Implementation

Create specialized mocks for testing:

```typescript
// Example mock for segment generation
export class MockLandingPageGenerationService extends LandingPageGenerationService {
  // Override methods to return predictable test data
  async generateIdentitySegment(): Promise<IdentitySegment> {
    return mockIdentitySegment;
  }
  
  async generateServicesSegment(): Promise<ServicesSegment> {
    return mockServicesSegment;
  }
  
  // Mock other methods...
}
```

### 3. Test Fixtures

Develop standard test fixtures:

1. **Mock Segments**: Create pre-defined segment objects for testing
2. **Mock Profiles**: Create sample profiles with various characteristics
3. **Expected Outputs**: Define expected outputs for different inputs

## Risks and Mitigations

1. **Risk**: Inconsistency between segments
   **Mitigation**: Final holistic review pass

2. **Risk**: More complex code
   **Mitigation**: Clear interfaces, thorough documentation, and comprehensive unit tests

3. **Risk**: Increased API usage
   **Mitigation**: Implement caching, reuse when appropriate, and use mocks for testing

4. **Risk**: Regression in existing functionality
   **Mitigation**: Comprehensive test coverage