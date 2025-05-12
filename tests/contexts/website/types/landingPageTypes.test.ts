import { describe, expect, test } from 'bun:test';

import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';

describe('LandingPageTypes', () => {
  test('should have all required section generation status values', () => {
    // Instead of comparing to string literals, check they exist as enum values
    expect(SectionGenerationStatus.Pending).toBeDefined();
    expect(SectionGenerationStatus.InProgress).toBeDefined();
    expect(SectionGenerationStatus.Completed).toBeDefined();
    expect(SectionGenerationStatus.Failed).toBeDefined();
    expect(SectionGenerationStatus.Retrying).toBeDefined();
    
    // Check the enum string values are what we expect
    expect(String(SectionGenerationStatus.Pending)).toEqual('pending');
    expect(String(SectionGenerationStatus.InProgress)).toEqual('in_progress');
    expect(String(SectionGenerationStatus.Completed)).toEqual('completed');
    expect(String(SectionGenerationStatus.Failed)).toEqual('failed');
    expect(String(SectionGenerationStatus.Retrying)).toEqual('retrying');
  });
});