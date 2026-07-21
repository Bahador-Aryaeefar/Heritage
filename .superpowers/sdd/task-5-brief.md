### Task 5: Span helpers + SpanTextEditor + format toolbar

**Files:**
- Create: `apps/web/lib/text-spans.ts`
- Create: `apps/web/lib/text-spans.test.ts`
- Create: `apps/web/components/admin/span-text-editor.tsx`
- Create: `apps/web/components/admin/format-toolbar.tsx`
- Modify: `apps/web/lib/copy-blocks-from-fa.ts` â€” `EditorTextBlock.spans: TextSpan[]` instead of `text: string`
- Modify: `apps/web/lib/block-editor-utils.ts` (+ tests) â€” defaults use `spans: [{ text: '' }]`
- Modify: `apps/web/messages/{fa,en,ar}.json` â€” keys under `admin.siteForm.block`: `bold`, `italic`, `link`, `unlink`, `linkPrompt`, `alignEnd`

**Interfaces:**
- `toggleMark(spans, selection, 'bold'|'italic'): TextSpan[]`
- `setLink(spans, selection, href: string | null): TextSpan[]`
- `spansToPlainText(spans): string`
- `normalizeSpans(spans): TextSpan[]` (merge adjacent identical marks)
- `SpanTextEditorProps`: `{ value: TextSpan[]; onChange(spans); className?; dir?; placeholder? }`
- `FormatToolbarProps`: `{ onBold(); onItalic(); onLink(); onUnlink(); labels }` â€” uses `ActionButton`/`rounded-button` chips matching inspector chips

**Editor approach (locked for this plan):**
- `contenteditable` div; on `input`/`blur`, walk DOM to rebuild spans (`STRONG`/`B` â†’ bold, `EM`/`I` â†’ italic, `A[href]` â†’ href).
- Toolbar uses `document.execCommand` **or** read selection offsets â†’ span helpers (prefer **offset-based helpers** for deterministic tests; execCommand OK for apply if serialize round-trips).
- Link: `window.prompt(labels.linkPrompt)`; empty string â†’ unlink.

- [ ] **Step 1: Failing unit tests** for `toggleMark`, `setLink`, `normalizeSpans`.

- [ ] **Step 2: Implement helpers** until tests PASS.

- [ ] **Step 3: Implement `SpanTextEditor` + `FormatToolbar`**; wire className from public `roleClasses`/`colorClasses`/`alignClasses`.

- [ ] **Step 4: Update `EditorTextBlock` to `spans`; fix all TS breakages in admin utils/tests (`text` â†’ `spans`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/text-spans.ts apps/web/lib/text-spans.test.ts apps/web/lib/copy-blocks-from-fa.ts apps/web/lib/block-editor-utils.ts apps/web/components/admin/span-text-editor.tsx apps/web/components/admin/format-toolbar.tsx apps/web/messages
git commit -m "Add span editing helpers and format toolbar for admin canvas."
```

---


