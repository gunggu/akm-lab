# ChangeLab — Session 11 accounting simulation

**Status: PR-ready; not automatically deployed.** Original four-incident accounting exercise, aligned with Kieso IFRS Chapter 21 and IAS 8. Students have one shared **20-minute class deadline**, not 20 minutes each.

## Production architecture and safe installation

This is a separate Cloudflare Worker in `changelab/` and reuses the *same* Cloudflare D1 database `session10-lease-lab`. It reads the LeaseLab `students` table and verifies identical NIU/PIN hashes with the same `TOKEN_SECRET`. Its student session tokens are separately namespaced (`cl.` prefix). Its student answers and scores exist ONLY in `cl_sessions` and `cl_attempts`. LeaseLab answers, assignment, role, matches, drafts and settings remain unchanged by normal ChangeLab play.

**Deployment preconditions (important):**

1. Confirm `/lease-lab/api/ready` is operational and back up D1 before any migrations.
2. Run the additive `changelab/schema.sql` against existing database **once**, ideally first on a staging clone. Never run a destructive reset.
3. Set the new Worker's `TOKEN_SECRET` to the *same value* as LeaseLab (otherwise PIN verification will fail). Set `ADMIN_KEY` to a separately chosen secret or the existing instructor key. Do not commit these secrets.
4. Deploy from `changelab/` with Wrangler configuration `changelab/wrangler.toml`. The named routes cover `/change-lab` and `/change-lab/*` only, leaving the existing `/lease-lab` worker and textbook routes untouched.
5. Check `/change-lab/api/health` (liveness), then test a teacher session in staging using synthetic accounts. **Do not perform test writes against real student data.** Confirm all API paths, enrollment, and authenticated use on the target hostname before inviting students.
6. Verify mobile layout, accessibility labels, timer under network interruption, CSV export, session re-creation, and concurrent submissions.

## Existing students and new enrollment

- Existing LeaseLab students use the **same NIU and personal PIN**. This app reads their hashed PIN from `students` and never changes it.
- If a student is not registered yet, `/api/enroll` accepts the existing instructor's shared LeaseLab class enrollment code, *provided the NIU is on the existing private `roster`*. It creates a standard student account with a provisional LeaseLab role/case (`lessor`, case 1) because the legacy LeaseLab schema requires those columns. **The LeaseLab instructor should rerun allocation if that student will also participate there**, and should avoid adding students after LeaseLab assignments or discussions have been finalized. If the student is already registered, they must sign in instead.
- No name or NIU is hardcoded in the app or repository.

## Instructor workflow

1. Open `/change-lab/admin`, enter the instructor key (not stored locally).
2. Create a new session. Students can sign in before it starts.
3. Start the class-wide 20-minute timer. Students open case files and enter decisions.
4. The backend saves individual answers and commits one immutable final submission per student before the deadline.
5. Review participation, per-case scores, and export CSV. After the session closes or deadline passes, submitted students can see their scores and case-level accuracy. The correct numeric values are never included in student API payloads while the session is running.
6. Close the session to permit a new one. Earlier attempts remain in the DB for audit purposes.

**Scoring:** 4 case incidents × 5 answers × 5 marks = 100 marks. The cases address policy changes, estimates, errors, and counterbalancing. Randomized variant 0–2 scales the numbers but preserves proportional difficulty. Students cannot receive more time by refreshing, as the timer is held in the database. The instructor's closing a session immediately stops new saves/submissions.

## Local development

Run `cd changelab && npm test && npm run check`. No npm install needed. These tests verify scoring, data structures and client syntax; they do not constitute a live Cloudflare D1 integration or browser-based accessibility test.

## Operational limitations / manual QA to complete before class

- This first release uses a lightweight PIN identity inherited from LeaseLab. Ensure the same D1 `students` and `login_limits` tables exist and existing secrets are configured correctly.
- A student who merely drafts but does not explicitly submit is **not graded** at time expiry. Instructor should monitor the submission count and remind students to submit.
- For repeat classes, instructor explicitly closes the old session and creates a new session. Scores from earlier sessions remain retained.
- The UI does not permit response changes after final submission; it is a formative simulation, not an officially proctored examination.
- Build should be merged/deployed only after a separate staging rehearsal. Nothing here configures production secrets or applies the D1 migration automatically.