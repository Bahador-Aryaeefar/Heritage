# Public members and site reviews

Date: 2026-07-25  
Status: implemented  
Scope: public signup/login, site review CRUD for members

## Summary

- `UserRole.MEMBER` with email and/or phone + password + display name
- `POST /auth/register`, login via `identifier` on existing `POST /auth/login`
- One text review per member per site (`SiteReview`, unique on siteId+userId)
- Public list on site detail; upsert/delete for signed-in member

See `architecture-decisions.md` section 23.
