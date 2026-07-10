import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { WorkletCard } from '../demo/WorkletCard';
import { workletConfigs } from '../demo/workletConfigs';

const config = workletConfigs.find((c) => c.name === 'noise-field')!;

afterEach(cleanup);

describe('<WorkletCard>', () => {
  it('renders the worklet title and description', () => {
    render(<WorkletCard config={config} />);
    expect(screen.getByRole('heading', { name: config.title })).toBeInTheDocument();
    expect(screen.getByText(config.description)).toBeInTheDocument();
  });

  it('renders one range slider per configurable prop', () => {
    render(<WorkletCard config={config} />);
    expect(screen.getAllByRole('slider')).toHaveLength(config.props.length);
  });

  it('updates the displayed value when a slider moves', () => {
    render(<WorkletCard config={config} />);
    const [hue] = config.props;
    const slider = screen.getAllByRole('slider')[0];

    fireEvent.change(slider, { target: { value: String(hue.max) } });

    // The label shows the live value next to the control.
    expect(screen.getByText(String(hue.max))).toBeInTheDocument();
  });

  it('toggles the source block via the View source button', () => {
    render(<WorkletCard config={config} />);
    const toggle = screen.getByRole('button', { name: 'View source' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Hide source' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/background: paint\(noise-field\)/)).toBeInTheDocument();
  });

  describe('copy CSS', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it('writes the generated CSS to the clipboard and confirms', async () => {
      render(<WorkletCard config={config} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy CSS' }));

      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
      const written = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(written).toContain('background: paint(noise-field);');
      expect(await screen.findByText('✓ Copied')).toBeInTheDocument();
    });
  });
});
