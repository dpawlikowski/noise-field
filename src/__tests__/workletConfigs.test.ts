import { describe, it, expect } from 'vitest';
import { workletConfigs } from '../demo/workletConfigs';

const EXPECTED_NAMES = ['noise-field', 'plasma', 'marble', 'grain', 'mesh-gradient'] as const;

describe('workletConfigs', () => {
  it('contains exactly 5 entries', () => {
    expect(workletConfigs).toHaveLength(5);
  });

  it('has all required worklet names', () => {
    const names = workletConfigs.map(c => c.name);
    expect(names).toEqual(expect.arrayContaining(EXPECTED_NAMES));
  });

  it('every config has non-empty title and description', () => {
    for (const config of workletConfigs) {
      expect(config.title.length).toBeGreaterThan(0);
      expect(config.description.length).toBeGreaterThan(0);
    }
  });

  it('every config has valid animationCSS with @property and @keyframes', () => {
    for (const config of workletConfigs) {
      expect(config.animationCSS).toContain('@property');
      expect(config.animationCSS).toContain('@keyframes');
    }
  });

  it('every prop config has min < max', () => {
    for (const config of workletConfigs) {
      for (const prop of config.props) {
        expect(prop.min).toBeLessThan(prop.max);
      }
    }
  });

  it('every prop default value is within [min, max]', () => {
    for (const config of workletConfigs) {
      for (const prop of config.props) {
        expect(prop.defaultValue).toBeGreaterThanOrEqual(prop.min);
        expect(prop.defaultValue).toBeLessThanOrEqual(prop.max);
      }
    }
  });

  it('every prop step is positive', () => {
    for (const config of workletConfigs) {
      for (const prop of config.props) {
        expect(prop.step).toBeGreaterThan(0);
      }
    }
  });

  it('mesh-gradient has defaultColors with valid hex values', () => {
    const mesh = workletConfigs.find(c => c.name === 'mesh-gradient')!;
    expect(mesh.defaultColors).toBeDefined();
    expect(mesh.defaultColors!.length).toBe(4);
    for (const color of mesh.defaultColors!) {
      expect(color.defaultValue).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('noise-field has hue, scale, saturation, lightness props', () => {
    const nf = workletConfigs.find(c => c.name === 'noise-field')!;
    const vars = nf.props.map(p => p.cssVar);
    expect(vars).toContain('--nf-hue');
    expect(vars).toContain('--nf-scale');
    expect(vars).toContain('--nf-saturation');
    expect(vars).toContain('--nf-lightness');
  });
});
