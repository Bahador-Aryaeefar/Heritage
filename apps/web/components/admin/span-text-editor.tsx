'use client';

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { TextSpan } from '@heritage/shared-types';
import { editorHtmlRootToSpans, spansToEditorHtml } from '@/lib/editor-link-html';
import {
  insertNewlineAt,
  insertTextAt,
  linkRangeAt,
  marksAt,
  normalizeSpans,
  selectionUniformMark,
  serializeSpans,
  setLink,
  splitSpansAt,
  spansToPlainText,
  toggleMark,
  type SpanMarks,
  type TextSelection,
} from '@/lib/text-spans';

export type SpanFormatState = {
  boldActive: boolean;
  italicActive: boolean;
  linkActive: boolean;
  linkHref: string | null;
  selection: TextSelection | null;
};

export type SpanTextEditorProps = {
  value: TextSpan[];
  onChange: (spans: TextSpan[]) => void;
  className?: string;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
  onEnterSplit?: (parts: { before: TextSpan[]; after: TextSpan[] }) => void;
  onBackspaceAtStart?: () => void;
  onFocus?: () => void;
  onRequestLink?: () => void;
  onFormatStateChange?: (state: SpanFormatState) => void;
};

export type SpanTextEditorHandle = {
  focus: () => void;
  focusAtStart: () => void;
  focusAtEnd: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  openLink: () => void;
  getFormatState: () => SpanFormatState;
  applyLinkUrl: (url: string) => void;
  removeLink: () => void;
};

function isChromeTextNode(node: Node): boolean {
  let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    if ((current as Element).getAttribute('data-link-chrome') === '1') return true;
    current = current.parentNode;
  }
  return false;
}

function measureLogicalOffset(root: HTMLElement, container: Node, offset: number): number {
  const marker = document.createRange();
  marker.setStart(root, 0);
  try {
    marker.setEnd(container, offset);
  } catch {
    return spansToPlainText(editorHtmlRootToSpans(root)).length;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let node = walker.nextNode();
  while (node) {
    if (!isChromeTextNode(node)) {
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);
      if (marker.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0) break;
      if (marker.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0) {
        total += node.textContent?.length ?? 0;
      } else {
        const partial = document.createRange();
        partial.selectNodeContents(node);
        partial.setEnd(container, offset);
        total += partial.toString().length;
        break;
      }
    }
    node = walker.nextNode();
  }
  return total;
}

function getLogicalSelectionOffsets(root: HTMLElement): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  return {
    start: measureLogicalOffset(root, range.startContainer, range.startOffset),
    end: measureLogicalOffset(root, range.endContainer, range.endOffset),
  };
}

function isEmptySpans(spans: TextSpan[]): boolean {
  return (
    spans.length === 1 &&
    spans[0]!.text === '' &&
    !spans[0]!.bold &&
    !spans[0]!.italic &&
    !spans[0]!.href
  );
}

