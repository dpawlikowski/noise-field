import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

// The demo shell drives worklet registration through ../register. We stub it so
// the component can mount without a real CSS Paint API and so we control the
// "ready" / "native vs polyfill" states the header reacts to.
const registerAll = vi.fn<() => Promise<void>>();
const isNativeHoudini = vi.fn<() => boolean>();

vi.mock('../register', () => ({
  registerAll: () => registerAll(),
  isNativeHoudini: () => isNativeHoudini(),
}));

import App from '../demo/App';
import { workletConfigs } from '../demo/workletConfigs';

afterEach(cleanup);

beforeEach(() => {
  registerAll.mockReset().mockResolvedValue(undefined);
  isNativeHoudini.mockReset().mockReturnValue(false);
});

describe('<App> (noise-field demo)', () => {
  it('shows the registering placeholder until worklets are ready', () => {
    // Keep registration pending so we observe the loading state.
    registerAll.mockReturnValue(new Promise<void>(() => {}));
    render(<App />);
    expect(screen.getByText('Registering worklets…')).toBeInTheDocument();
  });

  it('renders one card per worklet config once registration resolves', async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.queryByText('Registering worklets…')).not.toBeInTheDocument(),
    );
    for (const config of workletConfigs) {
      expect(screen.getByRole('heading', { name: config.title })).toBeInTheDocument();
    }
  });

  it('flags polyfill mode when Houdini is not native', async () => {
    isNativeHoudini.mockReturnValue(false);
    render(<App />);
    expect(await screen.findByText('⬡ Polyfill mode')).toBeInTheDocument();
  });

  it('flags native Houdini when the browser supports it', async () => {
    isNativeHoudini.mockReturnValue(true);
    render(<App />);
    expect(await screen.findByText('⬡ Native Houdini')).toBeInTheDocument();
  });
});
