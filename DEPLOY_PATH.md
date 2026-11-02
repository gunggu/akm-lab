# Deployment and staging acceptance

## Preserve production boundaries

Review this change on its fix branch and PR before merging into `feature/lease-lab`, which is connected to production builds. Do not attach production D1 or real credentials to a staging preview. The `flipbookakm` textbook Worker, its DNS and root assets are outside this change.

The existing `wrangler.toml` contains the real LeaseLab routes and D1 binding. For staging, create a separate Wrangler config with a different Worker name, a disposable database, no production routes and separate test secrets. Use invented roster records only. Never publish production codes or keys in the config, tests or logs.

## Prepare an isolated rehearsal

1. Create the staging D1 database; apply `schema.sql`. Set staging `TOKEN_SECRET` and `ADMIN_KEY` as Worker secrets.
2. Run the authenticated “Initialize missing V2 tables” action once during planned setup. It preserves roster, students, drafts and submissions. This is a migration action and requires explicit operational approval for production.
3. Deploy with the isolated staging config. Set `BUILD_ID` to the reviewed commit if release identification is wanted. GitHub commits alone do not prove a deployment completed.
4. Check `/api/health` and `/api/ready`. The latter probes required schema and settings with a five-second readiness bound; missing binding/secrets, partial schema or DB failures must yield 503. It does not certify roster population or enrollment-code validity.
5. Check `/`, `/admin`, `/admin/` redirect, `/app.js`, `/worksheet.js`, and all API responses. On the routed host repeat under `/lease-lab`; deep module imports must stay inside the prefix.

## Functional and pedagogical rehearsal

- Set a shared class code through the authenticated instructor console. Enroll several invented students with that same code; verify wrong/old-code, unknown-NIU and duplicate rejection, login and waiting state. Confirm class-code rotation does not change existing PINs and that the class code cannot reset a PIN. Confirm no real PINs appear in a URL when scripts fail to load.
- Allocate 54 disposable attendees; confirm balanced roles and opposite-role availability in every active case. Repeat concurrent enrollment/allocation in the actual Cloudflare runtime. The local SQLite adapter is not a distributed concurrency test.
- Test late check-in, assignment during `late`, closing late enrollment and protected reassignment/reset refusals.
- Use both roles for all five cases; verify classification, recognized liability, ROU, commencement cash, manufacturer revenue/cost/profit and Year 1 entries against a human-reviewed key. Test Case 3 especially.
- Test same-case requests, cross-case rejection, bilateral confirmation, duplicate requests and multiple counterparts. Discussion confirmation is not evidence of the quality of the conversation; assess that separately.
- Test autosave success/failure, editing during a pending save, timeout/non-JSON response, refresh, sign-out, another user in the same tab and closing the page with unsaved work. Confirm scalar answers and pending saves do not cross identities.
- Submit independently; confirm the first answer cannot be overwritten, peer answers stay hidden until both submit, a preserved legacy draft can be downloaded, and old submitted records remain unchanged.
- Close submissions; verify drafts and final submission are blocked, and the page explains why. Check attendance CSV and complete JSON exports with invented data. Dashboard medians should exclude legacy measurement conventions.
- Rehearse a rubric-based instructor debrief. Structural journal balance is not accounting correctness. Comparison should explain legitimate lessor/lessee differences rather than demand identical assets or expenses.

## Visual and accessibility acceptance

Test desktop 1366×900; portrait 390×844 and 360×800; landscape 844×390. Include actual student worksheets, long company names, multiple counterpart records and instructor tables. Verify touch targets, visible journal scrolling, virtual-keyboard effects, focus order, 200% zoom, screen-reader names and error announcements on iOS Safari and Android Chrome as well as desktop Chrome. Source-level labels/CSS checks do not replace these browser tests.

## Production release and rollback

After approval and staging acceptance, merge the reviewed PR and verify the connected Worker deployment and build ID. Existing fully migrated V2 databases do not need a new schema migration for this patch. Do not run initialization, reset, attendance finalization or state changes just to deploy code.

Check student/admin routes, readiness, module loading and the existing textbook route after release. On failure redeploy the previous LeaseLab code or disable only its two routes. No database deletion or rollback is required by this patch. Existing submissions are not rewritten, but historical attempts overwritten before this patch cannot be restored from the current database row.

For V2.2, set the shared class enrollment code after deployment and before opening check-in to the class. This is an instructor action in the console; deployment does not invent or publish a code or change any existing PIN. Original individual codes are now recovery-only.
