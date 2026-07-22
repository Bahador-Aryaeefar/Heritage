import type { TextSpan } from '@heritage/shared-types';

export type TextSelection = { start: number; end: number };

export type SpanMarks = { bold?: boolean; italic?: boolean; href?: string };

type CharMark = {
  char: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

function markKey(span: Pick<TextSpan, 'bold' | 'italic' | 'href'>): string {
  return `${Boolean(span.bold)}|${Boolean(span.italic)}|${span.href ?? ''}`;
}

function toTextSpan(mark: CharMark): TextSpan {
  const span: TextSpan = { text: mark.char };
  if (mark.bold) span.bold = true;
  if (mark.italic) span.italic = true;
  if (mark.href) span.href = mark.href;
  return span;
}

function flattenSpans(spans: TextSpan[]): CharMark[] {
  const chars: CharMark[] = [];
  for (const span of spans) {
    for (const char of span.text) {
      const mark: CharMark = { char };
      if (span.bold) mark.bold = true;
      if (span.italic) mark.italic = true;
      if (span.href) mark.href = span.href;
      chars.push(mark);
    }
  }
  return chars;
}

function unflattenChars(chars: CharMark[]): TextSpan[] {
  if (chars.length === 0) return [{ text: '' }];

  const spans: TextSpan[] = [];
  let current = toTextSpan(chars[0]!);

  for (let index = 1; index < chars.length; index += 1) {
    const next = toTextSpan(chars[index]!);
    if (markKey(current) === markKey(next)) {
      current.text += next.text;
    } else {
      spans.push(current);
      current = next;
    }
  }

  spans.push(current);
  return normalizeSpans(spans);
}

export function spansToPlainText(spans: TextSpan[]): string {
  return spans.map((span) => span.text).join('');
}

export function normalizeSpans(spans: TextSpan[]): TextSpan[] {
  const merged: TextSpan[] = [];

  for (const span of spans) {
    if (span.text === '' && merged.length > 0) continue;

    const next: TextSpan = { text: span.text };
    if (span.bold) next.bold = true;
    if (span.italic) next.italic = true;
    if (span.href) next.href = span.href;

    const last = merged[merged.length - 1];
    if (last && markKey(last) === markKey(next)) {
      last.text += next.text;
    } else {
      merged.push(next);
    }
  }

  if (merged.length === 0) return [{ text: '' }];
  return merged;
}

/** Stable JSON signature for comparing span arrays (including marks). */
export function serializeSpans(spans: TextSpan[]): string {
  return JSON.stringify(normalizeSpans(spans));
}

function clampSelection(selection: TextSelection): { start: number; end: number } {
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);
  return { start, end };
}

export function toggleMark(
  spans: TextSpan[],
  selection: TextSelection,
  mark: 'bold' | 'italic',
): TextSpan[] {
  const { start, end } = clampSelection(selection);
  if (start === end) return normalizeSpans(spans);

  const chars = flattenSpans(spans);
  const selected = chars.slice(start, end);
  const allMarked = selected.length > 0 && selected.every((char) => Boolean(char[mark]));

  const next = chars.map((char, index) => {
    if (index < start || index >= end) return char;
    const copy: CharMark = { ...char };
    if (allMarked) {
      delete copy[mark];
    } else {
      copy[mark] = true;
    }
    return copy;
  });

  return unflattenChars(next);
}

export function setLink(
  spans: TextSpan[],
  selection: TextSelection,
  href: string | null,
): TextSpan[] {
  const { start, end } = clampSelection(selection);
  if (start === end) return normalizeSpans(spans);

  const normalizedHref = href?.trim() ? href.trim() : null;
  const chars = flattenSpans(spans);

  const next = chars.map((char, index) => {
    if (index < start || index >= end) return char;
    const copy: CharMark = { ...char };
    if (normalizedHref) {
      copy.href = normalizedHref;
    } else {
      delete copy.href;
    }
    return copy;
  });

  return unflattenChars(next);
}

/** Split at a collapsed caret offset into before / after span arrays. */
export function splitSpansAt(
  spans: TextSpan[],
  offset: number,
): { before: TextSpan[]; after: TextSpan[] } {
  const chars = flattenSpans(spans);
  const clamped = Math.max(0, Math.min(offset, chars.length));
  return {
    before: unflattenChars(chars.slice(0, clamped)),
    after: unflattenChars(chars.slice(clamped)),
  };
}

/** Insert a newline character at a collapsed caret (Shift+Enter soft break). */
export function insertNewlineAt(spans: TextSpan[], offset: number): TextSpan[] {
  const chars = flattenSpans(spans);
  const clamped = Math.max(0, Math.min(offset, chars.length));
  const left = chars[clamped - 1];
  const newline: CharMark = { char: '\n' };
  if (left?.bold) newline.bold = true;
  if (left?.italic) newline.italic = true;
  if (left?.href) newline.href = left.href;
  return unflattenChars([...chars.slice(0, clamped), newline, ...chars.slice(clamped)]);
}

export function insertTextAt(
  spans: TextSpan[],
  offset: number,
  text: string,
  marks: SpanMarks = {},
): TextSpan[] {
  if (!text) return normalizeSpans(spans);
  const chars = flattenSpans(spans);
  const clamped = Math.max(0, Math.min(offset, chars.length));
  const inserted: CharMark[] = [...text].map((char) => {
    const mark: CharMark = { char };
    if (marks.bold) mark.bold = true;
    if (marks.italic) mark.italic = true;
    if (marks.href) mark.href = marks.href;
    return mark;
  });
  return unflattenChars([...chars.slice(0, clamped), ...inserted, ...chars.slice(clamped)]);
}

export function marksAt(spans: TextSpan[], offset: number): SpanMarks {
  const chars = flattenSpans(spans);
  if (offset <= 0 || chars.length === 0) return {};
  const left = chars[Math.min(offset, chars.length) - 1]!;
  const marks: SpanMarks = {};
  if (left.bold) marks.bold = true;
  if (left.italic) marks.italic = true;
  if (left.href) marks.href = left.href;
  return marks;
}

export function linkRangeAt(spans: TextSpan[], offset: number): TextSelection | null {
  const chars = flattenSpans(spans);
  if (chars.length === 0) return null;
  const probe = offset > 0 ? offset - 1 : 0;
  const href = chars[probe]?.href;
  if (!href) return null;
  let start = probe;
  while (start > 0 && chars[start - 1]?.href === href) start -= 1;
  let end = probe + 1;
  while (end < chars.length && chars[end]?.href === href) end += 1;
  return { start, end };
}

export function selectionUniformMark(
  spans: TextSpan[],
  selection: TextSelection,
  mark: 'bold' | 'italic',
): boolean {
  const { start, end } = clampSelection(selection);
  if (start === end) return false;
  const chars = flattenSpans(spans);
  const selected = chars.slice(start, end);
  return selected.length > 0 && selected.every((char) => Boolean(char[mark]));
}

export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
