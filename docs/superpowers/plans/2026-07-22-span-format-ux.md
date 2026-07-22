# Span Format UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sticky bold/italic (type-with-format-on), markdown-looking links in the admin editor with an inline URL popover, and no Unlink chip — without changing the `TextSpan[]` API or public teal links.

**Architecture:** Keep pure span helpers in `lib/text-spans.ts`. Editor-only markdown chrome (`[label](url)`) is encoded/decoded in `span-text-editor.tsx` with `contenteditable=false` URL chrome so label text stays `span.text` and `href` stays metadata. Sticky marks live as pending state on the editor; collapsed caret + typing inserts via `insertTextAt`. Link UX moves from `window.prompt` to `LinkPopover`.

**Tech Stack:** Next.js admin React client components, Vitest + Testing Library, existing design-system `TextInput` / `ActionButton` / toolbar chips. No new rich-text libraries.

**Spec:** [`docs/superpowers/specs/2026-07-22-span-format-ux-design.md`](../specs/2026-07-22-span-format-ux-design.md)

## Global Constraints

- Do not change Prisma / shared-types `TextSpan` shape (`text`, `bold?`, `italic?`, `href?`).
- Public `TextBlock` / teal `<a>` rendering stays as today (no brackets on the live site).
- No TipTap / ProseMirror / Lexical.
- No markdown for bold/italic (`**` / `*`).
- Drop Unlink chip; Remove only inside the link popover.
- Apply accepts absolute `http:` / `https:` URLs only (trim); empty Apply is a no-op; clear via Remove.
- Design-system tokens only; update `design-system.md` in the docs task.
- Copy: no AI punctuation (em dashes, curly quotes, etc.) per project Rule 0.

---

## File map

| Path | Responsibility |
|---|---|
| `apps/web/lib/text-spans.ts` | `insertTextAt`, `marksAt`, `linkRangeAt`, `selectionUniformMark`, `isHttpUrl` |
| `apps/web/lib/text-spans.test.ts` | Unit tests for new helpers |
| `apps/web/lib/editor-link-html.ts` | Pure `spansToEditorHtml` / parse helpers for markdown chrome (keeps editor file smaller) |
| `apps/web/lib/editor-link-html.test.ts` | Round-trip: spans ↔ editor HTML (label only in `text`) |
| `apps/web/components/admin/span-text-editor.tsx` | Sticky marks, shortcuts, editor HTML, open-link callback, selection helpers |
| `apps/web/components/admin/format-toolbar.tsx` | Pressed chips; Bold/Italic/Link only |
| `apps/web/components/admin/link-popover.tsx` | URL field + Apply + Remove |
| `apps/web/components/admin/block-canvas.tsx` | Wire popover + pressed state; drop unlink |
| `apps/web/components/admin/block-list-editor.tsx` | Label types for popover strings |
| `apps/web/components/admin/site-form.tsx` | Pass new i18n labels |
| `apps/web/messages/{fa,en,ar}.json` | Popover strings; remove unlink/linkPrompt usage |
| `apps/web/components/admin/span-text-editor.test.tsx` | Sticky + link chrome smoke where jsdom allows |
| `design-system.md` | Document new toolbar / popover / editor link chrome |

---

### Task 1: Span helpers — insert, marks, link range, URL check

**Files:**
- Modify: `apps/web/lib/text-spans.ts`
- Modify: `apps/web/lib/text-spans.test.ts`

**Interfaces:**
- Produces:
  - `export type SpanMarks = { bold?: boolean; italic?: boolean; href?: string }`
  - `insertTextAt(spans: TextSpan[], offset: number, text: string, marks?: SpanMarks): TextSpan[]`
  - `marksAt(spans: TextSpan[], offset: number): SpanMarks` — marks of the character **before** offset; if offset is 0, `{}`
  - `linkRangeAt(spans: TextSpan[], offset: number): TextSelection | null` — contiguous run sharing the same `href` that contains the caret (use char at `offset - 1` if collapsed at boundary inside/after a link char; if offset is inside a link char index `offset` when `0 <= offset < length` prefer the char at `min(offset, length-1)` when collapsed at end of link use last link char). Spec: for collapsed caret, find the CharMark at index `offset > 0 ? offset - 1 : 0` only if that char has href when at start… **Concrete rule:** walk chars; if `offset` is between `start` and `end` of a maximal same-href run (inclusive start, exclusive end of indices), return that run. Treat caret at `end` of a run (touching the right edge) as inside that run when `offset === runEnd` and the previous char has href.
  - `selectionUniformMark(spans: TextSpan[], selection: TextSelection, mark: 'bold' | 'italic'): boolean` — true when `start < end` and every selected char has the mark
  - `isHttpUrl(value: string): boolean` — trimmed string parses as URL with protocol `http:` or `https:`

