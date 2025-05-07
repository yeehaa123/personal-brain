/**
 * Utility functions for handling landing page data
 */
import type { z } from 'zod';

import type {
  AboutSectionSchema,
  CaseStudiesSectionSchema,
  CtaSectionSchema,
  ExpertiseSectionSchema,
  FaqSectionSchema,
  FooterSectionSchema,
  HeroSectionSchema,
  LandingPageData,
  PricingSectionSchema,
  ProblemStatementSectionSchema,
  ProcessSectionSchema,
  ServicesSectionSchema,
} from '@website/schemas';

// Define type helpers for each section
type HeroSection = z.infer<typeof HeroSectionSchema>;
type ProblemStatementSection = z.infer<typeof ProblemStatementSectionSchema>;
type ServicesSection = z.infer<typeof ServicesSectionSchema>;
type ProcessSection = z.infer<typeof ProcessSectionSchema>;
type CaseStudiesSection = z.infer<typeof CaseStudiesSectionSchema>;
type ExpertiseSection = z.infer<typeof ExpertiseSectionSchema>;
type AboutSection = z.infer<typeof AboutSectionSchema>;
type PricingSection = z.infer<typeof PricingSectionSchema>;
type FaqSection = z.infer<typeof FaqSectionSchema>;
type CtaSection = z.infer<typeof CtaSectionSchema>;
type FooterSection = z.infer<typeof FooterSectionSchema>;

/**
 * Convert landing page data to a formatted markdown string
 * @param landingPage - Landing page data object
 * @returns Formatted markdown representation
 */
