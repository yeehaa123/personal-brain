/**
 * Website testing helpers
 * 
 * This file contains utilities for testing website-related functionality
 */

import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
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

/**
 * Create a valid WebsiteIdentityData object for testing
 * 
 * @param overrides Optional partial data to override default values
 * @returns A valid WebsiteIdentityData object suitable for testing
 */
export function createTestIdentityData(overrides?: Partial<WebsiteIdentityData>): WebsiteIdentityData {
  const defaultData: WebsiteIdentityData = {
    personalData: {
      name: 'Test User',
      email: 'test@example.com',
      company: 'Test Company',
      occupation: 'Web Developer',
      industry: 'Technology',
      yearsExperience: 10,
      location: 'San Francisco, CA, USA',
    },
    creativeContent: {
      title: 'Test User - Professional Web Development',
      description: 'Expert web development services by Test User',
      tagline: 'Transforming ideas into digital reality',
      pitch: 'I help businesses create effective web solutions that grow their digital presence.',
      uniqueValue: 'A blend of technical expertise and creative problem-solving.',
      keyAchievements: [
        'Successfully completed 150+ projects',
        'Reduced loading times by 40% on average',
        'Developed custom solutions for enterprise clients',
      ],
    },
    brandIdentity: {
      tone: {
        formality: 'professional',
        personality: ['knowledgeable', 'approachable', 'innovative'],
        emotion: 'confident',
      },
      contentStyle: {
        writingStyle: 'Clear, concise, and engaging with a focus on value',
        sentenceLength: 'varied',
        vocabLevel: 'moderate',
        useJargon: false,
        useHumor: true,
        useStories: true,
      },
      values: {
        coreValues: ['quality', 'innovation', 'reliability', 'transparency'],
        targetAudience: ['small businesses', 'startups', 'tech companies'],
        painPoints: [
          'outdated web presence',
          'slow loading times',
          'poor user experience',
          'lack of technical expertise',
        ],
        desiredAction: 'Contact Test User for a consultation on your web development needs',
      },
    },
  };

  // Merge overrides with default data
  return {
    ...defaultData,
    ...overrides,
  };
}