- Consumes: existing `flattenSpans` / `unflattenChars` / `normalizeSpans` (keep them file-private or export only what tests need)

- [ ] **Step 1: Write failing tests**

Add to `apps/web/lib/text-spans.test.ts`:

```ts
import {
  insertTextAt,
  isHttpUrl,
  linkRangeAt,
  marksAt,
  selectionUniformMark,
} from './text-spans';

describe('insertTextAt', () => {
  it('inserts plain text at the caret', () => {
    expect(insertTextAt([{ text: 'ac' }], 1, 'b')).toEqual([{ text: 'abc' }]);
  });

  it('applies sticky bold marks to inserted text', () => {
    expect(insertTextAt([{ text: 'ac' }], 1, 'b', { bold: true })).toEqual([
      { text: 'a' },
      { text: 'b', bold: true },
      { text: 'c' },
    ]);
  });
});

describe('marksAt', () => {
  it('returns marks of the character before the caret', () => {
    expect(marksAt([{ text: 'ab', bold: true }, { text: 'c' }], 2)).toEqual({ bold: true });
    expect(marksAt([{ text: 'ab', bold: true }], 0)).toEqual({});
  });
});

describe('linkRangeAt', () => {
  it('returns the contiguous href run under the caret', () => {
    const spans = [
      { text: 'Go ' },
      { text: 'here', href: 'https://x.test' },
      { text: ' now' },
    ];
    expect(linkRangeAt(spans, 5)).toEqual({ start: 3, end: 7 });
    expect(linkRangeAt(spans, 7)).toEqual({ start: 3, end: 7 });
    expect(linkRangeAt(spans, 2)).toBeNull();
  });
});

describe('selectionUniformMark', () => {
  it('is true only when every selected char has the mark', () => {
    const spans = [{ text: 'Hi', bold: true }, { text: '!' }];
    expect(selectionUniformMark(spans, { start: 0, end: 2 }, 'bold')).toBe(true);
    expect(selectionUniformMark(spans, { start: 0, end: 3 }, 'bold')).toBe(false);
  });
});

describe('isHttpUrl', () => {
  it('accepts http(s) only', () => {
    expect(isHttpUrl(' https://x.test/a ')).toBe(true);
    expect(isHttpUrl('http://x.test')).toBe(true);
    expect(isHttpUrl('ftp://x.test')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter web exec vitest run lib/text-spans.test.ts`

Expected: FAIL (exports missing)

- [ ] **Step 3: Implement helpers in `text-spans.ts`**

```ts
export type SpanMarks = { bold?: boolean; italic?: boolean; href?: string };

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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter web exec vitest run lib/text-spans.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/text-spans.ts apps/web/lib/text-spans.test.ts
git commit -m "Add span helpers for sticky insert, link ranges, and URL checks."
```

---

### Task 2: Editor link HTML encode / decode

**Files:**
- Create: `apps/web/lib/editor-link-html.ts`
- Create: `apps/web/lib/editor-link-html.test.ts`

**Interfaces:**
- Produces:
  - `spansToEditorHtml(spans: TextSpan[]): string` — empty spans → `''`; linked runs wrap label in markdown chrome
  - `editorHtmlRootToSpans(root: HTMLElement): TextSpan[]` — skips `data-link-chrome` nodes; reads `data-editor-href` for href
- HTML shape for a linked span (bold example):

```html
<span data-editor-link="1" data-editor-href="https://x.test"><span data-link-chrome="1" contenteditable="false">[</span><strong>Museum</strong><span data-link-chrome="1" contenteditable="false">](https://x.test)</span></span>
```

Unlinked bold: `<strong>Museum</strong>` (same as today).  
Italic: `<em>`. Both: nest `strong`/`em` as current `spanToHtml` does.  
Chrome spans must set `contenteditable="false"` and `data-link-chrome="1"`.

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter web exec vitest run lib/editor-link-html.test.ts`

- [ ] **Step 3: Implement `editor-link-html.ts`**

Escape helpers (copy from `span-text-editor.tsx` or share small local copies):

```ts
import type { TextSpan } from '@heritage/shared-types';
import { normalizeSpans } from './text-spans';

