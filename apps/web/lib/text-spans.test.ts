import { describe, expect, it } from 'vitest';
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
} from './text-spans';

const sel = (start: number, end: number): TextSelection => ({ start, end });

describe('spansToPlainText', () => {
  it('joins span text in order', () => {
    expect(spansToPlainText([{ text: 'Hello' }, { text: ' world' }])).toBe('Hello world');
  });
});

describe('normalizeSpans', () => {
  it('merges adjacent spans with identical marks', () => {
    expect(
      normalizeSpans([
        { text: 'a', bold: true },
        { text: 'b', bold: true },
      ]),
    ).toEqual([{ text: 'ab', bold: true }]);
  });

  it('does not merge spans with different marks', () => {
    expect(
      normalizeSpans([
        { text: 'a', bold: true },
        { text: 'b' },
      ]),
    ).toEqual([{ text: 'a', bold: true }, { text: 'b' }]);
  });

  it('merges spans that share href, bold, and italic', () => {
    expect(
      normalizeSpans([
        { text: 'a', href: 'https://x.test', bold: true, italic: true },
        { text: 'b', href: 'https://x.test', bold: true, italic: true },
      ]),
    ).toEqual([{ text: 'ab', href: 'https://x.test', bold: true, italic: true }]);
  });

  it('returns a single empty span for empty input', () => {
    expect(normalizeSpans([])).toEqual([{ text: '' }]);
  });

  it('drops empty spans except when it is the only span', () => {
    expect(normalizeSpans([{ text: '' }, { text: 'hi' }])).toEqual([{ text: 'hi' }]);
  });
});

describe('serializeSpans', () => {
  it('distinguishes mark-only differences with the same plain text', () => {
    expect(serializeSpans([{ text: 'hi' }])).not.toBe(serializeSpans([{ text: 'hi', bold: true }]));
  });

  it('matches normalized equivalent arrays', () => {
    const a = [{ text: 'a', bold: true }, { text: 'b', bold: true }];
    expect(serializeSpans(a)).toBe(serializeSpans(normalizeSpans(a)));
  });
});

describe('toggleMark', () => {
  it('applies bold to a selection', () => {
    const spans: TextSpan[] = [{ text: 'Hello world' }];
    expect(toggleMark(spans, sel(0, 5), 'bold')).toEqual([
      { text: 'Hello', bold: true },
      { text: ' world' },
    ]);
  });

  it('removes bold when the entire selection is already bold', () => {
    const spans: TextSpan[] = [{ text: 'Hello', bold: true }, { text: ' world' }];
    expect(toggleMark(spans, sel(0, 5), 'bold')).toEqual([{ text: 'Hello world' }]);
  });

  it('toggles italic on a middle segment', () => {
    const spans: TextSpan[] = [{ text: 'Hello world' }];
    expect(toggleMark(spans, sel(6, 11), 'italic')).toEqual([
      { text: 'Hello ' },
      { text: 'world', italic: true },
    ]);
  });

  it('adds bold to part of an already-bold span', () => {
    const spans: TextSpan[] = [{ text: 'Hello world', bold: true }];
    expect(toggleMark(spans, sel(0, 5), 'bold')).toEqual([
      { text: 'Hello' },
      { text: ' world', bold: true },
    ]);
  });

  it('leaves spans unchanged for an empty selection', () => {
    const spans: TextSpan[] = [{ text: 'Hello' }];
    expect(toggleMark(spans, sel(2, 2), 'bold')).toEqual([{ text: 'Hello' }]);
  });
});

describe('setLink', () => {
  it('sets href on a selection', () => {
    const spans: TextSpan[] = [{ text: 'Visit site' }];
    expect(setLink(spans, sel(0, 5), 'https://example.com')).toEqual([
      { text: 'Visit', href: 'https://example.com' },
      { text: ' site' },
    ]);
  });

  it('clears href when href is null', () => {
    const spans: TextSpan[] = [{ text: 'Visit', href: 'https://example.com' }, { text: ' site' }];
    expect(setLink(spans, sel(0, 5), null)).toEqual([{ text: 'Visit site' }]);
  });

  it('clears href when href is an empty string', () => {
    const spans: TextSpan[] = [{ text: 'Visit', href: 'https://example.com' }];
    expect(setLink(spans, sel(0, 5), '')).toEqual([{ text: 'Visit' }]);
  });

  it('preserves bold and italic when setting a link', () => {
    const spans: TextSpan[] = [{ text: 'Visit', bold: true, italic: true }];
    expect(setLink(spans, sel(0, 5), 'https://example.com')).toEqual([
      { text: 'Visit', href: 'https://example.com', bold: true, italic: true },
    ]);
  });

  it('leaves spans unchanged for an empty selection', () => {
    const spans: TextSpan[] = [{ text: 'Hello' }];
    expect(setLink(spans, sel(1, 1), 'https://example.com')).toEqual([{ text: 'Hello' }]);
  });
});

describe('splitSpansAt', () => {
  it('splits plain text at the caret', () => {
    expect(splitSpansAt([{ text: 'Hello' }], 2)).toEqual({
      before: [{ text: 'He' }],
      after: [{ text: 'llo' }],
    });
  });
});

describe('insertNewlineAt', () => {
  it('inserts a newline character at the caret', () => {
    expect(insertNewlineAt([{ text: 'ab' }], 1)).toEqual([{ text: 'a\nb' }]);
  });
});
