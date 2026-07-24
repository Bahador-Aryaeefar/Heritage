'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { TextSpan } from '@heritage/shared-types';
import { editorHtmlRootToSpans, spansToEditorHtml } from '@/lib/editor-link-html';
import {
  insertNewlineAt,
  linkRangeAt,
  marksAt,
  normalizeSpans,
  selectionUniformMark,
  serializeSpans,
  setLink,
  splitSpansAt,
  spansToPlainText,
  toggleMark,
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
  /** While the link popover is open, paint a draft highlight over this range. */
  linkDraftRange?: TextSelection | null;
};

export type SpanTextEditorHandle = {
  focus: () => void;
  focusAtStart: () => void;
  focusAtEnd: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  openLink: () => void;
  /** Capture the current logical selection (call from toolbar mousedown). */
  snapshotSelection: () => void;
  /** Selection to highlight / link (range, or full linked run under caret). */
  getLinkTargetRange: () => TextSelection | null;
  getFormatState: () => SpanFormatState;
  applyLinkUrl: (url: string) => boolean;
  removeLink: () => boolean;
};

function isChromeTextNode(node: Node): boolean {
  let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    if ((current as Element).getAttribute('data-link-chrome') === '1') return true;
    current = current.parentNode;
  }
  return false;
}

function clearLinkDraftHighlights(root: HTMLElement) {
  root.querySelectorAll('[data-link-draft="1"]').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  });
}

function paintLinkDraftHighlight(root: HTMLElement, selection: TextSelection) {
  clearLinkDraftHighlights(root);
  if (selection.start === selection.end) return;

  const startPoint = pointAtLogicalOffset(root, Math.min(selection.start, selection.end));
  const endPoint = pointAtLogicalOffset(root, Math.max(selection.start, selection.end));
  if (!startPoint || !endPoint) return;

  const range = document.createRange();
  try {
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
  } catch {
    return;
  }

  const mark = document.createElement('span');
  mark.setAttribute('data-link-draft', '1');
  mark.className = 'rounded-sm bg-teal-200/70';
  try {
    range.surroundContents(mark);
  } catch {
    try {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    } catch {
      /* ignore unstable ranges */
    }
  }
}

function measureLogicalOffset(root: HTMLElement, container: Node, offset: number): number {
  if (container === root) {
    // Caret in empty editor or at element-child boundary: count logical text in prior children.
    let total = 0;
    const limit = Math.min(offset, root.childNodes.length);
    for (let i = 0; i < limit; i += 1) {
      const child = root.childNodes[i]!;
      total += logicalTextLength(child);
    }
    return total;
  }

  // Prefer walking text nodes. Avoid Range.compareBoundaryPoints - jsdom reports
  // wrong values and collapses every selection to {0,0}.
  if (container.nodeType === Node.TEXT_NODE) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let total = 0;
    let node = walker.nextNode();
    while (node) {
      if (!isChromeTextNode(node)) {
        const length = node.textContent?.length ?? 0;
        if (node === container) {
          return total + Math.max(0, Math.min(offset, length));
        }
        total += length;
      }
      node = walker.nextNode();
    }
    return total;
  }

  if (container.nodeType === Node.ELEMENT_NODE) {
    const el = container as Element;
    let total = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (!isChromeTextNode(node)) {
        if (el.contains(node)) break;
        const position = el.compareDocumentPosition(node);
        if (position & Node.DOCUMENT_POSITION_PRECEDING) {
          total += node.textContent?.length ?? 0;
        } else {
          break;
        }
      }
      node = walker.nextNode();
    }
    const limit = Math.min(offset, el.childNodes.length);
    for (let i = 0; i < limit; i += 1) {
      total += logicalTextLength(el.childNodes[i]!);
    }
    return total;
  }

  return spansToPlainText(editorHtmlRootToSpans(root)).length;
}

function logicalTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return isChromeTextNode(node) ? 0 : (node.textContent?.length ?? 0);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;
  if ((node as Element).getAttribute('data-link-chrome') === '1') return 0;
  let total = 0;
  for (const child of node.childNodes) total += logicalTextLength(child);
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
  selectLogicalRange(root, offset, offset);
}