function escapeHtml(text: string): string { /* same as span-text-editor */ }
function escapeAttr(value: string): string { /* same */ }

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
  // Legacy public-style <a> if any remain mid-edit:
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
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter web exec vitest run lib/editor-link-html.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-link-html.ts apps/web/lib/editor-link-html.test.ts
git commit -m "Add editor-only markdown link HTML encode and decode."
```

---

### Task 3: LinkPopover + FormatToolbar (no Unlink, pressed state)

**Files:**
- Create: `apps/web/components/admin/link-popover.tsx`
- Modify: `apps/web/components/admin/format-toolbar.tsx`
- Modify: `apps/web/messages/en.json`, `fa.json`, `ar.json` (keys under `admin.siteForm.block`)

**Interfaces:**
- `LinkPopover` props:

```ts
type LinkPopoverProps = {
  open: boolean;
  initialUrl: string;
  canRemove: boolean;
  labels: { url: string; apply: string; remove: string };
  onApply: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
};
```

- `FormatToolbar` props after change:

```ts
type FormatToolbarProps = {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  boldActive?: boolean;
  italicActive?: boolean;
  linkActive?: boolean;
  labels: { bold: string; italic: string; link: string };
  toolbarLabel?: string;
};
```

Remove `onUnlink` and `labels.unlink`.

i18n keys (replace `unlink` / `linkPrompt` usage):

```json
"bold": "...",
"italic": "...",
"link": "...",
"linkUrl": "URL",
"linkApply": "Apply",
"linkRemove": "Remove"
```

(Keep old keys unused until site-form cleanup in Task 5, or delete them in this task.)

- [ ] **Step 1: Implement `link-popover.tsx`**

When `open` is false, return `null`. When true, render a white `rounded-card` panel under the toolbar with `TextInput` (type URL), `ActionButton` Apply (primary) and Remove (secondary, disabled when `!canRemove`). On mount / open, seed local state from `initialUrl`. Escape key calls `onClose`. Apply: if `isHttpUrl(value)` call `onApply(value.trim())`; else no-op. Remove calls `onRemove`.

Import `isHttpUrl` from `@/lib/text-spans`, `TextInput` from `@/components/ui/text-field`, `ActionButton` from `@/components/ui/action-button`.

- [ ] **Step 2: Update `format-toolbar.tsx`**

- Drop Unlink chip and props.
- Add `aria-pressed` on Bold/Italic/Link chips when the matching `*Active` is true.
- Pressed visual: `bg-teal-700 text-sand-50 border-teal-700` when active; keep existing idle chip styles otherwise.
- Keep `onMouseDown` preventDefault.

- [ ] **Step 3: Update message files** for `linkUrl` / `linkApply` / `linkRemove` in fa/en/ar; remove `unlink` and `linkPrompt`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/link-popover.tsx apps/web/components/admin/format-toolbar.tsx apps/web/messages/en.json apps/web/messages/fa.json apps/web/messages/ar.json
git commit -m "Add link popover and pressed format toolbar without Unlink."
```

---

### Task 4: SpanTextEditor — sticky marks, shortcuts, editor HTML, link API

**Files:**
- Modify: `apps/web/components/admin/span-text-editor.tsx`
- Modify: `apps/web/components/admin/span-text-editor.test.tsx`

**Interfaces:**
- Replace handle methods:

```ts
export type SpanTextEditorHandle = {
  focus: () => void;
  focusAtStart: () => void;
  focusAtEnd: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  openLink: () => void; // signals parent; see below
  getFormatState: () => {
    boldActive: boolean;
    italicActive: boolean;
    linkActive: boolean;
    linkHref: string | null;
    selection: TextSelection | null;
  };
  applyLinkUrl: (url: string) => void;
  removeLink: () => void;
};
```

Parent owns popover open state. `openLink` should call optional prop `onRequestLink?: () => void` so canvas can set `linkPopoverOpen=true`. Also implement `openLink` on the handle as that same request.

Behavior details:

1. Sync HTML via `spansToEditorHtml` instead of old `spansToHtml`.
2. `emitFromDom` uses `editorHtmlRootToSpans`.
3. Pending marks ref: `pendingMarksRef = useRef<{ bold?: boolean; italic?: boolean }>({})`.
4. `toggleBold` / `toggleItalic`:
   - Read selection via logical offsets (skip `data-link-chrome` text when measuring — implement `getLogicalSelectionOffsets(root)` mirroring `getSelectionOffsets` but ignoring chrome nodes in the tree walker / range string). **Minimum viable:** if chrome makes offsets hard, document that link chrome is non-editable and use the same `toString()` length only over non-chrome by cloning range and walking — prefer a walker that counts only text nodes whose ancestors lack `data-link-chrome`.
   - If `start !== end`: `toggleMark` + clear pending for that mark to match result.
   - If collapsed: flip `pendingMarksRef.current[mark]`; if turning off and `marksAt` already has mark, sticky off means next typing won’t use it (pending explicit false). Use pending as override: `{ ...marksAt(...), ...pending }` where pending stores booleans the user toggled.
   - Spec simplification for pending: store `Partial<{ bold: boolean; italic: boolean }>` as explicit sticky overrides. When inserting, effective marks = `{ ...marksAt(offset), ...pendingMarks }` with pending keys winning.
