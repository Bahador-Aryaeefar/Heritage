BASE: 397c372a85d29cbd86e858e9187efcca2acb4ae7
HEAD: 7d8785f04ea43afb6d4b3c2ac021c2370c965fe0

## Commits

7d8785f Add span editing helpers and format toolbar for admin canvas.

## Stat

 apps/web/components/admin/block-canvas.tsx      |  56 ++++---
 apps/web/components/admin/block-list-editor.tsx |   6 +
 apps/web/components/admin/format-toolbar.tsx    |  50 ++++++
 apps/web/components/admin/site-form.tsx         |  10 +-
 apps/web/components/admin/span-text-editor.tsx  | 207 ++++++++++++++++++++++++
 apps/web/lib/block-editor-utils.test.ts         |  26 +--
 apps/web/lib/block-editor-utils.ts              |   8 +-
 apps/web/lib/copy-blocks-from-fa.test.ts        |  20 ++-
 apps/web/lib/copy-blocks-from-fa.ts             |  13 +-
 apps/web/lib/text-spans.test.ts                 | 122 ++++++++++++++
 apps/web/lib/text-spans.ts                      | 140 ++++++++++++++++
 apps/web/messages/ar.json                       |   6 +
 apps/web/messages/en.json                       |   6 +
 apps/web/messages/fa.json                       |   6 +
 design-system.md                                |   7 +-
 15 files changed, 626 insertions(+), 57 deletions(-)

