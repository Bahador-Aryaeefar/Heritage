# Task 6 Report: Canvas DnD reorder + inspector END + SpanTextEditor integration

**Status:** DONE  
**Branch:** `feat/editor-completeness`

## Summary

- **`reorderBlock(blocks, fromIndex, toIndex)`** in `lib/block-editor-utils.ts` — splices item to new index; no-op on out-of-bounds or same index (6 unit tests).
- **`BlockCanvas`**: HTML5 drag-and-drop reorder via grip handle on **selected** block only (avoids dragging while editing text); drop targets highlight; calls `onReorder(from, to)`.
- **`BlockListEditor`**: wires `handleReorder` → `reorderBlock`; move up/down unchanged.
- **`BlockInspector`**: align `Select` now includes **END** (`labels.alignEnd` — already in fa/en/ar from Task 5).
- **SpanTextEditor** on canvas was already integrated in Task 5; no further changes needed.

## Tests

`pnpm --filter web test` → **11/11 files, 66/66 PASS** (+6 reorderBlock tests).

## Commit

`6f0f9ef` — Integrate span editor, END align, and canvas drag-reorder.

## Concerns

- Drag handle `aria-label` / `title` are English-only ("Drag to reorder"); add i18n key if admin chrome should localize.
- DnD not covered by automated RTL/drag simulation test — manual smoke recommended.
- Full `tsc --noEmit` still has pre-existing worktree gaps unrelated to Task 6.

**Report:** `.superpowers/sdd/task-6-report.md`
