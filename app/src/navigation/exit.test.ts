import { describe, expect, it } from 'vitest';
import { applyScreenExit, redirectOnLaunch, screenExit } from './exit';

describe('monthly report navigation', () => {
  it('pops when a screen sits under the report, so swipe-back has a target', () => {
    expect(screenExit(true)).toEqual({ type: 'back' });
    const calls: string[] = [];
    applyScreenExit(
      true,
      () => calls.push('back'),
      (href) => calls.push(href),
    );
    expect(calls).toEqual(['back']);
  });

  it('sends a trapped report back to the tabs when nothing is underneath', () => {
    expect(screenExit(false)).toEqual({ type: 'replace', href: '/(tabs)/stack' });
    const calls: string[] = [];
    applyScreenExit(
      false,
      () => calls.push('back'),
      (href) => calls.push(href),
    );
    expect(calls).toEqual(['/(tabs)/stack']);
  });

  it('does not relaunch into the report', () => {
    expect(redirectOnLaunch('/report', true)).toBe('/(tabs)/stack');
    expect(redirectOnLaunch('/report', false)).toBe('/onboarding');
    expect(redirectOnLaunch('/(tabs)/stack', true)).toBeNull();
    expect(redirectOnLaunch('/', true)).toBeNull();
  });
});
