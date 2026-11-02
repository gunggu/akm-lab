# LeaseLab V2 audit remediation

This branch addresses the 2 November 2026 audit against `feature/lease-lab` at `d40dc538`. It has not been deployed or exercised with production accounts. `npm test` runs entirely on disposable data.

| Finding | Change / status |
|---|---|
| F01 Case 3 benchmark | Correct outstanding lessor net investment after commencement cash; independent payment-schedule regressions for all cases |
| F02 saved draft restoration | Explicit immutable submitted view; distinct saved drafts preserved and downloadable; new drafts restored for unsubmitted students |
| F03 accessible names | Unique IDs and associated labels for static controls; meaningful generated journal names, focus styling and scroll-region names |
| F04 replacement after comparison | Atomic insert-only first submission, server-side replacement refusal, locked worksheet, version tag and submission audit event |
| F05 `/admin/` | Canonical 308 redirect; tests at root and `/lease-lab` prefix |
| F06 readiness | Separate read-only `/api/ready`; required schema/settings probes, configuration check and five-second bound; `/api/health` remains liveness |
| F07 misleading controls / request states | Disabled pre-load and phase-inapplicable actions, pending indicator, 12-second client timeout, non-JSON/network error guidance, no automatic mutation retries |
| F08 stale messages | Clear messages on view changes; distinct success styling |
| F09 late assignment | Assignment accepted during both active and late phases; documented sequence |
| F10 shared-device state | Cancel pending work, clear scalar fields and identity state on logout/login, generation checks for stale student responses |
| F11 raw comparison | Structured role comparison and readable journal tables; explanation of valid asymmetry and instructor debrief prompts |
| F12 measurement ambiguity | Recognized lessee liability and ROU recorded separately; role-specific lessor measurement; legacy submissions flagged and excluded from new-version medians |
| F13 weak submission schema | Shared server/client validation for role, numeric ranges, events, text sizes, journal structure and positive balanced amounts; no claim of automatic accounting grading |
| F14 mobile usability | Scroll hint, labelled focusable journal region, responsive action wrapping; **actual mobile browser rendering still needs staging verification** |
| F15 instructions / docs | Student sequence and recovery guidance; updated deployment, allocation, late-arrival and assessment runbooks |

Local integration testing additionally found that token HMAC key import omitted the required hash algorithm. It now explicitly imports HMAC/SHA-256. Tests cover the full local register/login/confirmation/submission flow rather than only page responses.

The old allocation algorithm also favored lessors in odd-sized case groups: 54 students could become 29 lessors and 25 lessees. Allocation now distributes complete pairs, giving exactly 27/27 and case pair counts 6/6/5/5/5 for 54 attendees. An odd attendance total adds one randomly selected role to a smallest active case.

Validation completed locally: 22 passing tests (`npm test`), JavaScript syntax checks, diff whitespace checks, and form/fieldset nesting with POST fallback checks. Test coverage includes simultaneous first-submission requests, upstream HTML errors, request timeout cleanup, sign-out state clearing, accessible label associations and module routes at both base paths. No production request or database mutation was needed for these tests.

Existing tables, roster, accounts and submitted rows are preserved; no new database schema is required by the patch. A legacy submitted row may already represent a replacement made before this change; it is preserved as found, not misrepresented as a recoverable historical first attempt. No code can reconstruct overwritten historical versions from that row alone.

## Remaining validation

- Run the Cloudflare staging rehearsal in `DEPLOY_PATH.md`, including actual mobile/screen-reader/browser behavior, module assets, connectivity failures and 54-user concurrency.
- Obtain human sign-off on complete accounting journals/statements and the assessment rubric for all five cases.
- Verify production deployment identity and database/roster readiness after an approved release. A successful local test is not evidence of live deployment.
- Further negotiation, amortization-schedule authoring, revision history and separately stored post-comparison reflection are possible extensions, not features delivered by this patch. The selected policy is a locked independent submission followed by instructor-led debrief.
