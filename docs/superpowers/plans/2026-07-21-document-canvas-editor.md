# Document Canvas Content Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the card-stack `BlockListEditor` with a document canvas + side inspector so staff edit site content like a page, not a form.

**Architecture:** Keep the same controlled `EditorBlock[]` API. Split UI into canvas (styled in-place editing + insert gaps), sticky inspector (type/style/media/reorder), and thin shell that owns selection. Reuse public `roleClasses` / `colorClasses` / `alignClasses` from `text-block.tsx`. No API changes.

**Tech Stack:** Next.js client components, existing UI primitives (`Select`, `ActionButton`, `Field`, `TextInput`), design-system tokens, Vitest for pure helpers.

**Spec:** [`docs/superpowers/specs/2026-07-21-document-canvas-editor-design.md`](../specs/2026-07-21-document-canvas-editor-design.md)

## Global Constraints

- UI-only — do not change multipart payload / Zod / Nest endpoints.
- Plain text → single span; no bold/italic editor.
- Design-system: body chrome `text-[15px]`; canvas type scale from public §10 role classes; white canvas on sand; selected `ring-2 ring-teal-700/40`.
- Caption for media only in inspector.
- Reorder/delete only in inspector (no DnD).
- Insert via between-block “+” and end “Add block”.
- FA/EN tabs + Copy from FA in `SiteForm` stay as-is.
- Same public props surface: `value` / `onChange` / `labels` / `onPickFile` (extend `labels` keys as needed).
- Update `design-system.md` in the docs task; keep i18n in `fa`/`en`/`ar`.

---

## File map

| Path | Responsibility |
|---|---|
| `apps/web/lib/block-editor-utils.ts` | Create default blocks, convert type, move index helpers |
| `apps/web/lib/block-editor-utils.test.ts` | Unit tests for helpers |
| `apps/web/components/admin/block-inspector.tsx` | Side panel / mobile sheet controls |
| `apps/web/components/admin/block-canvas.tsx` | Document surface, selection chrome, insert gaps |
| `apps/web/components/admin/block-insert-menu.tsx` | “+” menu for block types |
| `apps/web/components/admin/block-list-editor.tsx` | Shell: selection state + layout; re-export labels type |
| `apps/web/components/admin/site-form.tsx` | Pass new label keys only if needed |
| `apps/web/messages/{fa,en,ar}.json` | New copy keys |
| `design-system.md` | Replace BlockListEditor card-stack spec |

---

### Task 1: Block editor helpers (create / convert / move)

**Files:**
- Create: `apps/web/lib/block-editor-utils.ts`
- Create: `apps/web/lib/block-editor-utils.test.ts`

**Interfaces:**
- Consumes: `EditorBlock`, `createBlockKey` from `lib/copy-blocks-from-fa.ts`
- Produces:
  - `createEmptyBlock(type: EditorBlock['type']): EditorBlock`
  - `convertBlockType(block: EditorBlock, next: EditorBlock['type']): EditorBlock`
  - `moveBlock(blocks: EditorBlock[], key: string, direction: 'up' | 'down'): EditorBlock[]`
  - `insertBlockAt(blocks: EditorBlock[], index: number, type: EditorBlock['type']): { blocks: EditorBlock[]; key: string }`

Defaults:
- HEADING → `textRole: 'H2'`, `colorToken: 'BROWN_950'`, `align: 'START'`, `text: ''`
- PARAGRAPH → `BODY`, `BROWN_800`, `START`, `text: ''`
- IMAGE/AUDIO → empty caption, no mediaId/clientFileKey
- VIDEO → empty embedUrl + caption

`convertBlockType`: preserve `key`; when going text↔text keep `text` if present; when leaving text clear text fields; when entering media clear incompatible fields.

- [ ] **Step 1: Write failing tests** covering create defaults, convert heading→paragraph keeps text, convert paragraph→image drops text, move up/down bounds, insertAt index.

- [ ] **Step 2: Run** `pnpm --filter web test lib/block-editor-utils.test.ts` — expect FAIL

