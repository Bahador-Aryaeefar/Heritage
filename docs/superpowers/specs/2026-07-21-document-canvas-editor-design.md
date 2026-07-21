# Document canvas content editor (admin)

**Date:** 2026-07-21  
**Status:** Accepted  
**Plan:** [`docs/superpowers/plans/2026-07-21-document-canvas-editor.md`](../plans/2026-07-21-document-canvas-editor.md)  
**Replaces:** Card-stack `BlockListEditor` UX (per-block forms with inline Selects and action rows)  
**Keeps:** Same data model (`EditorBlock[]` / `SiteContentBlock`), FA/EN tabs, Copy from FA, atomic multipart save, media dedupe

## Problem

The current admin block editor is a stack of white cards, each with its own type title, move/delete buttons, textareas, and three Selects (role/color/align). Writing a page feels like filling a long form, not editing a document. Staff need something closer to the public article view, with options in one place.

## Goals

1. One continuous **document canvas** that looks like the public site body.
2. **Side inspector** for the selected block (type, style, media, reorder, delete).
3. **Insert between blocks** via “+” (and at end), not a permanent row of five Add buttons.
4. No change to API/payload contracts — UI-only redesign of the block editor surface.
5. Stay on design-system tokens (15px body chrome, white on sand, teal selection).

## Non-goals

- Full WYSIWYG rich text (bold/italic spans) — still plain text → single span.
- Collaborative editing / autosave.
- Changing FA/EN tab structure or site meta fields.
- Drag-and-drop reorder (↑↓ in inspector is enough for v1).
- Live public preview iframe (canvas styling is enough).

## Layout

```
[ FA | EN tabs ]
[ Title ]
[ Short description ]
[ Copy from FA ]          ← EN tab only

┌─────────────────────────────┬──────────────────┐
│  Document canvas            │  Inspector       │
│  (styled blocks)            │  (sticky ~280px) │
│                             │                  │
│  [+] gaps between blocks    │  or empty hint   │
│  [+ Add block] at end       │                  │
└─────────────────────────────┴──────────────────┘
```

- **Desktop:** two columns inside the locale tab; inspector sticky.
- **Mobile (<700px):** canvas full width; inspector as **bottom sheet** when a block is selected.
- **Selection:** one block at a time; focus ring using teal/brown (design tokens); click empty canvas deselects.

## Insert

- Hover/focus gap between blocks → “+” → menu: Heading / Paragraph / Image / Audio / Video.
- End of document: always-visible “+ Add block” with the same menu.
- Inserted block becomes selected and focused (text blocks: focus the in-canvas editor).

## Canvas rendering

| Block | On canvas |
|---|---|
| Heading / Paragraph | In-place editable text, styled by `textRole` / `colorToken` / `align` (same mapping as public `TextBlock`) |
| Image | Preview + dashed pick UI if empty; caption **not** on canvas (inspector only) |
| Audio | Compact audio attachment chip / player if URL known; caption in inspector |
| Video | Embed preview if URL valid, else URL placeholder; caption in inspector |

No per-block move/delete chrome on the canvas.

## Inspector

Shown when a block is selected:

| Control | Applies to |
|---|---|
| Type (Heading / Paragraph / Image / Audio / Video) | All — type change may clear incompatible fields and prompt for media |
| Text role | Text |
| Color | Text |
| Align | Text |
| Caption | Image / Audio / Video |
| File pick / replace | Image / Audio |
| Embed URL (`dir="ltr"`) | Video |
| Move up / Move down / Delete | All |

Empty inspector copy: “Select a block or insert one.”

## Keyboard (v1)

- Escape: deselect (when focus is not inside a nested modal/confirm).
- Delete/Backspace: delete selected block only when focus is **not** inside a text field / URL / caption input.

## Data / wiring

- Replace UI of `BlockListEditor` (or rename to `DocumentBlockEditor`) — same props: `value` / `onChange` / `labels` / `onPickFile`.
- `SiteForm` keeps FA/EN tabs, Copy from FA, multipart save unchanged.
- Labels: extend `admin.siteForm.block.*` for inspector empty state, insert menu, sheet close, etc.

## Visual tokens

- Canvas: white panel, `rounded-card`, padding similar to public article sand panel.
- Selected block: `ring-2 ring-teal-700/40` (or equivalent token).
- Insert “+”: secondary/ghost control, not a competing primary CTA.
- Inspector: sand or white nested panel matching admin form contrast rules.
- Type scale on canvas: reuse public text-role classes from design-system §10.

## Migration

1. Implement new editor behind the same `BlockListEditor` export (or swap import in `site-form`).
2. Remove old card-stack UI.
3. Update `design-system.md` `BlockListEditor` / SiteForm sections.
4. No API migration.

## Success criteria

- Staff can write a multi-block FA page without opening three Selects on every paragraph.
- Inserting an image between two paragraphs is ≤3 clicks.
- EN Copy from FA still works.
- Save payload shape unchanged; existing e2e still passes.

## Decisions

| Topic | Choice |
|---|---|
| Interaction | Document canvas + fixed side inspector |
| Insert | Between-block “+” + end “Add block” |
| Reorder/delete | Inspector only |
| Caption | Inspector only for media |
| FA/EN | Tabs wrap title + short + canvas (unchanged) |
| DnD | Deferred |
