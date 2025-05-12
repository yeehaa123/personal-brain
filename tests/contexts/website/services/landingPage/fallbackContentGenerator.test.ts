import { beforeEach, describe, expect, test } from 'bun:test';

import { FallbackContentGenerator } from '@/contexts/website/services/landingPage/fallbackContentGenerator';

describe('FallbackContentGenerator', () => {
  beforeEach(() => {
    FallbackContentGenerator.resetInstance();
  });

  test('should provide singleton instance', () => {
    const instance1 = FallbackContentGenerator.getInstance();
    const instance2 = FallbackContentGenerator.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  test('should create fresh instance', () => {
    const instance1 = FallbackContentGenerator.getInstance();
    const instance2 = FallbackContentGenerator.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });

  test('should generate hero section fallback content', () => {
    const generator = FallbackContentGenerator.getInstance();
    const fallback = generator.getFallbackContent('hero');
    
    expect(fallback).toMatchObject({
      title: expect.any(String),
      headline: expect.any(String),
      subheading: expect.any(String),
      ctaText: expect.any(String),
      ctaLink: expect.any(String),
    });
  });

  test('should generate services section fallback content', () => {
    const generator = FallbackContentGenerator.getInstance();
    const fallback = generator.getFallbackContent('services');
    
    expect(fallback).toMatchObject({
      title: expect.any(String),
      items: expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
        }),
      ]),
    });
  });

  test('should generate pricing section fallback content', () => {
    const generator = FallbackContentGenerator.getInstance();
    const fallback = generator.getFallbackContent('pricing');
    
    expect(fallback).toMatchObject({
      title: expect.any(String),
      tiers: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          price: expect.any(String),
          features: expect.arrayContaining([expect.any(String)]),
        }),
      ]),
      enabled: false,
    });
  });
  
  test('should generate footer section fallback content', () => {
    const generator = FallbackContentGenerator.getInstance();
    const fallback = generator.getFallbackContent('footer');
    
    expect(fallback).toMatchObject({
      title: expect.any(String),
      copyrightText: expect.stringContaining(new Date().getFullYear().toString()),
      contactDetails: expect.objectContaining({
        email: expect.any(String),
      }),
      links: expect.arrayContaining([
        expect.objectContaining({
          text: expect.any(String),
          url: expect.any(String),
        }),
      ]),
    });
  });

  test('should handle unknown section types gracefully', () => {
    const generator = FallbackContentGenerator.getInstance();
    const fallback = generator.getFallbackContent('unknownSection');
    
    expect(fallback).toMatchObject({
      title: expect.stringContaining('Unknown'),
      enabled: false,
    });
  });

  test('should format section names correctly', () => {
    const generator = FallbackContentGenerator.getInstance();
    
    // Test for camelCase section names
    const fallback1 = generator.getFallbackContent('heroSection');
    expect(fallback1).toMatchObject({
      title: 'Hero Section',
    });
    
    // Test for kebab-case section names
    const fallback2 = generator.getFallbackContent('problem-statement');
    expect(fallback2).toMatchObject({
      title: 'Problem Statement',
    });
  });
});