/**
 * Website testing helpers
 * 
 * This file contains utilities for testing website-related functionality
 */

import type { LandingPageData } from '@website/schemas';

/**
 * Create a valid LandingPageData object with minimal required fields for testing
 * 
 * @param overrides Optional partial data to override default values
 * @returns A valid LandingPageData object suitable for testing
 */
export function createTestLandingPageData(overrides?: Partial<LandingPageData>): LandingPageData {
  const defaultData: LandingPageData = {
    name: 'Test User',
    title: 'Test User - Personal Website',
    tagline: 'Web Developer & AI Enthusiast',
    description: 'Professional web developer specializing in modern technologies',
    hero: {
      headline: 'Welcome to my website',
      subheading: 'Learn more about my work and expertise',
      ctaText: 'Contact Me',
      ctaLink: '/contact',
      imageUrl: '/images/hero.jpg',
    },
    services: {
      title: 'Services',
      introduction: 'What I offer',
      items: [
        {
          title: 'Web Development',
          description: 'Building responsive websites',
          icon: 'code',
        },
      ],
    },
    sectionOrder: ['hero', 'services'],
  };

  // Merge overrides with default data
  return {
    ...defaultData,
    ...overrides,
  };
}