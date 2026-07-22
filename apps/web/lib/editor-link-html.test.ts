import { describe, expect, it } from 'vitest';
import { editorHtmlRootToSpans, spansToEditorHtml } from './editor-link-html';
import { normalizeSpans } from './text-spans';

describe('spansToEditorHtml', () => {
  it('renders markdown chrome for linked spans', () => {
    const html = spansToEditorHtml([{ text: 'Museum', href: 'https://x.test' }]);
    expect(html).toContain('data-editor-href="https://x.test"');
    expect(html).toContain('](https://x.test)');
    expect(html).toContain('Museum');
  });

  it('keeps bold inside the label', () => {
    const html = spansToEditorHtml([{ text: 'Hi', bold: true, href: 'https://x.test' }]);
    expect(html).toContain('<strong>Hi</strong>');
  });
});

describe('editorHtmlRootToSpans', () => {
  it('round-trips label text without chrome characters', () => {
    const html = spansToEditorHtml([
      { text: 'Go ' },
      { text: 'here', href: 'https://x.test' },
      { text: '!' },
    ]);
    const root = document.createElement('div');
    root.innerHTML = html;
    expect(editorHtmlRootToSpans(root)).toEqual(
      normalizeSpans([
        { text: 'Go ' },
        { text: 'here', href: 'https://x.test' },
        { text: '!' },
      ]),
    );
  });
});
