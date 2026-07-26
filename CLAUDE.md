# Agent Instructions - Shahrnama (شهرنما)

This file is read automatically by Claude Code (and most agent harnesses that support `CLAUDE.md`/`AGENTS.md`) at the start of a session in this repo. It applies to every task, not just large ones.

## Rule 0 - No em dashes or AI punctuation

Never use em dashes (`—`), en dashes as prose (`–`), ellipsis characters (`…`), curly quotes, or decorative bullet/star glyphs in UI copy, i18n, seed data, comments, docs, or commits. Use plain ASCII punctuation (`,`, `.`, `-`, `'`, `"`, `...`). Cursor rule: `.cursor/rules/no-ai-punctuation.mdc`.

## Rule 1 - Read the guide files before any update

Before writing, editing, or generating any code, config, or content in this repo, read both:
- `architecture-decisions.md`
- `design-system.md`

Do this even for a task that looks small or unrelated to architecture (e.g. "add a button"). The button still has a color, a border-radius, and a place in the folder structure - all defined in those files. If a task conflicts with something already decided there, say so explicitly before proceeding, rather than silently picking a different approach.

**UI primitives (non-negotiable):** Reuse `components/ui/*` for badges, buttons, fields, etc. Do not invent one-off pill sizes, type scales, or color classes that duplicate a primitive. Status pills use `Badge` + `tone` only. Cursor rule: `.cursor/rules/design-system.mdc`.

## Rule 2 - Update the guide files after any update

After making a change that establishes, changes, or rules out a decision (a new library, a folder-structure change, a new data field, a reversed earlier choice), update the relevant guide file in the same session, not as a follow-up task:
- Architectural/backend/frontend/data-model decisions go in `architecture-decisions.md`.
- Visual/UI/copy-style decisions go in `design-system.md`.
- **UI implementation rule:** when adding or materially changing a public/admin **section, layout, or composed component**, document it in `design-system.md` in the same session (component spec, tokens, spacing). Do not defer UI documentation.
- Log it the way the existing entries are logged: the decision, the reason, and - if it reverses something - what it replaces and why.
- If a change is exploratory/temporary (a spike, a throwaway test), do not log it as a decision.
- Never leave a guide file stale after a real decision was made in conversation or in code. A future session (agent or human) should be able to read these two files and reconstruct the current state of the project without reading git history.

## Rule 3 - Use Graphify

[Graphify](https://github.com/safishamsi/graphify) turns this repo (code, Prisma schema, docs) into a queryable knowledge graph, which is more reliable than re-reading raw files for understanding how things connect (which module touches `Site`, which docs explain a given decision, impact of a change).

Setup (once, in this repo):
```bash
# install (isolated env; if 'graphify' isn't found after, run: uv tool update-shell)
uv tool install graphifyy
# alternatives if uv isn't available:
# pipx install graphifyy
# pip install graphifyy

# register the skill with Claude Code
```
Then inside Claude Code, run `/graphify` once to build the graph for this repo. Re-run it after a significant structural change (new module, schema migration, folder restructure) so the graph doesn't go stale.

Usage going forward:
- Before a non-trivial task (new feature, refactor, cross-module change), query the graph first to see which files/modules/docs are actually connected to the area being touched, instead of guessing from file names or re-reading the whole tree.
- Treat it as a discovery aid, not a replacement for reading the actual code before editing it.

## Rule 4 - Verify before claiming done

After implementing a feature, bugfix, or API change, **run verification** before telling the user it is complete:

1. **Compile:** for API work, `pnpm exec tsc --noEmit -p tsconfig.build.json` in `apps/api` must pass. A failing watch build leaves Nest serving stale routes (new endpoints can 404 even though source looks correct).
2. **Exercise the path:** hit new/changed endpoints (curl, supertest e2e, or the web flow that calls them). For web + API features, test through the same URL the browser uses (`/api/v1/...` rewrites).
3. **Report evidence:** say what you ran and the result (HTTP status, test count), not "should work".

Cursor rule: `.cursor/rules/verify-before-done.mdc`.

## Order of operations for a typical task

1. Read `architecture-decisions.md` and `design-system.md` (Rule 1).
2. Query Graphify for the relevant area of the codebase (Rule 3).
3. Do the work.
4. **Verify the change** (Rule 4).
5. Update the guide files if the work involved a decision (Rule 2).
