'use client';

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { TextSpan } from '@heritage/shared-types';
import {
  insertNewlineAt,
  normalizeSpans,
  serializeSpans,
  setLink,
  splitSpansAt,
  spansToPlainText,
  toggleMark,
  type TextSelection,
} from '@/lib/text-spans';

export type SpanTextEditorLabels = {
  linkPrompt: string;
};

export type SpanTextEditorProps = {
  value: TextSpan[];
  onChange: (spans: TextSpan[]) => void;
  className?: string;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
  labels: SpanTextEditorLabels;
  /** Enter (no Shift): split at caret. Used by list items. */
  onEnterSplit?: (parts: { before: TextSpan[]; after: TextSpan[] }) => void;
  /** Backspace at caret offset 0. Used by list items to merge/remove. */
  onBackspaceAtStart?: () => void;
  onFocus?: () => void;
};

export type SpanTextEditorHandle = {
  focus: () => void;
  focusAtStart: () => void;
  focusAtEnd: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  promptLink: () => void;
  unlink: () => void;
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function spanToHtml(span: TextSpan): string {
  let html = escapeHtml(span.text);
  if (span.bold) html = `<strong>${html}</strong>`;
  if (span.italic) html = `<em>${html}</em>`;
  if (span.href) html = `<a href="${escapeAttr(span.href)}">${html}</a>`;
  return html;
}

function spansToHtml(spans: TextSpan[]): string {
  return spans.map(spanToHtml).join('');
}

function collectMarks(element: Element, inherited: Partial<TextSpan>): Partial<TextSpan> {
  const marks: Partial<TextSpan> = { ...inherited };
  const tag = element.tagName;

  if (tag === 'STRONG' || tag === 'B') marks.bold = true;
  if (tag === 'EM' || tag === 'I') marks.italic = true;
  if (tag === 'A') {
    const href = element.getAttribute('href')?.trim();
    if (href) marks.href = href;
  }

  return marks;
}

function domToSpans(root: HTMLElement): TextSpan[] {
  const spans: TextSpan[] = [];

  function walk(node: Node, inherited: Partial<TextSpan>): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text) return;
      const span: TextSpan = { text };
      if (inherited.bold) span.bold = true;
      if (inherited.italic) span.italic = true;
      if (inherited.href) span.href = inherited.href;
      spans.push(span);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.tagName === 'BR') {
      spans.push({ text: '\n', ...(inherited.bold ? { bold: true } : {}), ...(inherited.italic ? { italic: true } : {}), ...(inherited.href ? { href: inherited.href } : {}) });
      return;
    }

    const marks = collectMarks(element, inherited);
    for (const child of element.childNodes) {
      walk(child, marks);
    }
  }

  for (const child of root.childNodes) {
    walk(child, {});
  }

  return normalizeSpans(spans.length > 0 ? spans : [{ text: '' }]);
}

function getSelectionOffsets(root: HTMLElement): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const startRange = range.cloneRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: startRange.toString().length,
    end: endRange.toString().length,
  };
}

function isEmptySpans(spans: TextSpan[]): boolean {
  return spans.length === 1 && spans[0]!.text === '' && !spans[0]!.bold && !spans[0]!.italic && !spans[0]!.href;
}

function placeCaret(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  let remaining = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export const SpanTextEditor = forwardRef<SpanTextEditorHandle, SpanTextEditorProps>(
  function SpanTextEditor(
    {
      value,
      onChange,
      className = '',
      dir,
      placeholder,
      labels,
      onEnterSplit,
      onBackspaceAtStart,
      onFocus,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    // Start as null so the first layout effect always paints `value` into the empty
    // contentEditable (initializing to serializeSpans(value) skipped that sync and hid text).
    const lastSpansRef = useRef<string | null>(null);
    const syncingRef = useRef(false);

    useLayoutEffect(() => {
      const root = editorRef.current;
      if (!root || syncingRef.current) return;

      const signature = serializeSpans(value);
      if (signature === lastSpansRef.current) return;

      syncingRef.current = true;
      root.innerHTML = isEmptySpans(value) ? '' : spansToHtml(normalizeSpans(value));
      lastSpansRef.current = signature;
      syncingRef.current = false;
    }, [value]);

    function emitFromDom() {
      const root = editorRef.current;
      if (!root || syncingRef.current) return;

      const spans = domToSpans(root);
      lastSpansRef.current = serializeSpans(spans);
      onChange(spans);
    }

    function applyFormat(action: (spans: TextSpan[], selection: TextSelection) => TextSpan[]) {
      const root = editorRef.current;
      if (!root) return;

      const selection = getSelectionOffsets(root);
      if (!selection) return;

      const next = action(value, selection);
      onChange(next);
    }

    useImperativeHandle(ref, () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      focusAtStart: () => {
        const root = editorRef.current;
        if (!root) return;
        root.focus();
        placeCaret(root, 0);
      },
      focusAtEnd: () => {
        const root = editorRef.current;
        if (!root) return;
        root.focus();
        placeCaret(root, spansToPlainText(value).length);
      },
      toggleBold: () => {
        applyFormat((spans, selection) => toggleMark(spans, selection, 'bold'));
      },
      toggleItalic: () => {
        applyFormat((spans, selection) => toggleMark(spans, selection, 'italic'));
      },
      promptLink: () => {
        const href = window.prompt(labels.linkPrompt);
        if (href === null) return;
        applyFormat((spans, selection) => setLink(spans, selection, href));
      },
      unlink: () => {
        applyFormat((spans, selection) => setLink(spans, selection, null));
      },
    }));

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      const root = editorRef.current;
      if (!root) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        const selection = getSelectionOffsets(root);
        const offset = selection?.start ?? spansToPlainText(value).length;

        if (event.shiftKey) {
          onChange(insertNewlineAt(value, offset));
          requestAnimationFrame(() => placeCaret(root, offset + 1));
          return;
        }

        if (onEnterSplit) {
          onEnterSplit(splitSpansAt(value, offset));
          return;
        }

        onChange(insertNewlineAt(value, offset));
        requestAnimationFrame(() => placeCaret(root, offset + 1));
        return;
      }

      if (
        event.key === 'Backspace' &&
        onBackspaceAtStart &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const selection = getSelectionOffsets(root);
        if (selection && selection.start === 0 && selection.end === 0) {
          event.preventDefault();
          onBackspaceAtStart();
        }
      }
    }

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dir={dir}
        data-placeholder={placeholder}
        onInput={() => emitFromDom()}
        onBlur={() => emitFromDom()}
        onFocus={() => onFocus?.()}
        onKeyDown={handleKeyDown}
        className={`min-h-[1.5em] w-full whitespace-pre-wrap break-words outline-none empty:before:pointer-events-none empty:before:text-brown-600/40 empty:before:content-[attr(data-placeholder)] ${className}`}
      />
    );
  },
);
