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
    problemStatement: {
      title: 'Challenges We Solve',
      description: 'Modern challenges in web development',
      enabled: true,
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
    process: {
      title: 'How I Work',
      steps: [{ step: 1, title: 'Initial Consultation', description: 'Understanding your needs' }],
      enabled: true,
    },
    caseStudies: {
      title: 'Case Studies',
      items: [],
      enabled: true,
    },
    expertise: {
      title: 'Expertise',
      items: [{ title: 'Web Development', description: 'Years of experience' }],
      enabled: true,
    },
    about: {
      title: 'About Me',
      content: 'Test about content',
      enabled: true,
    },
    pricing: {
      title: 'Pricing',
      tiers: [],
      enabled: false,
    },
    faq: {
      title: 'FAQ',
      items: [{ question: 'Question 1', answer: 'Answer 1' }],
      enabled: true,
    },
    cta: {
      title: 'Get Started',
      buttonText: 'Contact Us',
      buttonLink: '#contact',
      enabled: true,
    },
    footer: {
      copyrightText: '© 2023 Test User',
      enabled: true,
    },
    sectionOrder: ['hero', 'services', 'about', 'footer'],
  };

  // Merge overrides with default data
  return {
    ...defaultData,
    ...overrides,
  };
}