export function formatLandingPageToMarkdown(landingPage: LandingPageData): string {
  let markdown = `# ${landingPage.title}\n\n`;
  
  markdown += `**Description:** ${landingPage.description}\n`;
  markdown += `**Name:** ${landingPage.name}\n`;
  markdown += `**Tagline:** ${landingPage.tagline}\n\n`;
  
  // Add section order information
  markdown += '## Section Order\n';
  const enabledSections: string[] = [];
  
  for (const sectionType of landingPage.sectionOrder) {
    // Skip non-section properties
    if (['title', 'description', 'name', 'tagline', 'sectionOrder'].includes(sectionType)) {
      continue;
    }
    
    // Get the section
    const sectionKey = sectionType as keyof LandingPageData;
    const section = landingPage[sectionKey];
    
    if (section && typeof section === 'object') {
      const enabled = 'enabled' in section ? Boolean((section as { enabled?: boolean }).enabled) : true;
      enabledSections.push(`${sectionType}${enabled ? '' : ' (Disabled)'}`);
    }
  }
  
  markdown += enabledSections.join(' → ') + '\n\n';
  
  // Format each section
  for (const sectionType of landingPage.sectionOrder) {
    // Skip non-section properties
    if (['title', 'description', 'name', 'tagline', 'sectionOrder'].includes(sectionType)) {
      continue;
    }
    
    // Get the section
    const sectionKey = sectionType as keyof LandingPageData;
    const section = landingPage[sectionKey];
    
    if (!section) {
      continue;
    }
    
    // Format the section title and enabled status
    const enabled = typeof section === 'object' && 'enabled' in section 
      ? Boolean((section as { enabled?: boolean }).enabled) 
      : true;
      
    markdown += `## ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} ${!enabled ? '(Disabled)' : ''}\n`;
    
    // Format section content based on section type
    switch (sectionType) {
    case 'hero': {
      const heroSection = section as HeroSection;
      markdown += `**Headline:** ${heroSection.headline}\n`;
      markdown += `**Subheading:** ${heroSection.subheading}\n`;
      markdown += `**CTA:** [${heroSection.ctaText}](${heroSection.ctaLink})\n`;
      if (heroSection.imageUrl) markdown += `**Image:** ${heroSection.imageUrl}\n`;
      break;
    }
      
    case 'problemStatement': {
      const problemSection = section as ProblemStatementSection;
      markdown += `**Title:** ${problemSection.title}\n`;
      markdown += `**Description:** ${problemSection.description}\n`;
      if (problemSection.bulletPoints && problemSection.bulletPoints.length > 0) {
        markdown += '**Bullet Points:**\n';
        problemSection.bulletPoints.forEach(point => {
          markdown += `- ${point}\n`;
        });
      }
      break;
    }
      
    case 'services': {
      const servicesSection = section as ServicesSection;
      markdown += `**Title:** ${servicesSection.title}\n`;
      if (servicesSection.introduction) markdown += `**Introduction:** ${servicesSection.introduction}\n`;
      if (servicesSection.items && servicesSection.items.length > 0) {
        markdown += '**Services:**\n';
        servicesSection.items.forEach(item => {
          markdown += `- **${item.title}**: ${item.description}\n`;
        });
      }
      break;
    }
      
    case 'process': {
      const processSection = section as ProcessSection;
      markdown += `**Title:** ${processSection.title}\n`;
      if (processSection.introduction) markdown += `**Introduction:** ${processSection.introduction}\n`;
      if (processSection.steps && processSection.steps.length > 0) {
        markdown += '**Steps:**\n';
        processSection.steps.forEach(step => {
          markdown += `- **Step ${step.step}: ${step.title}**: ${step.description}\n`;
        });
      }
      break;
    }
      
    case 'caseStudies': {
      const caseStudiesSection = section as CaseStudiesSection;
      markdown += `**Title:** ${caseStudiesSection.title}\n`;
      if (caseStudiesSection.introduction) markdown += `**Introduction:** ${caseStudiesSection.introduction}\n`;
      if (caseStudiesSection.items && caseStudiesSection.items.length > 0) {
        markdown += '**Case Studies:**\n';
        caseStudiesSection.items.forEach((item, index) => {
          markdown += `### Case Study ${index + 1}: ${item.title}\n`;
          markdown += `**Client:** ${item.client || 'Unknown'}\n`;
          markdown += `**Challenge:** ${item.challenge}\n`;
          markdown += `**Approach:** ${item.approach}\n`;
          markdown += `**Results:** ${item.results}\n`;
        });
      }
      break;
    }
      
    case 'expertise': {
      const expertiseSection = section as ExpertiseSection;
      markdown += `**Title:** ${expertiseSection.title}\n`;
      if (expertiseSection.introduction) markdown += `**Introduction:** ${expertiseSection.introduction}\n`;
      if (expertiseSection.items && expertiseSection.items.length > 0) {
        markdown += '**Expertise Areas:**\n';
        expertiseSection.items.forEach(item => {
          markdown += `- **${item.title}**${item.description ? `: ${item.description}` : ''}\n`;
        });
      }
      if (expertiseSection.credentials && expertiseSection.credentials.length > 0) {
        markdown += '**Credentials:**\n';
        expertiseSection.credentials.forEach(credential => {
          markdown += `- **${credential.title}**${credential.issuer ? ` from ${credential.issuer}` : ''}${credential.year ? ` (${credential.year})` : ''}\n`;
        });
      }
      break;
    }
      
    case 'about': {
      const aboutSection = section as AboutSection;
      markdown += `**Title:** ${aboutSection.title}\n`;
      markdown += `**Content:**\n${aboutSection.content}\n`;
      if (aboutSection.imageUrl) markdown += `**Image:** ${aboutSection.imageUrl}\n`;
      if (aboutSection.ctaText && aboutSection.ctaLink) {
        markdown += `**CTA:** [${aboutSection.ctaText}](${aboutSection.ctaLink})\n`;
      }
      break;
    }
      
    case 'pricing': {
      const pricingSection = section as PricingSection;
      markdown += `**Title:** ${pricingSection.title}\n`;
      if (pricingSection.introduction) markdown += `**Introduction:** ${pricingSection.introduction}\n`;
      if (pricingSection.tiers && pricingSection.tiers.length > 0) {
        markdown += '**Pricing Tiers:**\n';
        pricingSection.tiers.forEach(tier => {
          const featured = tier.isFeatured ? ' (Featured)' : '';
          markdown += `### ${tier.name}${featured} ${tier.price ? `- ${tier.price}` : ''}\n`;
          markdown += `${tier.description}\n`;
          markdown += '**Features:**\n';
          tier.features.forEach(feature => {
            markdown += `- ${feature}\n`;
          });
          markdown += `CTA: [${tier.ctaText}](${tier.ctaLink})\n`;
        });
      }
      break;
    }
      
    case 'faq': {
      const faqSection = section as FaqSection;
      markdown += `**Title:** ${faqSection.title}\n`;
      if (faqSection.introduction) markdown += `**Introduction:** ${faqSection.introduction}\n`;
      if (faqSection.items && faqSection.items.length > 0) {
        markdown += '**FAQs:**\n';
        faqSection.items.forEach((item, index) => {
          markdown += `### Q${index + 1}: ${item.question}\n`;
          markdown += `${item.answer}\n\n`;
        });
      }
      break;
    }
      
    case 'cta': {
      const ctaSection = section as CtaSection;
      markdown += `**Title:** ${ctaSection.title}\n`;
      if (ctaSection.subtitle) markdown += `**Subtitle:** ${ctaSection.subtitle}\n`;
      markdown += `**Button:** [${ctaSection.buttonText}](${ctaSection.buttonLink})\n`;
      break;
    }
      
    case 'footer': {
      const footerSection = section as FooterSection;
      markdown += `**Copyright:** ${footerSection.copyrightText || 'Not specified'}\n`;
      if (footerSection.contactDetails) {
        markdown += '**Contact Details:**\n';
        if (footerSection.contactDetails.email) {
          markdown += `- Email: ${footerSection.contactDetails.email}\n`;
        }
        if (footerSection.contactDetails.phone) {
          markdown += `- Phone: ${footerSection.contactDetails.phone}\n`;
        }
        
        if (footerSection.contactDetails.social && footerSection.contactDetails.social.length > 0) {
          markdown += '**Social:**\n';
          footerSection.contactDetails.social.forEach((social) => {
            markdown += `- ${social.platform}: ${social.url}\n`;
          });
        }
      }
      if (footerSection.links && footerSection.links.length > 0) {
        markdown += '**Links:**\n';
        footerSection.links.forEach((link) => {
          markdown += `- [${link.text}](${link.url})\n`;
        });
      }
      break;
    }
      
    default:
      // Generic object display for unknown sections
      markdown += `**Data:** ${JSON.stringify(section, null, 2)}\n`;
    }
    
    markdown += '\n';
  }
  
  return markdown;
}