## Diff
```diff

diff --git a/apps/web/components/admin/block-canvas.tsx b/apps/web/components/admin/block-canvas.tsx
index a044de1..e10b6e9 100644
--- a/apps/web/components/admin/block-canvas.tsx
+++ b/apps/web/components/admin/block-canvas.tsx
@@ -1,10 +1,12 @@
 'use client';
 
 import { Fragment, useEffect, useRef } from 'react';
 import { BlockInsertMenu } from '@/components/admin/block-insert-menu';
+import { FormatToolbar } from '@/components/admin/format-toolbar';
 import { MediaFilePicker } from '@/components/admin/media-file-picker';
+import { SpanTextEditor, type SpanTextEditorHandle } from '@/components/admin/span-text-editor';
 import { alignClasses, colorClasses, roleClasses } from '@/components/public/content-blocks/text-block';
 import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
 import type {
   EditorAudioBlock,
   EditorBlock,
@@ -22,19 +24,14 @@ type BlockCanvasProps = {
   onSelect: (key: string | null) => void;
   onChangeBlock: (key: string, patch: Partial<EditorBlock>) => void;
   onInsertAt: (index: number, type: EditorBlock['type']) => void;
   onPickFile?: (block: EditorImageBlock | EditorAudioBlock, file: File) => void;
   labels: BlockCanvasLabels;
-  /** When set, focus that block's in-canvas textarea (text blocks only) once after an insert. */
+  /** When set, focus that block's in-canvas editor (text blocks only) once after an insert. */
   textFocusKey?: string | null;
 };
 
-function autoResize(el: HTMLTextAreaElement) {
-  el.style.height = 'auto';
-  el.style.height = `${el.scrollHeight}px`;
-}
-
 function isValidEmbedUrl(value: string): boolean {
   if (!value.trim()) return false;
   try {
     const parsed = new URL(value);
     return parsed.protocol === 'http:' || parsed.protocol === 'https:';
@@ -44,11 +41,11 @@ function isValidEmbedUrl(value: string): boolean {
 }
 
 /**
  * Document canvas: a single white `rounded-card` surface that renders `EditorBlock[]` styled the
  * way the public article body renders them (`roleClasses`/`colorClasses`/`alignClasses` from
- * `TextBlock`), with in-place text editing and "+" insert gaps between blocks. Fully controlled GÇö
+ * `TextBlock`), with in-place span editing and "+" insert gaps between blocks. Fully controlled GÇö
  * the caller (`BlockListEditor` shell, Task 5) owns `selectedKey` and applies `onChangeBlock` /
  * `onInsertAt` to its flat `EditorBlock[]` state. Style/type/caption/media/reorder/delete controls
  * live in `BlockInspector`, not here.
  */
 export function BlockCanvas({
@@ -59,34 +56,45 @@ export function BlockCanvas({
   onInsertAt,
   onPickFile,
   labels,
   textFocusKey,
 }: BlockCanvasProps) {
-  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
-
-  useEffect(() => {
-    textareaRefs.current.forEach((el) => autoResize(el));
-  });
+  const editorRef = useRef<SpanTextEditorHandle>(null);
 
   useEffect(() => {
     if (!textFocusKey) return;
-    textareaRefs.current.get(textFocusKey)?.focus();
+    editorRef.current?.focus();
   }, [textFocusKey]);
 
   function renderTextBlock(block: EditorTextBlock) {
+    const selected = selectedKey === block.key;
+
     return (
-      <textarea
-        ref={(el) => {
-          if (el) textareaRefs.current.set(block.key, el);
-          else textareaRefs.current.delete(block.key);
-        }}
-        value={block.text}
-        onChange={(event) => onChangeBlock(block.key, { text: event.target.value })}
-        rows={1}
-        placeholder={block.type === 'HEADING' ? labels.headingTitle : labels.paragraphTitle}
-        className={`w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-brown-600/40 ${roleClasses[block.textRole]} ${colorClasses[block.colorToken]} ${alignClasses[block.align]}`}
-      />
+      <>
+        {selected ? (
+          <FormatToolbar
+            labels={{
+              bold: labels.bold,
+              italic: labels.italic,
+              link: labels.link,
+              unlink: labels.unlink,
+            }}
+            onBold={() => editorRef.current?.toggleBold()}
+            onItalic={() => editorRef.current?.toggleItalic()}
+            onLink={() => editorRef.current?.promptLink()}
+            onUnlink={() => editorRef.current?.unlink()}
+          />
+        ) : null}
+        <SpanTextEditor
+          ref={selected ? editorRef : undefined}
+          value={block.spans}
+          onChange={(spans) => onChangeBlock(block.key, { spans })}
+          placeholder={block.type === 'HEADING' ? labels.headingTitle : labels.paragraphTitle}
+          labels={{ linkPrompt: labels.linkPrompt }}
+          className={`${roleClasses[block.textRole]} ${colorClasses[block.colorToken]} ${alignClasses[block.align]}`}
+        />
+      </>
     );
   }
 
   function renderImageBlock(block: EditorImageBlock) {
     return (
diff --git a/apps/web/components/admin/block-list-editor.tsx b/apps/web/components/admin/block-list-editor.tsx
index eefd89c..59fcaec 100644
--- a/apps/web/components/admin/block-list-editor.tsx
+++ b/apps/web/components/admin/block-list-editor.tsx
@@ -49,10 +49,16 @@ export type BlockListEditorLabels = {
   colorBrown600: string;
   colorTeal700: string;
   colorSand50: string;
   alignStart: string;
   alignCenter: string;
+  alignEnd: string;
+  bold: string;
+  italic: string;
+  link: string;
+  unlink: string;
+  linkPrompt: string;
   pickImage: string;
   changeImage: string;
   removeImage: string;
   pickAudio: string;
   changeAudio: string;
diff --git a/apps/web/components/admin/format-toolbar.tsx b/apps/web/components/admin/format-toolbar.tsx
new file mode 100644
index 0000000..b4b140c
--- /dev/null
+++ b/apps/web/components/admin/format-toolbar.tsx
@@ -0,0 +1,50 @@
+'use client';
+
+type FormatToolbarLabels = {
+  bold: string;
+  italic: string;
+  link: string;
+  unlink: string;
+};
+
+export type FormatToolbarProps = {
+  onBold: () => void;
+  onItalic: () => void;
+  onLink: () => void;
+  onUnlink: () => void;
+  labels: FormatToolbarLabels;
+};
+
+function ToolbarChip({
+  label,
+  onClick,
+}: {
+  label: string;
+  onClick: () => void;
+}) {
+  return (
+    <button
+      type="button"
+      onClick={onClick}
+      className="rounded-button border border-brown-800/15 bg-white px-2.5 py-1.5 text-xs font-bold text-brown-800 transition-colors outline-none hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-teal-700/15"
+    >
+      {label}
+    </button>
+  );
+}
+
+export function FormatToolbar({ onBold, onItalic, onLink, onUnlink, labels }: FormatToolbarProps) {
+  return (
+    <div
+      role="toolbar"
+      aria-label={labels.bold}
+      className="mb-2 flex flex-wrap gap-1.5"
+      onClick={(event) => event.stopPropagation()}
+    >
+      <ToolbarChip label={labels.bold} onClick={onBold} />
+      <ToolbarChip label={labels.italic} onClick={onItalic} />
+      <ToolbarChip label={labels.link} onClick={onLink} />
+      <ToolbarChip label={labels.unlink} onClick={onUnlink} />
+    </div>
+  );
+}
diff --git a/apps/web/components/admin/site-form.tsx b/apps/web/components/admin/site-form.tsx
index 1c122c6..9b59f42 100644
--- a/apps/web/components/admin/site-form.tsx
+++ b/apps/web/components/admin/site-form.tsx
@@ -62,11 +62,11 @@ function toEditorBlocks(blocks: AdminSite['translations'][number]['blocks']): Ed
       case 'HEADING':
       case 'PARAGRAPH':
         return {
           key: createBlockKey(),
           type: block.type,
-          text: block.spans.map((span) => span.text).join(''),
+          spans: block.spans.map((span) => ({ ...span })),
           textRole: block.textRole,
           colorToken: block.colorToken,
           align: block.align,
         };
       case 'IMAGE':
@@ -178,10 +178,16 @@ export function SiteForm({ site }: SiteFormProps) {
     colorBrown600: tb('colorBrown600'),
     colorTeal700: tb('colorTeal700'),
     colorSand50: tb('colorSand50'),
     alignStart: tb('alignStart'),
     alignCenter: tb('alignCenter'),
+    alignEnd: tb('alignEnd'),
+    bold: tb('bold'),
+    italic: tb('italic'),
+    link: tb('link'),
+    unlink: tb('unlink'),
+    linkPrompt: tb('linkPrompt'),
     pickImage: t('pickImage'),
     changeImage: t('changeImage'),
     removeImage: t('removeImage'),
     pickAudio: tb('pickAudio'),
     changeAudio: tb('changeAudio'),
@@ -277,11 +283,11 @@ export function SiteForm({ site }: SiteFormProps) {
               out.push({
                 type: block.type,
                 textRole: block.textRole,
                 colorToken: block.colorToken,
                 align: block.align,
-                text: block.text,
+                spans: block.spans,
               });
               break;
             case 'VIDEO':
               out.push({
                 type: 'VIDEO',
diff --git a/apps/web/components/admin/span-text-editor.tsx b/apps/web/components/admin/span-text-editor.tsx
new file mode 100644
index 0000000..455d8e9
--- /dev/null
+++ b/apps/web/components/admin/span-text-editor.tsx
@@ -0,0 +1,207 @@
+'use client';
+
+import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
+import type { TextSpan } from '@heritage/shared-types';
+import {
+  normalizeSpans,
+  setLink,
+  spansToPlainText,
+  toggleMark,
+  type TextSelection,
+} from '@/lib/text-spans';
+
+export type SpanTextEditorLabels = {
+  linkPrompt: string;
+};
+
+export type SpanTextEditorProps = {
+  value: TextSpan[];
+  onChange: (spans: TextSpan[]) => void;
+  className?: string;
+  dir?: 'ltr' | 'rtl';
+  placeholder?: string;
+  labels: SpanTextEditorLabels;
+};
+
+export type SpanTextEditorHandle = {
+  focus: () => void;
+  toggleBold: () => void;
+  toggleItalic: () => void;
+  promptLink: () => void;
+  unlink: () => void;
+};
+
+function escapeHtml(text: string): string {
+  return text
+    .replaceAll('&', '&amp;')
+    .replaceAll('<', '&lt;')
+    .replaceAll('>', '&gt;')
+    .replaceAll('"', '&quot;');
+}
+
+function escapeAttr(value: string): string {
+  return escapeHtml(value).replaceAll("'", '&#39;');
+}
+
+function spanToHtml(span: TextSpan): string {
+  let html = escapeHtml(span.text);
+  if (span.bold) html = `<strong>${html}</strong>`;
+  if (span.italic) html = `<em>${html}</em>`;
+  if (span.href) html = `<a href="${escapeAttr(span.href)}">${html}</a>`;
+  return html;
+}
+
+function spansToHtml(spans: TextSpan[]): string {
+  return spans.map(spanToHtml).join('');
+}
+
+function collectMarks(element: Element, inherited: Partial<TextSpan>): Partial<TextSpan> {
+  const marks: Partial<TextSpan> = { ...inherited };
+  const tag = element.tagName;
+
+  if (tag === 'STRONG' || tag === 'B') marks.bold = true;
+  if (tag === 'EM' || tag === 'I') marks.italic = true;
+  if (tag === 'A') {
+    const href = element.getAttribute('href')?.trim();
+    if (href) marks.href = href;
+  }
+
+  return marks;
+}
+
+function domToSpans(root: HTMLElement): TextSpan[] {
+  const spans: TextSpan[] = [];
+
+  function walk(node: Node, inherited: Partial<TextSpan>): void {
+    if (node.nodeType === Node.TEXT_NODE) {
+      const text = node.textContent ?? '';
+      if (!text) return;
+      const span: TextSpan = { text };
+      if (inherited.bold) span.bold = true;
+      if (inherited.italic) span.italic = true;
+      if (inherited.href) span.href = inherited.href;
+      spans.push(span);
+      return;
+    }
+
+    if (node.nodeType !== Node.ELEMENT_NODE) return;
+    const element = node as Element;
+    if (element.tagName === 'BR') {
+      spans.push({ text: '\n', ...(inherited.bold ? { bold: true } : {}), ...(inherited.italic ? { italic: true } : {}), ...(inherited.href ? { href: inherited.href } : {}) });
+      return;
+    }
+
+    const marks = collectMarks(element, inherited);
+    for (const child of element.childNodes) {
+      walk(child, marks);
+    }
+  }
+
+  for (const child of root.childNodes) {
+    walk(child, {});
+  }
+
+  return normalizeSpans(spans.length > 0 ? spans : [{ text: '' }]);
+}
+
+function getSelectionOffsets(root: HTMLElement): TextSelection | null {
+  const selection = window.getSelection();
+  if (!selection || selection.rangeCount === 0) return null;
+
+  const range = selection.getRangeAt(0);
+  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
+    return null;
+  }
+
+  const startRange = range.cloneRange();
+  startRange.selectNodeContents(root);
+  startRange.setEnd(range.startContainer, range.startOffset);
+
+  const endRange = range.cloneRange();
+  endRange.selectNodeContents(root);
+  endRange.setEnd(range.endContainer, range.endOffset);
+
+  return {
+    start: startRange.toString().length,
+    end: endRange.toString().length,
+  };
+}
+
+function isEmptySpans(spans: TextSpan[]): boolean {
+  return spans.length === 1 && spans[0]!.text === '' && !spans[0]!.bold && !spans[0]!.italic && !spans[0]!.href;
+}
+
+export const SpanTextEditor = forwardRef<SpanTextEditorHandle, SpanTextEditorProps>(
+  function SpanTextEditor({ value, onChange, className = '', dir, placeholder, labels }, ref) {
+    const editorRef = useRef<HTMLDivElement>(null);
+    const lastPlainRef = useRef(spansToPlainText(value));
+    const syncingRef = useRef(false);
+
+    useEffect(() => {
+      const root = editorRef.current;
+      if (!root || syncingRef.current) return;
+
+      const plain = spansToPlainText(value);
+      if (plain === lastPlainRef.current && root.innerText === plain) return;
+
+      syncingRef.current = true;
+      root.innerHTML = isEmptySpans(value) ? '' : spansToHtml(value);
+      lastPlainRef.current = plain;
+      syncingRef.current = false;
+    }, [value]);
+
+    function emitFromDom() {
+      const root = editorRef.current;
+      if (!root || syncingRef.current) return;
+
+      const spans = domToSpans(root);
+      lastPlainRef.current = spansToPlainText(spans);
+      onChange(spans);
+    }
+
+    function applyFormat(action: (spans: TextSpan[], selection: TextSelection) => TextSpan[]) {
+      const root = editorRef.current;
+      if (!root) return;
+
+      const selection = getSelectionOffsets(root);
+      if (!selection) return;
+
+      const next = action(value, selection);
+      onChange(next);
+    }
+
+    useImperativeHandle(ref, () => ({
+      focus: () => {
+        editorRef.current?.focus();
+      },
+      toggleBold: () => {
+        applyFormat((spans, selection) => toggleMark(spans, selection, 'bold'));
+      },
+      toggleItalic: () => {
+        applyFormat((spans, selection) => toggleMark(spans, selection, 'italic'));
+      },
+      promptLink: () => {
+        const href = window.prompt(labels.linkPrompt);
+        if (href === null) return;
+        applyFormat((spans, selection) => setLink(spans, selection, href));
+      },
+      unlink: () => {
+        applyFormat((spans, selection) => setLink(spans, selection, null));
+      },
+    }));
+
+    return (
+      <div
+        ref={editorRef}
+        contentEditable
+        suppressContentEditableWarning
+        dir={dir}
+        data-placeholder={placeholder}
+        onInput={() => emitFromDom()}
+        onBlur={() => emitFromDom()}
+        onClick={(event) => event.stopPropagation()}
+        className={`min-h-[1.5em] w-full whitespace-pre-wrap break-words outline-none empty:before:pointer-events-none empty:before:text-brown-600/40 empty:before:content-[attr(data-placeholder)] ${className}`}
+      />
+    );
+  },
+);
diff --git a/apps/web/lib/block-editor-utils.test.ts b/apps/web/lib/block-editor-utils.test.ts
index 26f36ca..55455e0 100644
--- a/apps/web/lib/block-editor-utils.test.ts
+++ b/apps/web/lib/block-editor-utils.test.ts
@@ -12,11 +12,11 @@ describe('createEmptyBlock', () => {
     const block = createEmptyBlock('HEADING');
     expect(block.type).toBe('HEADING');
     expect(block.key).toBeTruthy();
     if (block.type !== 'HEADING') throw new Error('expected HEADING');
     expect(block).toMatchObject({
-      text: '',
+      spans: [{ text: '' }],
       textRole: 'H2',
       colorToken: 'BROWN_950',
       align: 'START',
     });
   });
@@ -24,11 +24,11 @@ describe('createEmptyBlock', () => {
   it('creates PARAGRAPH with default text styling', () => {
     const block = createEmptyBlock('PARAGRAPH');
     expect(block.type).toBe('PARAGRAPH');
     if (block.type !== 'PARAGRAPH') throw new Error('expected PARAGRAPH');
     expect(block).toMatchObject({
-      text: '',
+      spans: [{ text: '' }],
       textRole: 'BODY',
       colorToken: 'BROWN_800',
       align: 'START',
     });
   });
@@ -53,56 +53,56 @@ describe('createEmptyBlock', () => {
     expect((block as { mediaId?: string }).mediaId).toBeUndefined();
   });
 });
 
 describe('convertBlockType', () => {
-  it('keeps text when converting HEADING to PARAGRAPH and applies paragraph defaults', () => {
+  it('keeps spans when converting HEADING to PARAGRAPH and applies paragraph defaults', () => {
     const block: EditorBlock = {
       key: 'keep-me',
       type: 'HEADING',
-      text: 'Hello',
+      spans: [{ text: 'Hello', bold: true }],
       textRole: 'HERO',
       colorToken: 'TEAL_700',
       align: 'CENTER',
     };
 
     const next = convertBlockType(block, 'PARAGRAPH');
 
     expect(next.key).toBe('keep-me');
     expect(next).toMatchObject({
       type: 'PARAGRAPH',
-      text: 'Hello',
+      spans: [{ text: 'Hello', bold: true }],
       textRole: 'BODY',
       colorToken: 'BROWN_800',
       align: 'START',
     });
   });
 
-  it('drops text when converting PARAGRAPH to IMAGE', () => {
+  it('drops spans when converting PARAGRAPH to IMAGE', () => {
     const block: EditorBlock = {
       key: 'p1',
       type: 'PARAGRAPH',
-      text: 'Body copy',
+      spans: [{ text: 'Body copy' }],
       textRole: 'BODY',
       colorToken: 'BROWN_800',
       align: 'START',
     };
 
     const next = convertBlockType(block, 'IMAGE');
 
     expect(next.key).toBe('p1');
     expect(next).toMatchObject({ type: 'IMAGE', caption: '' });
-    expect('text' in next).toBe(false);
+    expect('spans' in next).toBe(false);
     expect((next as { mediaId?: string }).mediaId).toBeUndefined();
   });
 });
 
 describe('moveBlock', () => {
   const blocks: EditorBlock[] = [
-    { key: 'a', type: 'HEADING', text: 'A', textRole: 'H2', colorToken: 'BROWN_950', align: 'START' },
-    { key: 'b', type: 'PARAGRAPH', text: 'B', textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
-    { key: 'c', type: 'PARAGRAPH', text: 'C', textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
+    { key: 'a', type: 'HEADING', spans: [{ text: 'A' }], textRole: 'H2', colorToken: 'BROWN_950', align: 'START' },
+    { key: 'b', type: 'PARAGRAPH', spans: [{ text: 'B' }], textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
+    { key: 'c', type: 'PARAGRAPH', spans: [{ text: 'C' }], textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
   ];
 
   it('swaps a block with the one above when moving up', () => {
     const moved = moveBlock(blocks, 'b', 'up');
     expect(moved.map((b) => b.key)).toEqual(['b', 'a', 'c']);
@@ -130,20 +130,20 @@ describe('moveBlock', () => {
   });
 });
 
 describe('insertBlockAt', () => {
   const blocks: EditorBlock[] = [
-    { key: 'a', type: 'HEADING', text: 'A', textRole: 'H2', colorToken: 'BROWN_950', align: 'START' },
+    { key: 'a', type: 'HEADING', spans: [{ text: 'A' }], textRole: 'H2', colorToken: 'BROWN_950', align: 'START' },
   ];
 
   it('inserts a new block at the given index and returns its key', () => {
     const { blocks: next, key } = insertBlockAt(blocks, 1, 'PARAGRAPH');
 
     expect(next).toHaveLength(2);
     expect(next[0]!.key).toBe('a');
     expect(next[1]!.key).toBe(key);
-    expect(next[1]).toMatchObject({ type: 'PARAGRAPH', text: '' });
+    expect(next[1]).toMatchObject({ type: 'PARAGRAPH', spans: [{ text: '' }] });
   });
 
   it('inserts at the start when index is 0', () => {
     const { blocks: next, key } = insertBlockAt(blocks, 0, 'IMAGE');
 
diff --git a/apps/web/lib/block-editor-utils.ts b/apps/web/lib/block-editor-utils.ts
index e665390..1fa7a2a 100644
--- a/apps/web/lib/block-editor-utils.ts
+++ b/apps/web/lib/block-editor-utils.ts
@@ -8,10 +8,12 @@ import {
 
 type EditorBlockType = EditorBlock['type'];
 
 const TEXT_TYPES = new Set<EditorBlockType>(['HEADING', 'PARAGRAPH']);
 
+const EMPTY_SPANS = [{ text: '' }] as const;
+
 function isTextBlockType(type: EditorBlockType): boolean {
   return TEXT_TYPES.has(type);
 }
 
 function textDefaults(type: 'HEADING' | 'PARAGRAPH'): {
@@ -29,11 +31,11 @@ export function createEmptyBlock(type: EditorBlockType): EditorBlock {
   const key = createBlockKey();
 
   switch (type) {
     case 'HEADING':
     case 'PARAGRAPH':
-      return { key, type, text: '', ...textDefaults(type) };
+      return { key, type, spans: [{ text: '' }], ...textDefaults(type) };
     case 'IMAGE':
       return { key, type: 'IMAGE', caption: '' };
     case 'AUDIO':
       return { key, type: 'AUDIO', caption: '' };
     case 'VIDEO':
@@ -48,11 +50,11 @@ export function convertBlockType(block: EditorBlock, next: EditorBlockType): Edi
 
   if (fromText && toText) {
     return {
       key,
       type: next,
-      text: block.text,
+      spans: block.spans.map((span) => ({ ...span })),
       ...textDefaults(next),
     };
   }
 
   if (fromText && !toText) {
@@ -61,11 +63,11 @@ export function convertBlockType(block: EditorBlock, next: EditorBlockType): Edi
 
   if (!fromText && toText) {
     return {
       key,
       type: next,
-      text: '',
+      spans: [...EMPTY_SPANS],
       ...textDefaults(next),
     };
   }
 
   const caption = 'caption' in block ? block.caption : '';
diff --git a/apps/web/lib/copy-blocks-from-fa.test.ts b/apps/web/lib/copy-blocks-from-fa.test.ts
index 2507825..4f8d636 100644
--- a/apps/web/lib/copy-blocks-from-fa.test.ts
+++ b/apps/web/lib/copy-blocks-from-fa.test.ts
@@ -2,36 +2,44 @@ import { describe, expect, it } from 'vitest';
 import { copyBlocksFromFa, type EditorBlock } from './copy-blocks-from-fa';
 
 describe('copyBlocksFromFa', () => {
   it('gives every copied block a new, unique key', () => {
     const fa: EditorBlock[] = [
-      { key: 'fa-1', type: 'HEADING', text: 'Title', textRole: 'H2', colorToken: 'BROWN_800', align: 'START' },
-      { key: 'fa-2', type: 'PARAGRAPH', text: 'Body', textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
+      { key: 'fa-1', type: 'HEADING', spans: [{ text: 'Title' }], textRole: 'H2', colorToken: 'BROWN_800', align: 'START' },
+      { key: 'fa-2', type: 'PARAGRAPH', spans: [{ text: 'Body' }], textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
     ];
 
     const copied = copyBlocksFromFa(fa);
 
     expect(copied).toHaveLength(2);
     expect(copied[0]!.key).not.toBe('fa-1');
     expect(copied[1]!.key).not.toBe('fa-2');
     expect(new Set(copied.map((b) => b.key)).size).toBe(2);
   });
 
-  it('copies text/textRole/colorToken/align for HEADING and PARAGRAPH blocks', () => {
+  it('copies spans/textRole/colorToken/align for HEADING and PARAGRAPH blocks', () => {
     const fa: EditorBlock[] = [
-      { key: 'fa-1', type: 'HEADING', text: '+¦+å+ê+º+å', textRole: 'HERO', colorToken: 'TEAL_700', align: 'CENTER' },
+      {
+        key: 'fa-1',
+        type: 'HEADING',
+        spans: [{ text: '+¦+å+ê+º+å', bold: true }],
+        textRole: 'HERO',
+        colorToken: 'TEAL_700',
+        align: 'CENTER',
+      },
     ];
 
     const [copied] = copyBlocksFromFa(fa);
 
     expect(copied).toMatchObject({
       type: 'HEADING',
-      text: '+¦+å+ê+º+å',
+      spans: [{ text: '+¦+å+ê+º+å', bold: true }],
       textRole: 'HERO',
       colorToken: 'TEAL_700',
       align: 'CENTER',
     });
+    expect(copied!.key).not.toBe('fa-1');
   });
 
   it('preserves mediaId for an IMAGE block that already has an uploaded file', () => {
     const fa: EditorBlock[] = [
       { key: 'fa-img', type: 'IMAGE', caption: 'Cover shot', mediaId: 'media_123' },
@@ -105,11 +113,11 @@ describe('copyBlocksFromFa', () => {
     expect((copied as { mediaId?: string }).mediaId).toBeUndefined();
   });
 
   it('preserves order and does not mutate the input array', () => {
     const fa: EditorBlock[] = [
-      { key: 'fa-1', type: 'HEADING', text: 'A', textRole: 'H2', colorToken: 'BROWN_800', align: 'START' },
+      { key: 'fa-1', type: 'HEADING', spans: [{ text: 'A' }], textRole: 'H2', colorToken: 'BROWN_800', align: 'START' },
       { key: 'fa-2', type: 'IMAGE', caption: 'B', mediaId: 'media_1' },
       { key: 'fa-3', type: 'AUDIO', caption: 'C' },
     ];
     const snapshot = JSON.parse(JSON.stringify(fa));
 
diff --git a/apps/web/lib/copy-blocks-from-fa.ts b/apps/web/lib/copy-blocks-from-fa.ts
index 1e40803..55324ef 100644
--- a/apps/web/lib/copy-blocks-from-fa.ts
+++ b/apps/web/lib/copy-blocks-from-fa.ts
@@ -1,22 +1,23 @@
 /**
  * Editor-side shape for `SiteContentBlock` rows (see `heritage-schema-map.md` -º"SiteContentBlock").
  * Mirrors the admin write schemas in `@heritage/shared-types`
  * (`adminTextBlockWriteSchema` / `adminImageBlockWriteSchema` / `adminAudioBlockWriteSchema` /
  * `adminVideoBlockWriteSchema`) plus a client-only `key` for React list identity and, for images,
- * a `previewUrl` to render a thumbnail before upload. Text blocks use a single `text` string here
- * (no inline bold/italic spans) GÇö the editor does not expose span-level formatting yet.
+ * a `previewUrl` to render a thumbnail before upload.
  */
 
+import type { TextSpan } from '@heritage/shared-types';
+
 export type EditorTextRole = 'HERO' | 'H2' | 'H3' | 'BODY' | 'CAPTION';
 export type EditorColorToken = 'BROWN_950' | 'BROWN_800' | 'BROWN_600' | 'TEAL_700' | 'SAND_50';
-export type EditorAlign = 'START' | 'CENTER';
+export type EditorAlign = 'START' | 'CENTER' | 'END';
 
 export type EditorTextBlock = {
   key: string;
   type: 'HEADING' | 'PARAGRAPH';
-  text: string;
+  spans: TextSpan[];
   textRole: EditorTextRole;
   colorToken: EditorColorToken;
   align: EditorAlign;
 };
 
@@ -55,11 +56,11 @@ export function createBlockKey(): string {
   return `blk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
 }
 
 /**
  * Start an EN (or other locale) block list from the FA blocks: new client keys, same order,
- * same starting text/caption/embedUrl values, `mediaId` kept (the underlying file already lives
+ * same starting span/caption/embedUrl values, `mediaId` kept (the underlying file already lives
  * on the server so both locales can reference it). `clientFileKey`/`previewUrl` are dropped GÇö
  * they point at a file staged for the FA tab's own upload; the target locale must pick its own
  * file (or keep the shared `mediaId` if there is one) rather than silently reusing FA's pending upload.
  */
 export function copyBlocksFromFa(fa: EditorBlock[]): EditorBlock[] {
@@ -70,11 +71,11 @@ export function copyBlocksFromFa(fa: EditorBlock[]): EditorBlock[] {
       case 'HEADING':
       case 'PARAGRAPH':
         return {
           key,
           type: block.type,
-          text: block.text,
+          spans: block.spans.map((span) => ({ ...span })),
           textRole: block.textRole,
           colorToken: block.colorToken,
           align: block.align,
         };
       case 'VIDEO':
diff --git a/apps/web/lib/text-spans.test.ts b/apps/web/lib/text-spans.test.ts
new file mode 100644
index 0000000..381a176
--- /dev/null
+++ b/apps/web/lib/text-spans.test.ts
@@ -0,0 +1,122 @@
+import { describe, expect, it } from 'vitest';
+import type { TextSpan } from '@heritage/shared-types';
+import {
+  normalizeSpans,
+  setLink,
+  spansToPlainText,
+  toggleMark,
+  type TextSelection,
+} from './text-spans';
+
+const sel = (start: number, end: number): TextSelection => ({ start, end });
+
+describe('spansToPlainText', () => {
+  it('joins span text in order', () => {
+    expect(spansToPlainText([{ text: 'Hello' }, { text: ' world' }])).toBe('Hello world');
+  });
+});
+
+describe('normalizeSpans', () => {
+  it('merges adjacent spans with identical marks', () => {
+    expect(
+      normalizeSpans([
+        { text: 'a', bold: true },
+        { text: 'b', bold: true },
+      ]),
+    ).toEqual([{ text: 'ab', bold: true }]);
+  });
+
+  it('does not merge spans with different marks', () => {
+    expect(
+      normalizeSpans([
+        { text: 'a', bold: true },
+        { text: 'b' },
+      ]),
+    ).toEqual([{ text: 'a', bold: true }, { text: 'b' }]);
+  });
+
+  it('merges spans that share href, bold, and italic', () => {
+    expect(
+      normalizeSpans([
+        { text: 'a', href: 'https://x.test', bold: true, italic: true },
+        { text: 'b', href: 'https://x.test', bold: true, italic: true },
+      ]),
+    ).toEqual([{ text: 'ab', href: 'https://x.test', bold: true, italic: true }]);
+  });
+
+  it('returns a single empty span for empty input', () => {
+    expect(normalizeSpans([])).toEqual([{ text: '' }]);
+  });
+
+  it('drops empty spans except when it is the only span', () => {
+    expect(normalizeSpans([{ text: '' }, { text: 'hi' }])).toEqual([{ text: 'hi' }]);
+  });
+});
+
+describe('toggleMark', () => {
+  it('applies bold to a selection', () => {
+    const spans: TextSpan[] = [{ text: 'Hello world' }];
+    expect(toggleMark(spans, sel(0, 5), 'bold')).toEqual([
+      { text: 'Hello', bold: true },
+      { text: ' world' },
+    ]);
+  });
+
+  it('removes bold when the entire selection is already bold', () => {
+    const spans: TextSpan[] = [{ text: 'Hello', bold: true }, { text: ' world' }];
+    expect(toggleMark(spans, sel(0, 5), 'bold')).toEqual([{ text: 'Hello world' }]);
+  });
+
+  it('toggles italic on a middle segment', () => {
+    const spans: TextSpan[] = [{ text: 'Hello world' }];
+    expect(toggleMark(spans, sel(6, 11), 'italic')).toEqual([
+      { text: 'Hello ' },
+      { text: 'world', italic: true },
+    ]);
+  });
+
+  it('adds bold to part of an already-bold span', () => {
+    const spans: TextSpan[] = [{ text: 'Hello world', bold: true }];
+    expect(toggleMark(spans, sel(0, 5), 'bold')).toEqual([
+      { text: 'Hello' },
+      { text: ' world', bold: true },
+    ]);
+  });
+
+  it('leaves spans unchanged for an empty selection', () => {
+    const spans: TextSpan[] = [{ text: 'Hello' }];
+    expect(toggleMark(spans, sel(2, 2), 'bold')).toEqual([{ text: 'Hello' }]);
+  });
+});
+
+describe('setLink', () => {
+  it('sets href on a selection', () => {
+    const spans: TextSpan[] = [{ text: 'Visit site' }];
+    expect(setLink(spans, sel(0, 5), 'https://example.com')).toEqual([
+      { text: 'Visit', href: 'https://example.com' },
+      { text: ' site' },
+    ]);
+  });
+
+  it('clears href when href is null', () => {
+    const spans: TextSpan[] = [{ text: 'Visit', href: 'https://example.com' }, { text: ' site' }];
+    expect(setLink(spans, sel(0, 5), null)).toEqual([{ text: 'Visit site' }]);
+  });
+
+  it('clears href when href is an empty string', () => {
+    const spans: TextSpan[] = [{ text: 'Visit', href: 'https://example.com' }];
+    expect(setLink(spans, sel(0, 5), '')).toEqual([{ text: 'Visit' }]);
+  });
+
+  it('preserves bold and italic when setting a link', () => {
+    const spans: TextSpan[] = [{ text: 'Visit', bold: true, italic: true }];
+    expect(setLink(spans, sel(0, 5), 'https://example.com')).toEqual([
+      { text: 'Visit', href: 'https://example.com', bold: true, italic: true },
+    ]);
+  });
+
+  it('leaves spans unchanged for an empty selection', () => {
+    const spans: TextSpan[] = [{ text: 'Hello' }];
+    expect(setLink(spans, sel(1, 1), 'https://example.com')).toEqual([{ text: 'Hello' }]);
+  });
+});
diff --git a/apps/web/lib/text-spans.ts b/apps/web/lib/text-spans.ts
new file mode 100644
index 0000000..6d2c265
--- /dev/null
+++ b/apps/web/lib/text-spans.ts
@@ -0,0 +1,140 @@
+import type { TextSpan } from '@heritage/shared-types';
+
+export type TextSelection = { start: number; end: number };
+
+type CharMark = {
+  char: string;
+  bold?: boolean;
+  italic?: boolean;
+  href?: string;
+};
+
+function markKey(span: Pick<TextSpan, 'bold' | 'italic' | 'href'>): string {
+  return `${Boolean(span.bold)}|${Boolean(span.italic)}|${span.href ?? ''}`;
+}
+
+function toTextSpan(mark: CharMark): TextSpan {
+  const span: TextSpan = { text: mark.char };
+  if (mark.bold) span.bold = true;
+  if (mark.italic) span.italic = true;
+  if (mark.href) span.href = mark.href;
+  return span;
+}
+
+function flattenSpans(spans: TextSpan[]): CharMark[] {
+  const chars: CharMark[] = [];
+  for (const span of spans) {
+    for (const char of span.text) {
+      const mark: CharMark = { char };
+      if (span.bold) mark.bold = true;
+      if (span.italic) mark.italic = true;
+      if (span.href) mark.href = span.href;
+      chars.push(mark);
+    }
+  }
+  return chars;
+}
+
+function unflattenChars(chars: CharMark[]): TextSpan[] {
+  if (chars.length === 0) return [{ text: '' }];
+
+  const spans: TextSpan[] = [];
+  let current = toTextSpan(chars[0]!);
+
+  for (let index = 1; index < chars.length; index += 1) {
+    const next = toTextSpan(chars[index]!);
+    if (markKey(current) === markKey(next)) {
+      current.text += next.text;
+    } else {
+      spans.push(current);
+      current = next;
+    }
+  }
+
+  spans.push(current);
+  return normalizeSpans(spans);
+}
+
+export function spansToPlainText(spans: TextSpan[]): string {
+  return spans.map((span) => span.text).join('');
+}
+
+export function normalizeSpans(spans: TextSpan[]): TextSpan[] {
+  const merged: TextSpan[] = [];
+
+  for (const span of spans) {
+    if (span.text === '' && merged.length > 0) continue;
+
+    const next: TextSpan = { text: span.text };
+    if (span.bold) next.bold = true;
+    if (span.italic) next.italic = true;
+    if (span.href) next.href = span.href;
+
+    const last = merged[merged.length - 1];
+    if (last && markKey(last) === markKey(next)) {
+      last.text += next.text;
+    } else {
+      merged.push(next);
+    }
+  }
+
+  if (merged.length === 0) return [{ text: '' }];
+  return merged;
+}
+
+function clampSelection(selection: TextSelection): { start: number; end: number } {
+  const start = Math.min(selection.start, selection.end);
+  const end = Math.max(selection.start, selection.end);
+  return { start, end };
+}
+
+export function toggleMark(
+  spans: TextSpan[],
+  selection: TextSelection,
+  mark: 'bold' | 'italic',
+): TextSpan[] {
+  const { start, end } = clampSelection(selection);
+  if (start === end) return normalizeSpans(spans);
+
+  const chars = flattenSpans(spans);
+  const selected = chars.slice(start, end);
+  const allMarked = selected.length > 0 && selected.every((char) => Boolean(char[mark]));
+
+  const next = chars.map((char, index) => {
+    if (index < start || index >= end) return char;
+    const copy: CharMark = { ...char };
+    if (allMarked) {
+      delete copy[mark];
+    } else {
+      copy[mark] = true;
+    }
+    return copy;
+  });
+
+  return unflattenChars(next);
+}
+
+export function setLink(
+  spans: TextSpan[],
+  selection: TextSelection,
+  href: string | null,
+): TextSpan[] {
+  const { start, end } = clampSelection(selection);
+  if (start === end) return normalizeSpans(spans);
+
+  const normalizedHref = href?.trim() ? href.trim() : null;
+  const chars = flattenSpans(spans);
+
+  const next = chars.map((char, index) => {
+    if (index < start || index >= end) return char;
+    const copy: CharMark = { ...char };
+    if (normalizedHref) {
+      copy.href = normalizedHref;
+    } else {
+      delete copy.href;
+    }
+    return copy;
+  });
+
+  return unflattenChars(next);
+}
diff --git a/apps/web/messages/ar.json b/apps/web/messages/ar.json
index 248ab8f..73546f8 100644
--- a/apps/web/messages/ar.json
+++ b/apps/web/messages/ar.json
@@ -176,10 +176,16 @@
         "colorBrown600": "+¿+å+è +ª+á+á",
         "colorTeal700": "+ú+¦+¦+é +à+«+¦+¦ +º+á+á",
         "colorSand50": "+¦+à+ä+è +Ñ+á",
         "alignStart": "+º+ä+¿+»+º+è+¬",
         "alignCenter": "+º+ä+ê+¦++",
+        "alignEnd": "+º+ä+å+ç+º+è+¬",
+        "bold": "+¦+¦+è+¦",
+        "italic": "+à+º+ª+ä",
+        "link": "+¦+º+¿++",
+        "unlink": "+Ñ+¦+º+ä+¬ +º+ä+¦+º+¿++",
+        "linkPrompt": "+ú+»+«+ä +¦+å+ê+º+å +º+ä+¦+º+¿++ (+ü+º+¦+¦ = +Ñ+¦+º+ä+¬ +º+ä+¦+º+¿++)",
         "pickAudio": "+º+«+¬+è+º+¦ +¦+ê+¬",
         "changeAudio": "+¬+¦+è+è+¦ +º+ä+¦+ê+¬",
         "removeAudio": "+Ñ+¦+º+ä+¬ +º+ä+¦+ê+¬",
         "audioAttached": "+¬+à +Ñ+¦+ü+º+é +º+ä+¦+ê+¬"
       }
diff --git a/apps/web/messages/en.json b/apps/web/messages/en.json
index 62979bc..2cb1c9a 100644
--- a/apps/web/messages/en.json
+++ b/apps/web/messages/en.json
@@ -176,10 +176,16 @@
         "colorBrown600": "Brown 600",
         "colorTeal700": "Teal 700",
         "colorSand50": "Sand 50",
         "alignStart": "Start",
         "alignCenter": "Center",
+        "alignEnd": "End",
+        "bold": "Bold",
+        "italic": "Italic",
+        "link": "Link",
+        "unlink": "Unlink",
+        "linkPrompt": "Enter link URL (empty = remove link)",
         "pickAudio": "Choose audio",
         "changeAudio": "Change audio",
         "removeAudio": "Remove audio",
         "audioAttached": "Audio attached"
       }
