### Task 6: Canvas DnD reorder + inspector END + SpanTextEditor integration

**Files:**
- Modify: `apps/web/components/admin/block-canvas.tsx`
- Modify: `apps/web/components/admin/block-inspector.tsx`
- Modify: `apps/web/components/admin/block-list-editor.tsx`
- Modify: `apps/web/lib/block-editor-utils.ts` — add `reorderBlock(blocks, fromIndex, toIndex): EditorBlock[]` (+ test)

**Interfaces:**
- Canvas: replace textarea text blocks with `SpanTextEditor` + `FormatToolbar` when selected (toolbar above block or sticky under selection).
- HTML5 DnD: `draggable` on block wrapper; `onDragStart` set key; `onDragOver`/`onDrop` call `onReorder(from,to)`.
- Inspector align chips include End (`labels.alignEnd`).
- Keep move up/down buttons.

- [ ] **Step 1: Test** `reorderBlock` moves item and is no-op out of bounds.

- [ ] **Step 2: Implement reorder helper + wire canvas DnD + SpanTextEditor.

- [ ] **Step 3: Manual smoke (or RTL test): dropping block B before A swaps order in controlled state.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/block-canvas.tsx apps/web/components/admin/block-inspector.tsx apps/web/components/admin/block-list-editor.tsx apps/web/lib/block-editor-utils.ts apps/web/lib/block-editor-utils.test.ts
git commit -m "Integrate span editor, END align, and canvas drag-reorder."
```
