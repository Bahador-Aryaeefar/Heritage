### Task 1: Shared-types â€” locale `ar`, END, href, drop alts, spans write

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/web/lib/shared-types-editor-completeness.test.ts` (Vitest importing Zod schemas â€” shared-types has no test runner)

**Interfaces:**
- Produces:
  - `localeSchema`: `'fa' | 'en' | 'ar'`
  - `blockAlignSchema`: `'START' | 'CENTER' | 'END'`
  - `textSpanSchema`: `{ text, bold?, italic?, href? }` (`href` optional `z.string().url().optional()` or `z.string().min(1).optional()` â€” use `z.string().url().optional()` for absolute http(s); allow relative paths with `z.string().min(1).optional()` if you need both â€” **prefer** `z.union([z.string().url(), z.string().startsWith('/')]).optional()` OR simply `z.string().min(1).optional()` and validate URL in UI)
  - `mediaRefSchema` / `adminMediaSchema`: **no** `altFa`/`altEn`
  - `adminTextBlockWriteSchema`: `spans: z.array(textSpanSchema).min(1)` â€” **remove** `text`
  - `requireFaEnArTranslations`: fa âˆ§ en âˆ§ ar
  - `createSiteFullSchema` / `updateSiteFullSchema` use that refine; message: `'fa, en, and ar translations are required'`

- [ ] **Step 1: Write failing Vitest**

```ts
import { describe, expect, it } from 'vitest';
import {
  adminBlockWriteSchema,
  createSiteFullSchema,
  localeSchema,
  blockAlignSchema,
  textSpanSchema,
  mediaRefSchema,
} from '@heritage/shared-types';

describe('editor-completeness shared-types', () => {
  it('accepts ar locale and END align and href spans', () => {
    expect(localeSchema.parse('ar')).toBe('ar');
    expect(blockAlignSchema.parse('END')).toBe('END');
    expect(textSpanSchema.parse({ text: 'x', bold: true, href: 'https://example.com' }).href).toBe(
      'https://example.com',
    );
  });

  it('rejects media refs with alt fields stripped from schema', () => {
    const parsed = mediaRefSchema.parse({
      id: '1',
      type: 'IMAGE',
      url: '/x',
      embedUrl: null,
      durationSec: null,
    });
    expect(parsed).not.toHaveProperty('altFa');
  });

  it('requires fa+en+ar on create and text blocks use spans', () => {
    const text = adminBlockWriteSchema.parse({
      type: 'PARAGRAPH',
      textRole: 'BODY',
      colorToken: 'BROWN_800',
      align: 'END',
      spans: [{ text: 'hi', italic: true }],
    });
    expect(text).toMatchObject({ type: 'PARAGRAPH' });

    const base = {
      slug: 't',
      category: 'ANCIENT' as const,
      lat: '34',
      lng: '47',
      cityId: 'c',
      isActive: true,
      translations: [
        { locale: 'fa', title: 'Ù', shortDescription: 'Ù', blocks: [] },
        { locale: 'en', title: 'e', shortDescription: 'e', blocks: [] },
      ],
    };
    expect(createSiteFullSchema.safeParse(base).success).toBe(false);
    expect(
      createSiteFullSchema.safeParse({
        ...base,
        translations: [
          ...base.translations,
          { locale: 'ar', title: 'Ø¹', shortDescription: 'Ø¹', blocks: [] },
        ],
      }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter web test lib/shared-types-editor-completeness.test.ts` â€” expect FAIL

- [ ] **Step 3: Update `packages/shared-types/src/index.ts`** to match Interfaces above. Replace `requireFaEnTranslations` with fa/en/ar check. Remove alt fields from both media schemas. Change text write to spans.

- [ ] **Step 4: Tests PASS**. Run `pnpm --filter @heritage/shared-types typecheck` (or workspace build) if available.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/lib/shared-types-editor-completeness.test.ts
git commit -m "Extend shared-types for ar locale, rich spans, and caption-only media."
```

---