diff --git a/apps/web/messages/fa.json b/apps/web/messages/fa.json
index e5b16ad..6bda29a 100644
--- a/apps/web/messages/fa.json
+++ b/apps/web/messages/fa.json
@@ -176,10 +176,16 @@
         "colorBrown600": "+é+ç+ê+çGÇî+º¦î ¦¦¦¦¦¦",
         "colorTeal700": "+ü¦î+¦+ê+¦+çGÇî+º¦î ¦+¦¦¦¦",
         "colorSand50": "+¦+å¦î ¦¦¦¦",
         "alignStart": "+º+¿+¬+»+º",
         "alignCenter": "+ê+¦++",
+        "alignEnd": "+º+å+¬+ç+º",
+        "bold": "+»+¦+¦+¬",
+        "italic": "+¬+¼",
+        "link": "++¦î+ê+å+»",
+        "unlink": "+¡+¦+ü ++¦î+ê+å+»",
+        "linkPrompt": "+å+¦+º+å¦î ++¦î+ê+å+» +¦+º +ê+º+¦+» +¬+å¦î+» (+«+º+ä¦î = +¡+¦+ü ++¦î+ê+å+»)",
         "pickAudio": "+º+å+¬+«+º+¿ +¦+»+º",
         "changeAudio": "+¬+¦¦î¦î+¦ +¦+»+º",
         "removeAudio": "+¡+¦+ü +¦+»+º",
         "audioAttached": "+¦+»+º ++¦î+ê+¦+¬ +¦+»"
       }
