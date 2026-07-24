import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinkPopover } from './link-popover';
import { SpanTextEditor, type SpanTextEditorHandle } from './span-text-editor';

afterEach(() => cleanup());

describe('link apply flow', () => {
  it('applies href after selection is snapshotted then cleared (popover focus)', () => {
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
    // Simulate focusing the URL field: selection leaves the editor.
    window.getSelection()?.removeAllRanges();
    expect(ref.current!.applyLinkUrl('https://example.com')).toBe(true);

    expect(onChange).toHaveBeenCalledWith([
      { text: 'Hello', href: 'https://example.com' },
    ]);
  });

  it('keeps a range snapshot when a later collapsed snapshot tries to overwrite it', () => {
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
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    ref.current!.snapshotSelection();

    // Collapsed caret (what toolbar click can leave behind).
    const caret = document.createRange();
    caret.setStart(textNode, 5);
    caret.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(caret);
    ref.current!.openLink();

    expect(ref.current!.applyLinkUrl('https://example.com')).toBe(true);
    expect(onChange).toHaveBeenCalledWith([
      { text: 'Hello', href: 'https://example.com' },
    ]);
  });

  it('LinkPopover Apply calls onApply for https URLs', () => {
    const onApply = vi.fn(() => true);
    render(
      <LinkPopover
        open
        initialUrl=""
        canRemove={false}
        labels={{ url: 'URL', apply: 'Apply', remove: 'Remove' }}
        onApply={onApply}
        onRemove={() => {}}
        onClose={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('https://example.com');
  });

  it('LinkPopover normalizes bare domains and Applies', () => {
    const onApply = vi.fn(() => true);
    render(
      <LinkPopover
        open
        initialUrl=""
        canRemove={false}
        labels={{
          url: 'URL',
          apply: 'Apply',
          remove: 'Remove',
          invalidUrl: 'bad',
        }}
        onApply={onApply}
        onRemove={() => {}}
        onClose={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('https://example.com');
  });

  it('LinkPopover Enter Applies without relying on form submit', () => {
    const onApply = vi.fn(() => true);
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply('FORM_SUBMIT');
        }}
      >
        <LinkPopover
          open
          initialUrl=""
          canRemove={false}
          labels={{ url: 'URL', apply: 'Apply', remove: 'Remove' }}
          onApply={onApply}
          onRemove={() => {}}
          onClose={() => {}}
        />
      </form>,
    );

    const input = screen.getByLabelText('URL');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onApply).toHaveBeenCalledWith('https://example.com');
    expect(onApply).not.toHaveBeenCalledWith('FORM_SUBMIT');
  });
});