5. `beforeinput` on `insertText`: if pending has any key OR we need to force marks, `preventDefault`, `insertTextAt`, `onChange`, restore caret after insert length.
6. Shortcuts in `handleKeyDown`: meta/ctrl + b/i/k.
7. `applyLinkUrl` / `removeLink`: resolve target selection = current non-empty selection, else `linkRangeAt` for caret; if still empty, no-op. Then `setLink`.
8. `getFormatState`: compute bold/italic active from selectionUniformMark or pending or marksAt; linkActive if selection/caret in link; linkHref from that range.
9. Remove `window.prompt` and `unlink` / `promptLink` / `labels.linkPrompt`.

- [ ] **Step 1: Update tests**

Change labels prop away from `linkPrompt`. Add a test that `spansToEditorHtml` path shows chrome when value has href (render + check `data-editor-href`). Add test that calling `toggleBold` with empty editor + then simulating is hard in jsdom — at least unit-test that handle exposes `applyLinkUrl` without prompt (mock). Keep existing paint tests green.

- [ ] **Step 2: Implement editor changes**

Wire imports from `editor-link-html` and new text-spans helpers. Remove local `spansToHtml` / `domToSpans` if fully replaced.

- [ ] **Step 3: Run**

Run: `pnpm --filter web exec vitest run components/admin/span-text-editor.test.tsx lib/editor-link-html.test.ts lib/text-spans.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/span-text-editor.tsx apps/web/components/admin/span-text-editor.test.tsx
git commit -m "Teach SpanTextEditor sticky marks, shortcuts, and markdown link chrome."
```

---

### Task 5: Wire canvas + site-form labels

**Files:**
- Modify: `apps/web/components/admin/block-canvas.tsx`
- Modify: `apps/web/components/admin/block-list-editor.tsx` (label type)
- Modify: `apps/web/components/admin/site-form.tsx`

**Interfaces:**
- Extend `BlockListEditorLabels` / site-form `tb(...)` with `linkUrl`, `linkApply`, `linkRemove`; remove `unlink`, `linkPrompt`.
- In `block-canvas` for text blocks and list blocks:
  - State: `linkOpen` boolean (per canvas is enough; one popover).
  - On `FormatToolbar` `onLink` → `editorRef.current?.openLink()` / list active handle + `setLinkOpen(true)`.
  - Poll or read `getFormatState()` on selectionchange / toolbar render: simplest approach — store `formatState` updated from editor `onFocus` + `onInput` callback prop `onFormatStateChange` added to SpanTextEditor. **Prefer:** add optional `onFormatStateChange?: (state) => void` called from emitFromDom, toggle handlers, and selectionchange listener on document while focused.
  - Render `LinkPopover` under toolbar with `initialUrl={formatState.linkHref ?? ''}`, `canRemove={Boolean(formatState.linkHref)}`, apply/remove call handle methods then `setLinkOpen(false)`.

- [ ] **Step 1: Update types and site-form label wiring**

- [ ] **Step 2: Update both FormatToolbar call sites in block-canvas; add LinkPopover**

- [ ] **Step 3: Manual sanity (dev)** — bold sticky, link popover create/edit/remove, list item formatting

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/block-canvas.tsx apps/web/components/admin/block-list-editor.tsx apps/web/components/admin/site-form.tsx
git commit -m "Wire sticky format toolbar and link popover into the block canvas."
```

---

### Task 6: Docs + verification

**Files:**
- Modify: `design-system.md` (SpanTextEditor / FormatToolbar sections)
- Modify: `README.md` only if admin editor bullet mentions Unlink / prompt (update to popover + sticky marks)

- [ ] **Step 1: Update design-system.md**

Document:
- Sticky bold/italic + pressed chips + Ctrl/Cmd+B/I
- Editor markdown `[label](url)` chrome; public teal links unchanged
- Link popover Apply/Remove; no Unlink chip; Ctrl/Cmd+K

- [ ] **Step 2: Run full web checks**

```bash
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add design-system.md README.md
git commit -m "Document sticky marks and markdown link editor chrome."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Sticky bold/italic on collapsed caret | 1, 4 |
| Selection toggle unchanged | 4 (existing `toggleMark`) |
| Pressed toolbar chips | 3, 5 |
| Ctrl/Cmd+B/I/K | 4 |
| Markdown `[label](url)` in editor only | 2, 4 |
| Public teal links unchanged | (no public file changes) |
| Link popover Apply/Remove | 3, 5 |
| Drop Unlink | 3, 5 |
| http(s) validation | 1, 3 |
| Empty selection + no link → no-op | 4 |
| `TextSpan[]` unchanged | all |
| design-system update | 6 |
| Tests | 1, 2, 4, 6 |

## Self-review notes

- No TipTap; chrome uses `contenteditable=false` as allowed fallback in the spec.
- Logical selection offsets must ignore chrome or link toggles will be wrong — called out in Task 4.
- Pending mark model uses explicit sticky overrides layered on `marksAt`.