diff --git a/design-system.md b/design-system.md
index a4fa729..189a9bb 100644
--- a/design-system.md
+++ b/design-system.md
@@ -283,19 +283,20 @@ Ordered editor for a site's `SiteContentBlock` rows (one instance per locale tab
 |---|---|
 | Layout | `flex-col` on narrow viewports; `lg:flex-row` GÇö canvas `flex-1`, inspector beside it on large screens |
 | Selection | One block at a time; click canvas background deselects; stale selection cleared when the block leaves `value` |
 | Keyboard | **Escape** deselects; **Delete/Backspace** removes the selected block only when focus is **not** in `INPUT` / `TEXTAREA` / `SELECT` / contenteditable (so in-canvas typing and inspector fields stay safe) |
 | File picking | Shell never hashes/optimizes GÇö `onPickFile(block, file)` bubbles raw `File` to the caller (`lib/file-hash.ts`, `lib/optimize-image.ts`); multipart field name === `clientFileKey` on save |
-| Copy from FA | Unchanged: new keys + copied text/caption/embedUrl; keeps `mediaId`, drops FA-only `clientFileKey`/`previewUrl` |
+| Copy from FA | Unchanged: new keys + copied spans/caption/embedUrl; keeps `mediaId`, drops FA-only `clientFileKey`/`previewUrl` |
 
 #### `BlockCanvas` (`components/admin/block-canvas.tsx`)
 
 Single **white** document surface: `rounded-card`, `border-brown-800/15`, `px-6 py-8` / `md:px-10 md:py-10`. Renders blocks like the public article body; no per-block move/delete chrome.
 
 | Element | Spec |
 |---|---|
