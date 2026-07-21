# Task 2 Report: Prisma migration — END + drop media alts

**Status:** COMPLETE  
**Branch:** `feat/editor-completeness`  
**Commit:** `ee29387` — Add BlockAlign END and drop Media alt columns.

## Summary

Updated Prisma schema and added migration `20260721193000_editor_completeness` to add `BlockAlign.END` and remove `Media.altFa` / `Media.altEn`, matching Task 1 shared-types. Generated Prisma client; applied migration to local Postgres.

## Schema changes

| Area | Change |
|------|--------|
| `BlockAlign` enum | Added `END` |
| `Media` model | Removed `altFa`, `altEn` |

## Migration

**File:** `apps/api/prisma/migrations/20260721193000_editor_completeness/migration.sql`

```sql
-- prisma-migrate-disable-transaction
ALTER TYPE "BlockAlign" ADD VALUE IF NOT EXISTS 'END';
ALTER TABLE "Media" DROP COLUMN IF EXISTS "altFa";
ALTER TABLE "Media" DROP COLUMN IF EXISTS "altEn";
```

`prisma migrate dev --create-only` was not used because the worktree branch is missing `20260719153000_add_user_auth` while the shared dev DB already has it (drift). Migration SQL was authored manually per brief, then applied with `prisma migrate deploy`.

Used `-- prisma-migrate-disable-transaction` so `ADD VALUE` and `DROP COLUMN` can run on Postgres without the enum-in-transaction failure noted in the brief. Single migration succeeded; no split required.

## Commands run

```bash
pnpm --filter api exec prisma generate          # OK
pnpm --filter api exec prisma migrate deploy    # OK — applied editor_completeness
```

## DB verification

```text
BlockAlign enum: START, CENTER, END
Media altFa/altEn columns: (none)
```

## Out of scope (Task 3+)

- Nest services, mappers, seed — still reference `altFa`/`altEn`; compile fixes deferred.
- `heritage-schema-map.md` / architecture docs — update when API layer lands.

## Concerns

1. **Migration history drift:** Worktree tracks 3 migrations; dev DB also has `add_user_auth` from main. `migrate deploy` applies only pending files and succeeded; `migrate dev` would still warn until auth migration is reconciled on the branch.
2. **Downstream compile breaks:** Expected until Task 3 updates API/seed for removed alt fields.

## Files touched

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260721193000_editor_completeness/migration.sql`