function placeCaret(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  let remaining = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (isChromeTextNode(node)) {
      node = walker.nextNode();
      continue;
    }
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

function hrefInRange(spans: TextSpan[], range: TextSelection | null): string | null {
  if (!range || range.start === range.end) return null;
  return marksAt(spans, range.start + 1).href ?? marksAt(spans, range.end).href ?? null;
}

function computeFormatState(
  spans: TextSpan[],
  selection: TextSelection | null,
  pending: Partial<{ bold: boolean; italic: boolean }>,
): SpanFormatState {
  const collapsed = !selection || selection.start === selection.end;
  const marks = selection ? marksAt(spans, selection.start) : {};

  const boldActive = collapsed
    ? (pending.bold ?? Boolean(marks.bold))
    : selectionUniformMark(spans, selection!, 'bold');
  const italicActive = collapsed
    ? (pending.italic ?? Boolean(marks.italic))
    : selectionUniformMark(spans, selection!, 'italic');

  const linkSel =
    selection && selection.start !== selection.end
      ? selection
      : selection
        ? linkRangeAt(spans, selection.start)
        : null;
  const linkHref = hrefInRange(spans, linkSel);

  return {
    boldActive: Boolean(boldActive),
    italicActive: Boolean(italicActive),
    linkActive: Boolean(linkHref),
    linkHref,
    selection,
  };
}

export const SpanTextEditor = forwardRef<SpanTextEditorHandle, SpanTextEditorProps>(
  function SpanTextEditor(
    {
      value,
      onChange,
      className = '',
      dir,
      placeholder,
      onEnterSplit,
      onBackspaceAtStart,
      onFocus,
      onRequestLink,
      onFormatStateChange,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastSpansRef = useRef<string | null>(null);
    const syncingRef = useRef(false);
    const pendingMarksRef = useRef<Partial<{ bold: boolean; italic: boolean }>>({});
    const valueRef = useRef(value);
    valueRef.current = value;

    useLayoutEffect(() => {
      const root = editorRef.current;
      if (!root || syncingRef.current) return;

      const signature = serializeSpans(value);
      if (signature === lastSpansRef.current) return;

      syncingRef.current = true;
      root.innerHTML = isEmptySpans(value) ? '' : spansToEditorHtml(normalizeSpans(value));
      lastSpansRef.current = signature;
      syncingRef.current = false;
    }, [value]);

    function emitFormatState(spans: TextSpan[], selection: TextSelection | null) {
      onFormatStateChange?.(computeFormatState(spans, selection, pendingMarksRef.current));
    }

    function emitFromDom() {
      const root = editorRef.current;
      if (!root || syncingRef.current) return;

      const spans = editorHtmlRootToSpans(root);
      lastSpansRef.current = serializeSpans(spans);
      onChange(spans);
      emitFormatState(spans, getLogicalSelectionOffsets(root));
    }

    function resolveLinkSelection(
      spans: TextSpan[],
      selection: TextSelection | null,
    ): TextSelection | null {
      if (selection && selection.start !== selection.end) return selection;
      const offset = selection?.start ?? 0;
      return linkRangeAt(spans, offset);
    }

    function toggleStickyOrRange(mark: 'bold' | 'italic') {
      const root = editorRef.current;
      if (!root) return;
      const selection = getLogicalSelectionOffsets(root);
      if (!selection) return;

      if (selection.start !== selection.end) {
        const next = toggleMark(valueRef.current, selection, mark);
        const nextPending = { ...pendingMarksRef.current };
        delete nextPending[mark];
        pendingMarksRef.current = nextPending;
        onChange(next);
        emitFormatState(next, selection);
        return;
      }

      const current =
        pendingMarksRef.current[mark] ?? Boolean(marksAt(valueRef.current, selection.start)[mark]);
      pendingMarksRef.current = { ...pendingMarksRef.current, [mark]: !current };
      emitFormatState(valueRef.current, selection);
    }

    function applyLink(url: string | null) {
      const root = editorRef.current;
      if (!root) return;
      const selection = getLogicalSelectionOffsets(root);
      const target = resolveLinkSelection(valueRef.current, selection);
      if (!target || target.start === target.end) return;
      const next = setLink(valueRef.current, target, url);
      onChange(next);
      emitFormatState(next, target);
    }

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
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
        placeCaret(root, spansToPlainText(valueRef.current).length);
      },
      toggleBold: () => toggleStickyOrRange('bold'),
      toggleItalic: () => toggleStickyOrRange('italic'),
      openLink: () => onRequestLink?.(),
      getFormatState: () => {
        const root = editorRef.current;
        const selection = root ? getLogicalSelectionOffsets(root) : null;
        return computeFormatState(valueRef.current, selection, pendingMarksRef.current);
      },
      applyLinkUrl: (url: string) => applyLink(url),
      removeLink: () => applyLink(null),
    }));

    function handleBeforeInput(event: React.FormEvent<HTMLDivElement>) {
      const inputEvent = event.nativeEvent as InputEvent;
      if (inputEvent.inputType !== 'insertText' || !inputEvent.data) return;

      const pending = pendingMarksRef.current;
      const hasPending = pending.bold !== undefined || pending.italic !== undefined;
      if (!hasPending) return;

      const root = editorRef.current;
      if (!root) return;
      const selection = getLogicalSelectionOffsets(root);
      if (!selection || selection.start !== selection.end) return;

      event.preventDefault();
      const baseMarks = marksAt(valueRef.current, selection.start);
      const marks: SpanMarks = { ...baseMarks };
      if (pending.bold !== undefined) {
        if (pending.bold) marks.bold = true;
        else delete marks.bold;
      }
      if (pending.italic !== undefined) {
        if (pending.italic) marks.italic = true;
        else delete marks.italic;
      }

      const next = insertTextAt(valueRef.current, selection.start, inputEvent.data, marks);
      onChange(next);
      const caret = selection.start + inputEvent.data.length;
      requestAnimationFrame(() => {
        placeCaret(root, caret);
        emitFormatState(next, { start: caret, end: caret });
      });
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      const root = editorRef.current;
      if (!root) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'b') {
          event.preventDefault();
          toggleStickyOrRange('bold');
          return;
        }
        if (key === 'i') {
          event.preventDefault();
          toggleStickyOrRange('italic');
          return;
        }
        if (key === 'k') {
          event.preventDefault();
          onRequestLink?.();
          return;
        }
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selection = getLogicalSelectionOffsets(root);
        const offset = selection?.start ?? spansToPlainText(valueRef.current).length;

        if (event.shiftKey) {
          onChange(insertNewlineAt(valueRef.current, offset));
          requestAnimationFrame(() => placeCaret(root, offset + 1));
          return;
        }

        if (onEnterSplit) {
          onEnterSplit(splitSpansAt(valueRef.current, offset));
          return;
        }

        onChange(insertNewlineAt(valueRef.current, offset));
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
        const selection = getLogicalSelectionOffsets(root);
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
        onFocus={() => {
          onFocus?.();
          const root = editorRef.current;
          emitFormatState(valueRef.current, root ? getLogicalSelectionOffsets(root) : null);
        }}
        onBeforeInput={handleBeforeInput}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          const root = editorRef.current;
          if (!root) return;
          emitFormatState(valueRef.current, getLogicalSelectionOffsets(root));
        }}
        onMouseUp={() => {
          const root = editorRef.current;
          if (!root) return;
          emitFormatState(valueRef.current, getLogicalSelectionOffsets(root));
        }}
        className={`min-h-[1.5em] w-full whitespace-pre-wrap break-words outline-none empty:before:pointer-events-none empty:before:text-brown-600/40 empty:before:content-[attr(data-placeholder)] ${className}`}
      />
    );
  },
);
