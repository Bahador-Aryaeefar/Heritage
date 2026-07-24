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

  it('renders teal anchors for linked spans in the editor', () => {
    const { container } = render(
      <SpanTextEditor
        value={[{ text: 'Museum', href: 'https://x.test' }]}
        onChange={() => {}}
      />,
    );

    const root = container.querySelector('[contenteditable]');
    const link = root?.querySelector('a[href="https://x.test"]');
    expect(link).toBeTruthy();
    expect(link).toHaveTextContent('Museum');
    expect(root?.textContent).toBe('Museum');
  });

  it('paints a draft highlight while linkDraftRange is set', () => {
    const { container } = render(
      <SpanTextEditor
        value={[{ text: 'Hello' }]}
        onChange={() => {}}
        linkDraftRange={{ start: 0, end: 5 }}
      />,
    );

    const root = container.querySelector('[contenteditable]');
    expect(root?.querySelector('[data-link-draft="1"]')).toBeTruthy();
    expect(root?.textContent).toBe('Hello');
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

  it('openLink asks the parent to show the popover', () => {
    const onRequestLink = vi.fn();
    const ref = createRef<SpanTextEditorHandle>();
    render(
      <SpanTextEditor
        ref={ref}
        value={[{ text: 'Hello' }]}
        onChange={() => {}}
        onRequestLink={onRequestLink}
      />,
    );

    ref.current!.openLink();
    expect(onRequestLink).toHaveBeenCalledTimes(1);
  });

  it('toggles sticky bold when the editor has no live selection yet', () => {
    const execCommand = vi.fn(() => true);
    const queryCommandState = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(document, 'queryCommandState', {
      configurable: true,
      value: queryCommandState,
    });

    const onFormatStateChange = vi.fn();
    const ref = createRef<SpanTextEditorHandle>();
    render(
      <SpanTextEditor
        ref={ref}
        value={[{ text: 'Hi' }]}
        onChange={() => {}}
        onFormatStateChange={onFormatStateChange}
      />,
    );

    window.getSelection()?.removeAllRanges();
    ref.current!.toggleBold();

    expect(execCommand).toHaveBeenCalledWith('bold', false);
    const last = onFormatStateChange.mock.calls.at(-1)?.[0] as { boldActive: boolean };
    expect(last.boldActive).toBe(true);
  });

  it('applies bold to a selected range via the span model', () => {
    const onChange = vi.fn();
    const ref = createRef<SpanTextEditorHandle>();
    const { container } = render(
      <SpanTextEditor ref={ref} value={[{ text: 'Hello' }]} onChange={onChange} />,
    );

    const root = container.querySelector('[contenteditable]') as HTMLElement;
    root.focus();
    const textNode = root.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    ref.current!.snapshotSelection();
    ref.current!.toggleBold();

    expect(onChange).toHaveBeenCalledWith([{ text: 'Hello', bold: true }]);
  });
});
