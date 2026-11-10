import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SectionCard } from './SectionCard';

describe('SectionCard', () => {
  it('is a region named by its heading', () => {
    render(<SectionCard title="On This Day">content</SectionCard>);

    const region = screen.getByRole('region', { name: 'On This Day' });
    expect(within(region).getByRole('heading', { level: 2, name: 'On This Day' })).toBeVisible();
  });

  it('shows a subtitle and a header action in every state', () => {
    const { rerender } = render(
      <SectionCard title="Weather" subtitle="Fene, Galicia, Spain" action={<button>°C</button>}>
        Sunny
      </SectionCard>,
    );
    const region = screen.getByRole('region', { name: 'Weather' });
    expect(within(region).getByText('Fene, Galicia, Spain')).toBeVisible();
    expect(within(region).getByRole('button', { name: '°C' })).toBeVisible();

    rerender(
      <SectionCard title="Weather" subtitle="Fene" action={<button>°C</button>} isLoading>
        Sunny
      </SectionCard>,
    );
    expect(screen.getByText('Fene')).toBeVisible();
    expect(screen.getByRole('button', { name: '°C' })).toBeVisible();
  });

  it('shows its content when nothing else is going on', () => {
    render(<SectionCard title="Weather">Sunny</SectionCard>);

    expect(screen.getByText('Sunny')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a labelled loading state instead of content', () => {
    render(
      <SectionCard title="Weather" isLoading>
        Sunny
      </SectionCard>,
    );

    expect(screen.getByRole('status', { name: 'Loading Weather' })).toBeInTheDocument();
    expect(screen.queryByText('Sunny')).not.toBeInTheDocument();
  });

  it('shows an error with a working Retry button instead of content', async () => {
    const onRetry = vi.fn();
    render(
      <SectionCard title="Weather" error={{ message: 'The service is having problems.', onRetry }}>
        Sunny
      </SectionCard>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The service is having problems.');
    expect(screen.queryByText('Sunny')).not.toBeInTheDocument();

    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows an empty message instead of content', () => {
    render(
      <SectionCard title="Weather" emptyMessage="No weather data for this date.">
        Sunny
      </SectionCard>,
    );

    expect(screen.getByText('No weather data for this date.')).toBeVisible();
    expect(screen.queryByText('Sunny')).not.toBeInTheDocument();
  });

  it('prefers loading over a stale error, and an error over empty', () => {
    const error = { message: 'Broken.', onRetry: () => {} };
    const { rerender } = render(
      <SectionCard title="Weather" isLoading error={error} emptyMessage="Nothing.">
        Sunny
      </SectionCard>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <SectionCard title="Weather" error={error} emptyMessage="Nothing.">
        Sunny
      </SectionCard>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Nothing.')).not.toBeInTheDocument();
  });
});
