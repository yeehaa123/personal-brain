import type { ProfileContext } from '@/mcp/contexts/profiles';
import { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import { type LandingPageData, LandingPageSchema } from '@website/schemas';

/**
 * Service for generating landing page data from profile information
 * and the entire personal brain content
 * 
 * Implements the Component Interface Standardization pattern
 */
export class LandingPageGenerationService {
  private static instance: LandingPageGenerationService | null = null;
  private profileContext: ProfileContext | null = null;
  private brainProtocol: BrainProtocol | null = null;
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get singleton instance of LandingPageGenerationService
   */
  static getInstance(): LandingPageGenerationService {
    if (!LandingPageGenerationService.instance) {
      LandingPageGenerationService.instance = new LandingPageGenerationService();
    }
    return LandingPageGenerationService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    LandingPageGenerationService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(): LandingPageGenerationService {
    return new LandingPageGenerationService();
  }
  
  /**
   * Set the profile context to use for getting profile information
   */
  setProfileContext(context: ProfileContext): void {
    this.profileContext = context;
  }
  
  /**
   * Get the current profile context
   */
  getProfileContext(): ProfileContext | null {
    return this.profileContext;
  }
  
  /**
   * Generate landing page data using AI from brain content
   * @param overrides Optional overrides to customize the data
   * @returns Generated landing page data
   */
  async generateLandingPageData(overrides?: Partial<LandingPageData>): Promise<LandingPageData> {
    if (!this.profileContext) {
      throw new Error('Profile context not set');
    }
    
    try {
      // Get profile from the profile context (required for verification)
      const profile = await this.profileContext.getProfile();
      
      if (!profile) {
        throw new Error('No profile found');
      }
      
      // Generate enhanced content using BrainProtocol
      const enhancedData = await this.generateAIEnhancedContent();
      
      // Use the enhanced data with any overrides
      this.logger.info('Successfully generated AI-enhanced landing page content', {
        context: 'LandingPageGenerationService',
      });
      
      return {
        ...enhancedData,
        ...overrides,
      };
      
    } catch (error) {
      this.logger.error('Error generating landing page data', { 
        error, 
        context: 'LandingPageGenerationService', 
      });
      throw error;
    }
  }
  
  /**
   * Get the Brain Protocol instance used for AI operations
   * @public Exposed for testing purposes
   */
  public getBrainProtocol(): BrainProtocol {
    if (!this.brainProtocol) {
      // If not explicitly set, use the singleton instance
      this.brainProtocol = BrainProtocol.getInstance();
    }
    return this.brainProtocol;
  }
  
  /**
   * Set the Brain Protocol instance
   * @param protocol The brain protocol instance to use
   */
  public setBrainProtocol(protocol: BrainProtocol): void {
    this.brainProtocol = protocol;
  }
  
  /**
   * Generate AI-enhanced landing page content using BrainProtocol
   * @returns Enhanced landing page data
   */
  private async generateAIEnhancedContent(): Promise<LandingPageData> {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create a query prompt for generating landing page content
    const query = `Please analyze my personal brain content and generate enhanced landing page content for my website.
    
Based on the information in my notes and profile, create:
1. A name for the landing page (can be my name or something creative)
2. A title for the browser tab and SEO (typically "[Name] - [Occupation]" but make it compelling)
3. A tagline (a short, memorable phrase that captures the essence of my work/interests)

Format your response as JSON with these exact fields:
{
  "name": "Name for the landing page",
  "title": "Title for the browser tab and SEO",
  "tagline": "Short, compelling tagline"
}

The output should reflect the key themes in my notes, be professional, concise, and impactful.`;

    // Use BrainProtocol to process the query
    const response = await brainProtocol.processQuery(query, {
      userId: 'system',
      userName: 'System',
    });
    
    // Extract the JSON response
    try {
      // Look for JSON object in the response text
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      // Extract and parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Use Zod schema to validate the response structure
      const validationResult = LandingPageSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        // Return the validated data
        return validationResult.data;
      } else {
        // Log validation errors
        this.logger.error('AI response validation failed', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error parsing AI response', {
        error,
        context: 'LandingPageGenerationService',
        response: response.answer,
      });
      throw new Error('Failed to parse AI-generated content');
    }
  }
  
  // No longer need profile mapping since we exclusively use AI-generated content
}

export default LandingPageGenerationService;