- [ ] **Step 3: Implement helpers**

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/block-editor-utils.ts apps/web/lib/block-editor-utils.test.ts
git commit -m "Add block editor create/convert/move helpers."
```

---

### Task 2: Insert menu primitive

**Files:**
- Create: `apps/web/components/admin/block-insert-menu.tsx`

**Interfaces:**
- Produces: `BlockInsertMenu` with props:
  - `labels: Pick<BlockListEditorLabels, 'addHeading' | 'addParagraph' | 'addImage' | 'addAudio' | 'addVideo' | 'addBlock'>`
  - `onInsert: (type: EditorBlock['type']) => void`
  - `variant: 'gap' | 'end'` — gap = compact “+”; end = “+ Add block” button that opens the same menu

Portaled or absolute menu (reuse Select stacking: `fixed` + `zIndex: 1100` if needed so it clears map/chrome). Close on outside click / Escape.

- [ ] **Step 1: Implement `BlockInsertMenu`** using `ActionButton` / simple button list (no new icon library)

- [ ] **Step 2: Smoke** — `pnpm --filter web exec tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git commit -m "Add block insert menu for document canvas gaps."
```

---

### Task 3: Block inspector

**Files:**
- Create: `apps/web/components/admin/block-inspector.tsx`
- Modify: `apps/web/messages/fa.json`, `en.json`, `ar.json` (inspector empty + type labels if missing)

**Interfaces:**
- Consumes: `EditorBlock`, `BlockListEditorLabels` (extend type in `block-list-editor.tsx` or a shared labels type file)
- Produces: `BlockInspector` props:
  - `block: EditorBlock | null`
  - `canMoveUp` / `canMoveDown`
  - `labels`
  - `onChange: (patch) => void` / `onConvertType` / `onMove` / `onDelete` / `onPickFile`

UI:
- Empty: `labels.inspectorEmpty`
- Selected: Select type; conditional Field/Select for role/color/align; caption; media pickers / embed URL; ActionButtons move/delete
- Desktop: sticky panel `w-[280px]`
- Mobile: when `block` non-null, fixed bottom sheet (`z-[1100]`) with close control (`labels.closeInspector`)

Reuse `Select`, `Field`, `TextInput`, `ActionButton`. File pick UI can mirror the dashed card from current editor (extract small `MediaFilePicker` from existing `block-list-editor.tsx` into this file or a tiny shared module).

- [ ] **Step 1: Extend labels type + i18n keys** (`inspectorEmpty`, `closeInspector`, `addBlock` if not present)

- [ ] **Step 2: Implement inspector**

- [ ] **Step 3: `tsc --noEmit` + lint**

- [ ] **Step 4: Commit**

```bash
git commit -m "Add sticky/sheet block inspector for canvas editor."
```

---

### Task 4: Document canvas

**Files:**
- Create: `apps/web/components/admin/block-canvas.tsx`

**Interfaces:**
- Produces: `BlockCanvas` props:
  - `value: EditorBlock[]`
  - `selectedKey: string | null`
  - `onSelect: (key: string | null) => void`
  - `onChangeBlock: (key: string, patch: Partial<EditorBlock>) => void`
  - `onInsertAt: (index: number, type: EditorBlock['type']) => void`
  - `onPickFile?: ...`
  - `labels`
  - `textFocusKey?: string | null` — when set, focus that block’s textarea after insert

Behavior:
- White `rounded-card` canvas; map blocks with insert gap (`BlockInsertMenu variant="gap"`) **before** each block and `variant="end"` after last.
- Click block selects (stopPropagation on inputs so typing doesn’t bubble oddly).
- Click canvas background → `onSelect(null)`.
- Text: `contentEditable={false}` use `<textarea>` styled with imported `roleClasses`/`colorClasses`/`alignClasses` from `@/components/public/content-blocks/text-block` (transparent border, resize-none, w-full).
- Selected: `ring-2 ring-teal-700/40 rounded-button`.
- Image/audio/video: preview / pick as specified; no caption field on canvas.

- [ ] **Step 1: Implement canvas**

- [ ] **Step 2: Typecheck**

- [ ] **Step 3: Commit**

```bash
git commit -m "Add document canvas for styled in-place block editing."
```

---

### Task 5: Wire shell + keyboard; remove card stack

**Files:**
- Modify: `apps/web/components/admin/block-list-editor.tsx` (replace body; keep export name `BlockListEditor` + `BlockListEditorLabels`)
- Modify: `apps/web/components/admin/site-form.tsx` (pass new labels)
- Modify: messages if any keys still missing

**Interfaces:**
- Shell owns `selectedKey` state; on `onChange` from parent, if selected key missing from value, clear selection.
- Layout: `flex flex-col gap-4 lg:flex-row`; canvas `flex-1 min-w-0`; inspector aside.
- Keyboard: window listener when mounted — Escape deselects; Delete/Backspace deletes selected if `event.target` is not INPUT/TEXTAREA/SELECT and not `isContentEditable`.
- After insert: set selectedKey + optional textFocusKey.

- [ ] **Step 1: Rewrite `BlockListEditor` shell**

- [ ] **Step 2: Update `site-form` label wiring**

- [ ] **Step 3: Run** `pnpm --filter web test` and `tsc --noEmit`

- [ ] **Step 4: Manual sanity** — insert heading between paragraphs, change color in inspector, save still works (no API change)

- [ ] **Step 5: Commit**

```bash
git commit -m "Replace card-stack block editor with document canvas shell."
```

---

### Task 6: Design-system + spec status

**Files:**
- Modify: `design-system.md` — replace `BlockListEditor` card-stack section with canvas + inspector spec
- Modify: `docs/superpowers/specs/2026-07-21-document-canvas-editor-design.md` — Status Accepted (if not already)

- [ ] **Step 1: Update docs**

- [ ] **Step 2: Commit**

```bash
git commit -m "Document document-canvas block editor in design-system."
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Canvas + side inspector layout | 3, 4, 5 |
| Mobile bottom sheet | 3, 5 |
| Between-block + end insert | 2, 4 |
| In-place text styled by tokens | 4 |
| Caption in inspector only | 3, 4 |
| Reorder/delete in inspector | 3, 5 |
| Keyboard Escape / Delete | 5 |
| Same props / save wiring | 5 |
| design-system update | 6 |
| Helpers for convert/insert | 1 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-document-canvas-editor.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with checkpoints  

Which approach?
