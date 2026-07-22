import type { TextSpan } from '@heritage/shared-types';
import { normalizeSpans } from './text-spans';

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

function labelHtml(span: TextSpan): string {
  let html = escapeHtml(span.text);
  if (span.bold) html = `<strong>${html}</strong>`;
  if (span.italic) html = `<em>${html}</em>`;
  return html;
}

export function spansToEditorHtml(spans: TextSpan[]): string {
  const normalized = normalizeSpans(spans);
  if (normalized.length === 1 && normalized[0]!.text === '' && !normalized[0]!.href) {
    return '';
  }
  return normalized
    .map((span) => {
      const label = labelHtml(span);
      if (!span.href) return label;
      const href = escapeAttr(span.href);
      const open = `<span data-link-chrome="1" contenteditable="false">[</span>`;
      const close = `<span data-link-chrome="1" contenteditable="false">](${href})</span>`;
      return `<span data-editor-link="1" data-editor-href="${href}">${open}${label}${close}</span>`;
    })
    .join('');
}

function collectMarks(element: Element, inherited: Partial<TextSpan>): Partial<TextSpan> {
  const marks: Partial<TextSpan> = { ...inherited };
  const tag = element.tagName;
  if (tag === 'STRONG' || tag === 'B') marks.bold = true;
  if (tag === 'EM' || tag === 'I') marks.italic = true;
  if (element.hasAttribute('data-editor-link')) {
    const href = element.getAttribute('data-editor-href')?.trim();
    if (href) marks.href = href;
  }
  if (tag === 'A') {
    const href = element.getAttribute('href')?.trim();
    if (href) marks.href = href;
  }
  return marks;
}

export function editorHtmlRootToSpans(root: HTMLElement): TextSpan[] {
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
    if (element.getAttribute('data-link-chrome') === '1') return;
    if (element.tagName === 'BR') {
      spans.push({
        text: '\n',
        ...(inherited.bold ? { bold: true } : {}),
        ...(inherited.italic ? { italic: true } : {}),
        ...(inherited.href ? { href: inherited.href } : {}),
      });
      return;
    }
    const marks = collectMarks(element, inherited);
    for (const child of element.childNodes) walk(child, marks);
  }

  for (const child of root.childNodes) walk(child, {});
  return normalizeSpans(spans.length > 0 ? spans : [{ text: '' }]);
}
