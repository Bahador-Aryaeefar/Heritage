### Task 2: Prisma migration â€” END + drop media alts

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_editor_completeness/migration.sql`

**Interfaces:**
- Produces: DB enum value `END`; Media without `altFa`/`altEn`

- [ ] **Step 1: Update Prisma schema**

```prisma
enum BlockAlign {
  START
  CENTER
  END
}

model Media {
  // ...existing fields...
  // REMOVE: altFa, altEn
}
```

- [ ] **Step 2: Create migration SQL** (adjust timestamp via `pnpm --filter api prisma migrate dev --create-only --name editor_completeness` then edit if needed):

```sql
ALTER TYPE "BlockAlign" ADD VALUE IF NOT EXISTS 'END';

ALTER TABLE "Media" DROP COLUMN IF EXISTS "altFa";
ALTER TABLE "Media" DROP COLUMN IF EXISTS "altEn";
```

Note: On PostgreSQL, `ADD VALUE` to enum cannot run in the same transaction as some other ops in older versions â€” if migrate fails, split into two migrations (END first, then drop columns).

- [ ] **Step 3: Apply** `pnpm --filter api prisma:migrate` (or projectâ€™s migrate script) and `pnpm --filter api prisma:generate`

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "Add BlockAlign END and drop Media alt columns."
```

---