function selectLogicalRange(root: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const startPoint = pointAtLogicalOffset(root, Math.min(start, end));
  const endPoint = pointAtLogicalOffset(root, Math.max(start, end));
  if (!startPoint || !endPoint) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function pointAtLogicalOffset(
  root: HTMLElement,
  offset: number,
): { node: Node; offset: number } | null {
  let remaining = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let last: { node: Node; offset: number } | null = null;

  while (node) {
    if (!isChromeTextNode(node)) {
      const length = node.textContent?.length ?? 0;
      last = { node, offset: length };
      if (remaining <= length) {
        return { node, offset: remaining };
      }
      remaining -= length;
    }
    node = walker.nextNode();
  }

  return last;
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
      linkDraftRange = null,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastSpansRef = useRef<string | null>(null);
    const syncingRef = useRef(false);
    const pendingMarksRef = useRef<Partial<{ bold: boolean; italic: boolean }>>({});
    const savedSelectionRef = useRef<TextSelection | null>(null);
    const valueRef = useRef(value);
    valueRef.current = value;
    const [linkOpenModifier, setLinkOpenModifier] = useState(false);

    useEffect(() => {
      function syncModifier(event: KeyboardEvent | MouseEvent) {
        setLinkOpenModifier(event.ctrlKey || event.metaKey);
      }
      function clearModifier() {
        setLinkOpenModifier(false);
      }
      window.addEventListener('keydown', syncModifier);
      window.addEventListener('keyup', syncModifier);
      window.addEventListener('blur', clearModifier);
      return () => {
        window.removeEventListener('keydown', syncModifier);
        window.removeEventListener('keyup', syncModifier);
        window.removeEventListener('blur', clearModifier);
      };
    }, []);

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

    useLayoutEffect(() => {
      const root = editorRef.current;
      if (!root) return;
      if (linkDraftRange && linkDraftRange.start !== linkDraftRange.end) {
        paintLinkDraftHighlight(root, linkDraftRange);
      } else {
        clearLinkDraftHighlights(root);
      }
    }, [value, linkDraftRange]);

    function emitFormatState(spans: TextSpan[], selection: TextSelection | null) {
      onFormatStateChange?.(computeFormatState(spans, selection, pendingMarksRef.current));
    }

    function syncPendingFromDom() {
      const root = editorRef.current;
      if (!root || document.activeElement !== root) return;
      try {
        pendingMarksRef.current = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
        };
      } catch {
        /* jsdom / unsupported */
      }
    }

    function emitFromDom() {
      const root = editorRef.current;
      if (!root || syncingRef.current) return;

      const spans = editorHtmlRootToSpans(root);
      const signature = serializeSpans(spans);
      if (signature !== lastSpansRef.current) {
        lastSpansRef.current = signature;
        onChange(spans);
      }
      syncPendingFromDom();
      emitFormatState(spans, getLogicalSelectionOffsets(root) ?? savedSelectionRef.current);
    }

    /** Prefer live selection; if focus left the editor, fall back to a caret at end. */
    function ensureSelection(): TextSelection {
      const root = editorRef.current!;
      const live = getLogicalSelectionOffsets(root);
      if (live) {
        savedSelectionRef.current = live;
        return live;
      }

      root.focus();
      const len = spansToPlainText(valueRef.current).length;
      const fallback = { start: len, end: len };
      placeCaret(root, len);
      savedSelectionRef.current = fallback;
      return fallback;
    }

    /**
     * Resolve selection for toolbar / shortcut format actions.
     * Prefer a non-collapsed range (live or snapshotted) so Apply / Bold still
     * work after focus moved to the link popover or format chips.
     */
    function selectionForFormatAction(): TextSelection {
      const root = editorRef.current!;
      const saved = savedSelectionRef.current;
      restoreSavedSelectionIntoDom();
      const live = getLogicalSelectionOffsets(root);
      if (live && live.start !== live.end) {
        savedSelectionRef.current = live;
        return live;
      }
      if (saved && saved.start !== saved.end) {
        selectLogicalRange(root, saved.start, saved.end);
        savedSelectionRef.current = saved;
        return saved;
      }
      if (live) {
        savedSelectionRef.current = live;
        return live;
      }
      if (saved) {
        selectLogicalRange(root, saved.start, saved.end);
        return saved;
      }
      return ensureSelection();
    }

    function resolveLinkSelection(
      spans: TextSpan[],
      selection: TextSelection | null,
    ): TextSelection | null {
      if (selection && selection.start !== selection.end) return selection;
      const offset = selection?.start ?? 0;
      return linkRangeAt(spans, offset);
    }

    function snapshotSelection() {
      const root = editorRef.current;
      if (!root) return;
      const live = getLogicalSelectionOffsets(root);
      if (live) {
        // Toolbar chip mousedown snapshots the range, then click can collapse the
        // live DOM selection. Do not overwrite a non-collapsed snapshot with a caret.
        const saved = savedSelectionRef.current;
        if (live.start === live.end && saved && saved.start !== saved.end) {
          return;
        }
        savedSelectionRef.current = live;
        return;
      }
      if (!savedSelectionRef.current) {
        ensureSelection();
      }
    }

    function restoreSavedSelectionIntoDom() {
      const root = editorRef.current;
      if (!root) return;
      root.focus();
      const saved = savedSelectionRef.current;
      if (saved) {
        selectLogicalRange(root, saved.start, saved.end);
      } else {
        ensureSelection();
      }
    }

    /**
     * Range selections use our span model (reliable round-trip through React).
     * Collapsed caret uses execCommand so the browser keeps sticky typing state.
     */
    function toggleStickyOrRange(mark: 'bold' | 'italic') {
      const root = editorRef.current;
      if (!root) return;

      const selection = selectionForFormatAction();
      savedSelectionRef.current = selection;

      if (selection.start !== selection.end) {
        const next = toggleMark(valueRef.current, selection, mark);
        pendingMarksRef.current = {
          ...pendingMarksRef.current,
          [mark]: selectionUniformMark(next, selection, mark),
        };
        onChange(next);
        emitFormatState(next, selection);
        requestAnimationFrame(() => {
          root.focus();
          selectLogicalRange(root, selection.start, selection.end);
        });
        return;
      }

      const cmd = mark === 'bold' ? 'bold' : 'italic';
      try {
        document.execCommand(cmd, false);
      } catch {
        /* jsdom */
      }
      syncPendingFromDom();
      if (pendingMarksRef.current[mark] === undefined) {
        pendingMarksRef.current = {
          ...pendingMarksRef.current,
          [mark]: !Boolean(marksAt(valueRef.current, selection.start)[mark]),
        };
      }
      emitFromDom();
      emitFormatState(editorHtmlRootToSpans(root), selection);
    }

    function applyLink(url: string | null): boolean {
      const root = editorRef.current;
      if (!root) return false;

      const selection = selectionForFormatAction();
      const target = resolveLinkSelection(valueRef.current, selection);
      if (!target || target.start === target.end) return false;

      const next = setLink(valueRef.current, target, url);
      onChange(next);
      savedSelectionRef.current = target;
      emitFormatState(next, target);
      requestAnimationFrame(() => {
        root.focus();
        selectLogicalRange(root, target.start, target.end);
      });
      return true;
    }

    function linkTargetFromSaved(): TextSelection | null {
      return resolveLinkSelection(valueRef.current, savedSelectionRef.current);
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
      snapshotSelection: () => snapshotSelection(),
      getLinkTargetRange: () => linkTargetFromSaved(),
      openLink: () => {
        snapshotSelection();
        const target = linkTargetFromSaved();
        if (target) {
          savedSelectionRef.current = target;
          const root = editorRef.current;
          if (root) {
            root.focus();
            selectLogicalRange(root, target.start, target.end);
          }
        }
        onRequestLink?.();
      },
      getFormatState: () => {
        const root = editorRef.current;
        const selection =
          (root ? getLogicalSelectionOffsets(root) : null) ?? savedSelectionRef.current;
        // Prefer live queryCommandState when focused so sticky marks match the browser.
        const pending = { ...pendingMarksRef.current };
        if (root && document.activeElement === root) {
          try {
            pending.bold = document.queryCommandState('bold');
            pending.italic = document.queryCommandState('italic');
          } catch {
            /* ignore */
          }
        }
        return computeFormatState(valueRef.current, selection, pending);
      },
      applyLinkUrl: (url: string) => applyLink(url),
      removeLink: () => applyLink(null),
    }));

    function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
      const root = editorRef.current;
      if (!root) return;
      const targetEl = event.target as HTMLElement | null;
      const anchor = targetEl?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || !root.contains(anchor)) return;

      event.preventDefault();

      const href = anchor.getAttribute('href');
      if ((event.metaKey || event.ctrlKey) && href) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      const range = document.createRange();
      range.selectNodeContents(anchor);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      snapshotSelection();
      const target = linkTargetFromSaved();
      if (target) {
        savedSelectionRef.current = target;
        selectLogicalRange(root, target.start, target.end);
      }
      onRequestLink?.();
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
          const live = getLogicalSelectionOffsets(root);
          if (live) savedSelectionRef.current = live;
          else savedSelectionRef.current = ensureSelection();
          const target = linkTargetFromSaved();
          if (target) {
            savedSelectionRef.current = target;
            selectLogicalRange(root, target.start, target.end);
          }
          onRequestLink?.();
          return;
        }
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selection = getLogicalSelectionOffsets(root) ?? ensureSelection();
        const offset = selection.start;

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
        onClick={handleEditorClick}
        onMouseMove={(event) => {
          setLinkOpenModifier(event.ctrlKey || event.metaKey);
        }}
        onMouseLeave={() => setLinkOpenModifier(false)}
        data-link-mod={linkOpenModifier ? '1' : undefined}
        onFocus={() => {
          onFocus?.();
          const root = editorRef.current;
          const selection = root ? getLogicalSelectionOffsets(root) : null;
          if (selection) savedSelectionRef.current = selection;
          syncPendingFromDom();
          emitFormatState(valueRef.current, selection ?? savedSelectionRef.current);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          const root = editorRef.current;
          if (!root) return;
          const selection = getLogicalSelectionOffsets(root);
          if (selection) savedSelectionRef.current = selection;
          syncPendingFromDom();
          emitFormatState(valueRef.current, selection ?? savedSelectionRef.current);
        }}
        onMouseUp={() => {
          const root = editorRef.current;
          if (!root) return;
          const selection = getLogicalSelectionOffsets(root);
          if (selection) savedSelectionRef.current = selection;
          syncPendingFromDom();
          emitFormatState(valueRef.current, selection ?? savedSelectionRef.current);
        }}
        className={`min-h-[1.5em] w-full whitespace-pre-wrap break-words outline-none [&_a]:cursor-text [&[data-link-mod='1']_a]:cursor-pointer [&_a]:font-bold [&_a]:text-teal-700 [&_a]:hover:text-teal-500 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic empty:before:pointer-events-none empty:before:text-brown-600/40 empty:before:content-[attr(data-placeholder)] ${className}`}
      />
    );
  },
);
