# Editor link presentation (teal preview)

Date: 2026-07-24  
Status: approved  
Scope: admin `SpanTextEditor` + `LinkPopover` only (public `TextBlock` unchanged)

## Problem

Markdown chrome `[label](url)` in the canvas made links hard to read and not clickable. Focusing the URL field also cleared the text selection, so editors could not see which run they were linking.

## Goals

- Linked runs in the editor look like the public site: teal, bold, clickable label only (no brackets / URL chrome).
- Plain click on a link selects that run and opens `LinkPopover` for edit/remove.
- Ctrl/Cmd+click opens the URL in a new tab.
- While the popover is open, keep a visible draft highlight on the target range so the label stays obvious after focus moves to the URL field.

## Non-goals

- Changing the `TextSpan` API / DB shape.
- Changing public link rendering beyond existing teal `<a>` styles.
- Markdown link chrome in the editor (this replaces that 2026-07-22 editor-only markdown decision).

## Behavior

| Context | Action |
|---|---|
| Editor render | Span with `href` → `<a class="font-bold text-teal-700 hover:text-teal-500">` wrapping label (+ bold/italic as today). |
| Plain click on link | `preventDefault` navigation; select link run; open popover with URL prefills. |
| Ctrl/Cmd+click | Open `href` in a new tab (`noopener,noreferrer`). |
| Link chip / Ctrl+K | Snapshot selection; open popover; paint draft highlight on target range. |
| Popover open | `linkDraftRange` highlight (`bg-teal-200/70`) on the target offsets; cleared when popover closes. |
| Apply / Remove | Same as today; popover closes on success; highlight clears; teal `<a>` remains. |

## Modules

- `lib/editor-link-html.ts` - emit teal `<a>` instead of markdown chrome; parse `<a href>` (and ignore draft highlight wrappers).
- `span-text-editor.tsx` - click handling; optional `linkDraftRange` prop; paint/clear draft highlight after sync.
- `block-canvas.tsx` - track draft range while `linkOpen`.
- `design-system.md` - document editor link preview (matches public teal link).

## Success criteria

- Linked text in admin canvas is teal and clickable as specified.
- Draft highlight visible while the URL field is focused.
- Round-trip still emits label-only `text` + `href` on spans.
- Public pages unchanged.