-| Text (HEADING/PARAGRAPH) | Borderless auto-resizing `textarea`; typography from public `TextBlock` maps (`roleClasses` / `colorClasses` / `alignClasses` in `text-block.tsx`) |
+| Text (HEADING/PARAGRAPH) | `SpanTextEditor` (`contenteditable`) with typography from public `TextBlock` maps (`roleClasses` / `colorClasses` / `alignClasses` in `text-block.tsx`); when selected, `FormatToolbar` above the block |
+| Format toolbar | `FormatToolbar` GÇö `rounded-button` chips matching inspector `ChipGroup` (white + `border-brown-800/15`, **12px** bold); actions: Bold / Italic / Link (prompt) / Unlink; i18n under `admin.siteForm.block.*` |
 | Image / Audio | `MediaFilePicker` on canvas (pick/change/remove); **caption not on canvas** |
 | Video | Valid `http(s)` embed GåÆ `aspect-video` iframe preview; else dashed placeholder labeled with embed URL copy |
 | Selected block | Wrapper `ring-2 ring-teal-700/40`, `rounded-button`, `-m-1 p-1` |
 | Insert gaps | Before each block: centered **+** via `BlockInsertMenu` (`variant="gap"`) GÇö white 36+ù36, `border-2 border-brown-800/20`, bold **+** |
 | End insert | `BlockInsertMenu` (`variant="end"`) GÇö `secondary` `ActionButton` with `labels.addBlock` |
