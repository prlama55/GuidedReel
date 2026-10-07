import { describe, expect, it } from 'vitest';
import * as core from './index';
import * as storage from './storage';
import * as providers from './providers';

describe('@guidedreel/core', () => {
  it('re-exports schema, engine and templates', () => {
    expect(typeof core.validateProject).toBe('function');
    expect(typeof core.calculateTimeline).toBe('function');
    expect(core.templateRegistry).toBeDefined();
  });
  it('re-exports storage and providers', () => {
    expect(Object.keys(storage).length).toBeGreaterThan(0);
    expect(Object.keys(providers).length).toBeGreaterThan(0);
  });
});
