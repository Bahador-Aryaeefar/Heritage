import { describe, expect, it, vi } from 'vitest';
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

  it('paints initial spans into the contenteditable on mount', () => {
    const { container } = render(
      <SpanTextEditor
        value={[{ text: 'طاق بستان' }, { text: 'ساسانی', bold: true }]}
        onChange={() => {}}
        labels={{ linkPrompt: 'URL' }}
      />,
    );

    const root = container.querySelector('[contenteditable]');
    expect(root).toHaveTextContent('طاق بستانساسانی');
    expect(root?.querySelector('strong')).toHaveTextContent('ساسانی');
  });

  it('lets click events bubble so the canvas can select the block', () => {
    const onOuterClick = vi.fn();
    const { container } = render(
      <div onClick={onOuterClick}>
        <SpanTextEditor
          value={[{ text: 'پاراگراف' }]}
          onChange={() => {}}
          labels={{ linkPrompt: 'URL' }}
        />
      </div>,
    );

    const root = container.querySelector('[contenteditable]');
    expect(root).toBeTruthy();
    root!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOuterClick).toHaveBeenCalledTimes(1);
  });
});
