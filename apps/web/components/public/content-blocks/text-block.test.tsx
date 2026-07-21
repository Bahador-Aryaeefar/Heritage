import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextBlock } from './text-block';

describe('TextBlock', () => {
  it('renders bold and italic spans with color token classes', () => {
    render(
      <TextBlock
        type="PARAGRAPH"
        textRole="BODY"
        colorToken="TEAL_700"
        align="START"
        spans={[
          { text: 'Plain ' },
          { text: 'bold', bold: true },
          { text: ' and ' },
          { text: 'italic', italic: true },
        ]}
      />,
    );

    const paragraph = screen.getByText(/Plain/).closest('p');
    expect(paragraph).toHaveClass('text-teal-700');
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('italic').tagName).toBe('EM');
  });

  it('renders href spans as teal links after bold/italic wrappers', () => {
    render(
      <TextBlock
        type="PARAGRAPH"
        textRole="BODY"
        colorToken="BROWN_800"
        align="START"
        spans={[
          { text: 'Visit ', bold: true, href: 'https://example.com' },
          { text: 'plain' },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'Visit' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveClass('font-bold', 'text-teal-700', 'hover:text-teal-500');
    expect(link.querySelector('strong')).not.toBeNull();
  });

  it('applies text-end for END align', () => {
    render(
      <TextBlock
        type="HEADING"
        textRole="H2"
        colorToken="BROWN_950"
        align="END"
        spans={[{ text: 'Aligned' }]}
      />,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('text-end');
  });
});
