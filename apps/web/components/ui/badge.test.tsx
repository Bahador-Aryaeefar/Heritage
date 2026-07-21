import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>شهرنما</Badge>);
    expect(screen.getByText('شهرنما')).toBeInTheDocument();
  });

  it('keeps the same size classes for muted tone', () => {
    const { container } = render(<Badge tone="muted">Inactive</Badge>);
    const el = container.firstElementChild;
    expect(el?.className).toContain('px-3');
    expect(el?.className).toContain('py-1');
    expect(el?.className).toContain('text-xs');
    expect(el?.className).toContain('bg-brown-800/10');
  });
});
