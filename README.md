# LeaseLab — IFRS 16 classroom simulation

Standalone manufacturer/dealer lessor–lessee role-play for Intermediate Accounting II. The application lives in the repository root. `public/` contains the page, client module and shared worksheet validation. `worker.js` provides the API and serves those assets.

## Run local checks

Use Node.js 24 or later, then run `npm test`. No npm dependencies are required. Tests use disposable in-memory SQLite through a D1 adapter and mocked browser state; they never access production or real student records. JavaScript syntax can also be checked with `node --check worker.js` and `node --check public/app.js`.

These are not Cloudflare runtime, full DOM, screen-reader or mobile rendering tests. Complete the staging rehearsal in `DEPLOY_PATH.md` before rollout.

## Deployment configuration

- Worker name: `lease-lab`; entrypoint: `worker.js`; assets: `public/`.
- D1 binding: `DB`; existing database: `session10-lease-lab`.
- Required secrets: `TOKEN_SECRET`, `ADMIN_KEY`. The old `CLASS_CODE` is not used.
- Production build branch: `feature/lease-lab`; changing that branch may trigger the connected deployment. Review fixes on a separate branch first.
- Routes in `wrangler.toml` cover only `/lease-lab` and `/lease-lab/*` on `akm.gunggu.my.id`; the textbook Worker remains separate.
- Optional `BUILD_ID` identifies a deployed release in diagnostics. Without it the API reports `unreported`.

Do not commit secrets, private SQL, roster names, NIUs or access codes. New installations apply `schema.sql` and run the authenticated missing-table initializer during planned setup. Existing migrated V2 installations require no new schema migration for these fixes. Nothing initializes, resets or finalizes production automatically.

## Classroom operation

1. Verify `/lease-lab/api/ready` reports `ready: true`; `/api/health` is liveness only. The equivalent workers.dev paths omit `/lease-lab`.
2. Import the instructor's private hashed roster through the approved D1 workflow. In the instructor console, load the dashboard and set one shared class enrollment code (6–64 characters), then announce it to attendees. Original individual roster codes are retained only for private PIN recovery; they do not need to be distributed for routine enrollment. Readiness does not assert that the roster is populated or a class code has been set.
3. Students check in with short NIU, the shared class code and a new personal PIN. Registration records attendance but does not allocate roles. Roles/cases in the legacy roster are not used for allocation.
4. Instructor loads the dashboard, reviews attendance, then finalizes the randomized allocation. Allocation is guarded against duplicate draws.
5. Students refresh, meet an opposite-role representative in the same case and obtain bilateral confirmation. Multiple representatives can discuss the same transaction; these are not separate negotiated leases.
6. Students prepare individual accounting. Drafts save after an input pause; students must verify the saved notice before leaving. A confirmed discussion is required for submission.
7. **The first submitted answer is immutable.** Counterpart answers unlock only after both have submitted. Earlier different drafts remain downloadable. Subsequent draft saves and replacement submissions are rejected.
8. Instructor runs reconciliation/debrief using structured comparisons, benchmarks and exports. Mark accounting judgment with a rubric; structural validation and balanced journals are not an automatic correctness grade.
9. Close submissions only after announcing that draft saves also stop. Export and preserve records under the institution's data policy.

For late arrivals, open late check-in, let them register, assign them while check-in remains open, then close late check-in. Reassignment is blocked once any draft, request or submission exists. Reset is restricted to an unused allocation; it is not a general delete-session command.

## Accounting and data compatibility

For Case 3, IDR 110m is received at commencement. Total payment PV/ROU is IDR 308,881,998, while the remaining receivable/liability is IDR 198,881,998. The worksheet now records recognized liability separately from ROU. Lessor initial measurement is the remaining finance receivable or the operating underlying asset's carrying amount, as appropriate.

The exercise explicitly assumes straight-line depreciation, zero end-of-useful-life residual, and a finance-lease implicit rate equal to market rate. The stated unguaranteed residual is at lease end, not the end of useful life. All five cases still require instructor accounting review before graded use.

Existing submitted rows are preserved and locked; this patch cannot reconstruct any historical attempts previously overwritten. They are labelled legacy because their original measurement prompts differed. Current-version dashboard medians exclude legacy submissions; exports preserve their original data. A different saved draft is available for recovery instead of being silently overwritten.

See `AUDIT.md` for implemented fixes and remaining validation limits.

## Shared class enrollment (V2.2)

The instructor sets or rotates the common class code in the authenticated console. Only a PBKDF2 hash is stored in the existing settings table; plaintext is never returned in reports or audit logs. No Cloudflare secret or schema migration is needed. Before the first code is set, new enrollment returns an explicit setup message. Existing students continue signing in with their personal PINs. The shared code only admits rostered, unclaimed NIUs while check-in is open or late.

The class code must not be used as PIN recovery proof. Students who forget their PIN ask the instructor privately for their original individual recovery code from the private roster-code file. This exception avoids distributing individual codes to everyone at the beginning of a short class. Never publish that private recovery-code file.

## Discussion case summary

After loading the authenticated instructor dashboard, choose **Case summary · Discussion**. The projection view hides the instructor controls and contains no student names, NIUs, credentials or submissions. Start with the all-five-case comparison, then choose Case 1–5 or Previous/Next for side-by-side lessor and lessee benchmarks, contract terms, Year 1 effects and discussion points. **Back to instructor** exits presentation mode. The summary uses the existing instructor-only worked-solutions endpoint; solution data is not embedded in the public page.
