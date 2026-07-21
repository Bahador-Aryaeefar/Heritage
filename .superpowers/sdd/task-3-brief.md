### Task 3: API persist spans + seed AR + strip alts

**Files:**
- Modify: `apps/api/src/sites/application/admin-sites.service.ts` (stop `spans: [{ text: block.text }]`; use `block.spans`; remove alt select/map)
- Modify: `apps/api/src/sites/application/sites.mapper.ts`
- Modify: `apps/api/src/media/application/media.service.ts`
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/api/test/admin-sites-full.e2e-spec.ts`

**Interfaces:**
- Consumes: `AdminTextBlockWrite.spans`, `Locale` including `ar`
- Produces: persisted blocks with spans JSON; seed site with fa/en/ar; GET media without alts

- [ ] **Step 1: Fix compile errors** from Task 1/2 â€” search `altFa|altEn|block\.text` under `apps/api` and update.

For text block create in `admin-sites.service.ts`, replace:

```ts
spans: [{ text: block.text }],
```

with:

```ts
spans: block.spans,
```

(and keep textRole/colorToken/align from the write DTO).

- [ ] **Step 2: Seed** â€” duplicate FA block structure into `locale: 'ar'` with Arabic title/shortDescription/captions/text where practical; remove all `altFa`/`altEn` from media creates.

- [ ] **Step 3: Update e2e** `admin-sites-full.e2e-spec.ts` so create payload includes `ar` translation and at least one text block with:

```ts
spans: [
  { text: 'Hello ', bold: true },
  { text: 'link', href: 'https://example.com' },
]
```

Assert GET returns those spans and no `altFa` on media.

- [ ] **Step 4: Run** `pnpm --filter api test -- admin-sites-full.e2e-spec.ts` (Postgres up + seed). Expect PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/prisma/seed.ts apps/api/test/admin-sites-full.e2e-spec.ts
git commit -m "Persist rich spans, require ar in admin writes, seed Arabic content."
```

---


