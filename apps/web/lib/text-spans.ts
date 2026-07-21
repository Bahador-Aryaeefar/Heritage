import type { TextSpan } from '@heritage/shared-types';

export type TextSelection = { start: number; end: number };

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
