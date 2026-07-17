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
});
