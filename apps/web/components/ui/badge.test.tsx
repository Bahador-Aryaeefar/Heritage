import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>میراث کرمانشاه</Badge>);
    expect(screen.getByText('میراث کرمانشاه')).toBeInTheDocument();
  });
});
