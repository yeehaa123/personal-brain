import { beforeEach, describe, expect, test } from 'bun:test';

import { MockCLIInterface } from '@test/__mocks__/utils/cliInterface';

describe('CLIInterface Spinner', () => {
  let mockCLI: MockCLIInterface;

  beforeEach(() => {
    MockCLIInterface.resetInstance();
    mockCLI = MockCLIInterface.createFresh();
  });

  test('withSpinner should properly track spinner lifecycle', async () => {
    const result = await mockCLI.withSpinner('Processing data', async () => {
      return 'success';
    });

    // Check result
    expect(result).toBe('success');
    
    // Check spinner lifecycle
    expect(mockCLI.spinnerStartCalls.length).toBe(1);
    expect(mockCLI.spinnerStartCalls[0]).toBe('Processing data');
    expect(mockCLI.spinnerStopCalls.length).toBe(1);
    expect(mockCLI.spinnerStopCalls[0].type).toBe('success');
  });

  test('withSpinner should handle errors properly', async () => {
    const error = new Error('Test error');
    
    try {
      await mockCLI.withSpinner('Processing data', async () => {
        throw error;
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (e) {
      // Check error is passed through
      expect(e).toBe(error);
      
      // Check spinner lifecycle
      expect(mockCLI.spinnerStartCalls.length).toBe(1);
      expect(mockCLI.spinnerStopCalls.length).toBe(1);
      expect(mockCLI.spinnerStopCalls[0].type).toBe('error');
      expect(mockCLI.spinnerStopCalls[0].text).toContain('Test error');
    }
  });

  test('withProgressSpinner should track steps properly', async () => {
    const steps = ['Step One', 'Step Two', 'Step Three'];
    
    const result = await mockCLI.withProgressSpinner(steps, async (updateStep) => {
      expect(mockCLI.currentStep).toBe(0);
      
      // Update to step 2
      updateStep(1);
      expect(mockCLI.currentStep).toBe(1);
      
      // Update to step 3
      updateStep(2);
      expect(mockCLI.currentStep).toBe(2);
      
      return 'completed';
    });
    
    // Check result
    expect(result).toBe('completed');
    
    // Check steps were tracked
    expect(mockCLI.steps).toEqual(steps);
    
    // Check spinner lifecycle
    expect(mockCLI.spinnerStartCalls.length).toBe(1);
    expect(mockCLI.spinnerStartCalls[0]).toBe('Step One (Step 1/3)');
    
    expect(mockCLI.spinnerUpdateCalls.length).toBe(2);
    expect(mockCLI.spinnerUpdateCalls[0]).toBe('Step Two (Step 2/3)');
    expect(mockCLI.spinnerUpdateCalls[1]).toBe('Step Three (Step 3/3)');
    
    expect(mockCLI.spinnerStopCalls.length).toBe(1);
    expect(mockCLI.spinnerStopCalls[0].type).toBe('success');
  });

  test('withProgressSpinner should handle errors properly', async () => {
    const steps = ['Step One', 'Step Two', 'Step Three'];
    const error = new Error('Test step error');
    
    try {
      await mockCLI.withProgressSpinner(steps, async (updateStep) => {
        updateStep(1);
        throw error;
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (e) {
      // Check error is passed through
      expect(e).toBe(error);
      
      // Check spinner lifecycle
      expect(mockCLI.spinnerStartCalls.length).toBe(1);
      expect(mockCLI.spinnerUpdateCalls.length).toBe(1);
      expect(mockCLI.spinnerStopCalls.length).toBe(1);
      expect(mockCLI.spinnerStopCalls[0].type).toBe('error');
      expect(mockCLI.spinnerStopCalls[0].text).toContain('Test step error');
    }
  });

  test('withProgressSpinner should handle empty steps array', async () => {
    const result = await mockCLI.withProgressSpinner([], async () => {
      return 'no steps';
    });
    
    // Check result
    expect(result).toBe('no steps');
    
    // There should be no spinner start calls
    expect(mockCLI.spinnerStartCalls.length).toBe(0);
  });

  test('withProgressSpinner should handle invalid step indices', async () => {
    const steps = ['Step One', 'Step Two'];
    
    await mockCLI.withProgressSpinner(steps, async (updateStep) => {
      // Try invalid indices
      updateStep(-1);
      updateStep(999);
      
      // Should not affect current step
      expect(mockCLI.currentStep).toBe(0);
      
      return 'done';
    });
    
    // Only the initial spinner start should be called
    expect(mockCLI.spinnerStartCalls.length).toBe(1);
    expect(mockCLI.spinnerUpdateCalls.length).toBe(0);
  });
});