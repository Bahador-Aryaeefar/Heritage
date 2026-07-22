# Span format UX (bold / italic / link)

Date: 2026-07-22  
Status: approved for planning  
Scope: admin `SpanTextEditor` + `FormatToolbar` only (public renderer unchanged)

## Problem

1. Bold and italic require a non-empty selection. Editors expect Word-like sticky marks: turn the mark on, then type.
2. Links use `window.prompt`, which feels awkward, and linked text is easy to miss while editing (teal `<a>` alone is weak in the canvas).

## Goals

- Sticky bold/italic when the caret is collapsed; selection toggle when a range is selected.
- Link create/edit/remove via an inline popover (no `window.prompt`).
- In the **editor only**, linked runs render as markdown `[label](url)`.
- On the **public site**, links stay teal `<a>` with no brackets.
- Drop the separate Unlink toolbar chip; removal lives in the popover.
- Keep the existing `TextSpan[]` contract (`text`, `bold?`, `italic?`, `href?`) for API, DB, and public render.

## Non-goals

- Replacing the editor with TipTap / ProseMirror / Lexical.
- Markdown for bold/italic (`**` / `*`) in the editor.
- Changing public link styles beyond the current design-system teal link.
- Changing list Enter / Shift+Enter / Backspace behavior except where format helpers are shared.

## Approach (chosen)

**Keep spans; markdown is an editor presentation only.**  
`href` remains metadata on the span. The characters `[`, `](`, `)` and the URL string are editor chrome for linked runs, not part of `span.text`. Round-trip through `spansToHtml` / `domToSpans` must preserve `text` = label only.

Rejected alternatives:

- Real markdown source for links (fragile, fights span marks).
- Non-editable URL chrome only (heavier caret edge cases; deferred).

## Behavior

### Bold / italic

| Context | Action |
|---|---|
| Non-empty selection | Toggle mark on that range (current `toggleMark` semantics). |
| Collapsed caret | Toggle a sticky pending mark. Newly typed characters take the pending marks until the mark is toggled off, the block loses focus / selection moves in a way that clears sticky state, or the user moves to another editor instance. |
| Toolbar | Chips show pressed when the selection is uniformly marked, or when sticky pending includes that mark, or when the character before a collapsed caret already has the mark. |
| Shortcuts | Ctrl/Cmd+B and Ctrl/Cmd+I mirror the chips. |

Sticky marks apply to plain typing inserts. Pasting and IME: prefer applying pending marks to the inserted plain text when practical; do not invent new paste pipelines beyond that.

### Links

| Context | Action |
|---|---|
| Editor render | Span with `href` displays as `[label](url)` where `label` is `span.text` and `url` is `span.href`. |
| Public / serialize | Label only in `text`; `href` on the span; public `TextBlock` renders teal `<a>` as today. |
| Link chip / Ctrl/Cmd+K | Open `LinkPopover` near the toolbar. |
| Create | Requires a non-empty selection (label). Popover URL field empty (or selected text if it looks like a URL, optional nicety). Apply sets `href` via existing `setLink`. |
| Edit | Caret or selection inside a linked run: popover prefills current `href`. Apply updates; Remove clears `href` (brackets disappear). |
| Empty selection + no link under caret | Link action may no-op or show a short validation hint (prefer no-op with no browser alert). |
| Unlink chip | **Removed** from `FormatToolbar`. |

URL validation: accept absolute `http:` / `https:` URLs for Apply (trim whitespace). Reject empty Apply (treat as no-op or equivalent to Remove only when editing an existing link and the field is cleared—prefer explicit Remove for clear).

### Toolbar

- Chips: Bold, Italic, Link only.
- Link opens popover; Escape closes without applying.
- `onMouseDown` preventDefault on chips remains so the editor does not lose selection.

## Components / modules

| Piece | Change |
|---|---|
| `lib/text-spans.ts` | Keep `toggleMark` / `setLink`. Add helpers as needed for sticky insert (e.g. insert plain text at caret with marks) and for detecting link under selection. |
| `span-text-editor.tsx` | Sticky pending state; keyboard shortcuts; markdown link HTML encode/decode; expose popover trigger / selection snapshot; pressed-state callbacks or query for toolbar. |
| `format-toolbar.tsx` | Pressed styles for Bold/Italic; remove Unlink; optional Link active when selection is in a link. |
| New `link-popover.tsx` (or colocated) | URL field, Apply, Remove; design-system field + button tokens. |
| i18n | Drop or stop using Unlink label; add popover strings (URL placeholder, Apply, Remove) under `admin.siteForm.block.*`. |
| `design-system.md` | Update FormatToolbar / SpanTextEditor notes to match. |

## Data flow

1. User edits → DOM → `domToSpans` → `normalizeSpans` → `onChange(TextSpan[])`.
2. Parent state → `value` → `spansToHtml` (editor variant with markdown links) → contenteditable.
3. Public pages continue to use content blocks / `TextBlock` with normal `<a>` rendering; they never see editor chrome.

## Testing

- Sticky bold then type; sticky italic; toggle off mid-typing.
- Selection toggle still works for bold/italic.
- Link create from selection → editor HTML contains `[label](url)`; emitted spans have label-only `text` + `href`.
- Edit URL via popover; Remove clears `href` and markdown chrome.
- Ctrl/Cmd+B / I / K.
- Unlink chip absent.
- Existing span normalize / link unit tests updated; add editor-focused tests where Vitest + jsdom allow.

## Risks

- contenteditable round-trip for markdown chrome is the highest-risk area (caret jumps, partial selection of chrome). Mitigate with dedicated encode/decode and tests; if chrome selection is unreliable, fall back to treating URL segment as non-editable via a data attribute / `contenteditable=false` wrapper around the `(url)` portion only (still approach A).
- Sticky marks + React controlled re-sync must not wipe caret; reuse existing sync guards.

## Success criteria

- Can turn Bold on with empty selection and type bold text.
- Can add/edit/remove a link without `window.prompt`.
- Editor shows `[label](url)`; public site shows a normal teal link with the label only.
- No API / schema migration.
