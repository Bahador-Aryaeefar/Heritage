import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SpanTextEditor } from './span-text-editor';

describe('SpanTextEditor', () => {
  it('sets dir on the contenteditable root for RTL content', () => {
    const { container } = render(
      <SpanTextEditor
        value={[{ text: 'سلام' }]}
        onChange={() => {}}
        dir="rtl"
        labels={{ linkPrompt: 'URL' }}
      />,
    );

    expect(container.querySelector('[contenteditable]')).toHaveAttribute('dir', 'rtl');
  });
});
