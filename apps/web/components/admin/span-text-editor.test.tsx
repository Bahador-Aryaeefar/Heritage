import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { SpanTextEditor, type SpanTextEditorHandle } from './span-text-editor';

describe('SpanTextEditor', () => {
  it('sets dir on the contenteditable root for RTL content', () => {
    const { container } = render(
      <SpanTextEditor value={[{ text: 'سلام' }]} onChange={() => {}} dir="rtl" />,
    );

    expect(container.querySelector('[contenteditable]')).toHaveAttribute('dir', 'rtl');
  });

  it('paints initial spans into the contenteditable on mount', () => {
    const { container } = render(
      <SpanTextEditor
        value={[{ text: 'طاق بستان' }, { text: 'ساسانی', bold: true }]}
        onChange={() => {}}
      />,
    );

    const root = container.querySelector('[contenteditable]');
    expect(root).toHaveTextContent('طاق بستانساسانی');
    expect(root?.querySelector('strong')).toHaveTextContent('ساسانی');
  });

  it('renders markdown chrome for linked spans in the editor', () => {
    const { container } = render(
      <SpanTextEditor
        value={[{ text: 'Museum', href: 'https://x.test' }]}
        onChange={() => {}}
      />,
    );

    const root = container.querySelector('[contenteditable]');
    expect(root?.querySelector('[data-editor-href="https://x.test"]')).toBeTruthy();
    expect(root?.textContent).toContain('[Museum](https://x.test)');
  });

  it('lets click events bubble so the canvas can select the block', () => {
    const onOuterClick = vi.fn();
    const { container } = render(
      <div onClick={onOuterClick}>
        <SpanTextEditor value={[{ text: 'پاراگراف' }]} onChange={() => {}} />
      </div>,
    );

    const root = container.querySelector('[contenteditable]');
    expect(root).toBeTruthy();
    root!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOuterClick).toHaveBeenCalledTimes(1);
  });

  it('exposes applyLinkUrl without using window.prompt', () => {
    const promptSpy = vi.spyOn(window, 'prompt');
    const ref = createRef<SpanTextEditorHandle>();
    render(
      <SpanTextEditor
        ref={ref}
        value={[{ text: 'Hello' }]}
        onChange={() => {}}
      />,
    );

    expect(typeof ref.current?.applyLinkUrl).toBe('function');
    expect(typeof ref.current?.openLink).toBe('function');
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });
});
