import { describe, expect, it } from 'vitest';
import { sampleSeedAction, shouldClearExampleHealthSource, shouldResetSeededName } from './sampleSeed';

describe('untouched sample seed', () => {
  it('leaves a cleared install alone', () => {
    expect(sampleSeedAction({ sampleSeedCleared: '1', usingSampleData: '1' })).toBe('skip');
    expect(sampleSeedAction({ sampleSeedCleared: '1', usingSampleData: '0' })).toBe('skip');
    expect(sampleSeedAction({ sampleSeedCleared: '1', usingSampleData: null })).toBe('skip');
  });

  it('clears an install that still has the untouched fictional seed', () => {
    expect(sampleSeedAction({ sampleSeedCleared: null, usingSampleData: '1' })).toBe('clear');
  });

  it('keeps data the user changed, and does not seed a new install', () => {
    expect(sampleSeedAction({ sampleSeedCleared: null, usingSampleData: '0' })).toBe('mark');
    expect(sampleSeedAction({ sampleSeedCleared: null, usingSampleData: null })).toBe('mark');
    expect(sampleSeedAction({ sampleSeedCleared: null, usingSampleData: '' })).toBe('mark');
  });

  it('resets the seeded name and example health source only when clearing', () => {
    expect(shouldResetSeededName('clear', 'Alex')).toBe(true);
    expect(shouldResetSeededName('clear', 'James')).toBe(false);
    expect(shouldResetSeededName('mark', 'Alex')).toBe(false);
    expect(shouldClearExampleHealthSource('clear', 'example')).toBe(true);
    expect(shouldClearExampleHealthSource('clear', 'healthkit')).toBe(false);
    expect(shouldClearExampleHealthSource('mark', 'example')).toBe(false);
  });
});
