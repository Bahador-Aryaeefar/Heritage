import { describe, expect, it } from 'vitest';
import { editorHtmlRootToSpans, spansToEditorHtml } from './editor-link-html';
import { normalizeSpans } from './text-spans';

describe('spansToEditorHtml', () => {
  it('renders teal anchors for linked spans', () => {
    const html = spansToEditorHtml([{ text: 'Museum', href: 'https://x.test' }]);
    expect(html).toContain('href="https://x.test"');
    expect(html).toContain('data-editor-link="1"');
    expect(html).toContain('text-teal-700');
    expect(html).toContain('Museum');
    expect(html).not.toContain('](https://x.test)');
  });

  it('keeps bold inside the label', () => {
    const html = spansToEditorHtml([{ text: 'Hi', bold: true, href: 'https://x.test' }]);
    expect(html).toContain('<strong>Hi</strong>');
  });
});

describe('editorHtmlRootToSpans', () => {
  it('round-trips label text from teal anchors', () => {
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

  it('ignores draft highlight wrappers', () => {
    const root = document.createElement('div');
    root.innerHTML =
      'Go <span data-link-draft="1" class="bg-teal-200/70"><a href="https://x.test" data-editor-link="1">here</a></span>!';
    expect(editorHtmlRootToSpans(root)).toEqual(
      normalizeSpans([
        { text: 'Go ' },
        { text: 'here', href: 'https://x.test' },
        { text: '!' },
      ]),
    );
  });
});