@@ -342,11 +343,11 @@ Full-width admin editor for creating/replacing a site. Reads all copy from `useT
 
 - On `sand-100` panels, controls use **white** fill + `border-brown-800/25` (TextInput, Select, ImagePicker, Checkbox off-state). Avoid `sand-50` nested in `sand-100` GÇö contrast is too low on the striped page background.
 
 Components: `language-switcher.tsx` (public + admin header + login).
 
-Admin composed components: `admin-shell.tsx`, `login-form.tsx`, `sites-list.tsx`, `site-form.tsx`, `block-list-editor.tsx`, `block-canvas.tsx`, `block-inspector.tsx`, `block-insert-menu.tsx`, `media-file-picker.tsx`, `users-panel.tsx`, `location-map-picker.tsx`.
+Admin composed components: `admin-shell.tsx`, `login-form.tsx`, `sites-list.tsx`, `site-form.tsx`, `block-list-editor.tsx`, `block-canvas.tsx`, `block-inspector.tsx`, `block-insert-menu.tsx`, `span-text-editor.tsx`, `format-toolbar.tsx`, `media-file-picker.tsx`, `users-panel.tsx`, `location-map-picker.tsx`.
 
 
 ## Open questions
 
 - [ ] Icon set: which library (Lucide/Phosphor) fits the palette best?
```
