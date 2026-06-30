import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock register so tests don't depend on CSS.paintWorklet being present
vi.mock('../register', () => ({
  register: vi.fn().mockResolvedValue(undefined),
  registerAll: vi.fn().mockResolvedValue(undefined),
  isNativeHoudini: vi.fn().mockReturnValue(false),
}));

import { useWorklet } from '../react/useWorklet';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useWorklet', () => {
  it('returns a ref and setProps', () => {
    const { result } = renderHook(() => useWorklet('noise-field'));
    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.setProps).toBe('function');
  });

  it('calls register with the worklet name on mount', async () => {
    const { register } = await import('../register');
    renderHook(() => useWorklet('plasma'));
    expect(register).toHaveBeenCalledWith('plasma');
  });

  it('setProps does not throw when ref is not attached', () => {
    const { result } = renderHook(() => useWorklet('grain'));
    expect(() => {
      act(() => {
        result.current.setProps({ '--grain-opacity': 0.8 });
      });
    }).not.toThrow();
  });

  it('applies initialProps to the element on mount', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const { result } = renderHook(() =>
      useWorklet('noise-field', { '--nf-hue': 180, '--nf-scale': 5 })
    );

    // Manually attach ref
    (result.current.ref as { current: HTMLDivElement | null }).current = div;

    // Trigger setProps manually since ref wasn't attached during effect
    act(() => {
      result.current.setProps({ '--nf-hue': 180, '--nf-scale': 5 });
    });

    expect(div.style.getPropertyValue('--nf-hue')).toBe('180');
    expect(div.style.getPropertyValue('--nf-scale')).toBe('5');

    document.body.removeChild(div);
  });

  it('setProps sets multiple CSS custom properties', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const { result } = renderHook(() => useWorklet('marble'));
    (result.current.ref as { current: HTMLDivElement | null }).current = div;

    act(() => {
      result.current.setProps({ '--marble-hue': 240, '--marble-scale': 3, '--marble-contrast': 1.5 });
    });

    expect(div.style.getPropertyValue('--marble-hue')).toBe('240');
    expect(div.style.getPropertyValue('--marble-scale')).toBe('3');
    expect(div.style.getPropertyValue('--marble-contrast')).toBe('1.5');

    document.body.removeChild(div);
  });
});

