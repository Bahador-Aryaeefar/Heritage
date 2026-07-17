import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealOnScroll } from '@/components/public/reveal-on-scroll';

describe('RevealOnScroll', () => {
  it('renders children with reveal class', () => {
    render(
      <RevealOnScroll>
        <p>Visible section</p>
      </RevealOnScroll>,
    );

    expect(screen.getByText('Visible section')).toBeInTheDocument();
    expect(screen.getByText('Visible section').parentElement).toHaveClass('reveal-on-scroll');
  });
});
