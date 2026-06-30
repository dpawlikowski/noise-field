import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test register.ts in isolation by mocking CSS.paintWorklet
// The module uses import.meta.url to build worklet URLs, so we mock that too

const mockAddModule = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  mockAddModule.mockClear();

  // Reset the module registry between tests so `registered` Set is fresh
  vi.resetModules();

  // Provide CSS.paintWorklet on the global
  Object.defineProperty(globalThis, 'CSS', {
    value: { paintWorklet: { addModule: mockAddModule } },
    writable: true,
    configurable: true,
  });
});

describe('isNativeHoudini', () => {
  it('returns true when CSS.paintWorklet exists', async () => {
    const { isNativeHoudini } = await import('../register');
    expect(isNativeHoudini()).toBe(true);
  });

  it('returns false when CSS.paintWorklet is absent', async () => {
    Object.defineProperty(globalThis, 'CSS', {
      value: {},
      writable: true,
      configurable: true,
    });
    const { isNativeHoudini } = await import('../register');
    expect(isNativeHoudini()).toBe(false);
  });
});

describe('register', () => {
  it('calls addModule with a URL string', async () => {
    const { register } = await import('../register');
    await register('noise-field');
    expect(mockAddModule).toHaveBeenCalledOnce();
    expect(typeof mockAddModule.mock.calls[0][0]).toBe('string');
  });

  it('does not call addModule twice for the same worklet', async () => {
    const { register } = await import('../register');
    await register('plasma');
    await register('plasma');
    expect(mockAddModule).toHaveBeenCalledOnce();
  });

  it('registers different worklets independently', async () => {
    const { register } = await import('../register');
    await register('grain');
    await register('marble');
    expect(mockAddModule).toHaveBeenCalledTimes(2);
  });
});

describe('registerAll', () => {
  it('registers all 5 worklets', async () => {
    const { registerAll } = await import('../register');
    await registerAll();
    expect(mockAddModule).toHaveBeenCalledTimes(5);
  });
});
