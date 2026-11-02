# Deploy LeaseLab at https://akm.gunggu.my.id/lease-lab

## Architecture
- **Existing** `flipbookakm` Worker: unchanged. Do not add LeaseLab assets to the existing production site's root build.
- **New** `session10-lease-lab` Worker: a separate deployment, accessible on two specific Worker routes: `akm.gunggu.my.id/lease-lab` and `akm.gunggu.my.id/lease-lab/*`.
- **New** dedicated Cloudflare D1 database.
- **New** secret values for instructor/student access.

IMPORTANT: GitHub changes are **not** Cloudflare deployment. No live registration can occur until infrastructure is configured and verified. The GitHub draft still has high-priority issues regarding NIU verification, concurrency-safe assignment and incomplete manufacturer/dealer lease answer key. Resolve those before production.

## Prerequisites
1. Verify that `akm.gunggu.my.id` is served through the Cloudflare zone `gunggu.my.id` and check its currently active Worker custom domain / routing rules. Do not remove the textbook Worker routing.
2. In the repo branch, from the repository root, install/login to Wrangler with appropriate account access.
3. `npx wrangler d1 create session10-lease-lab`; put the returned `database_id` into `wrangler.toml`.
4. `npx wrangler d1 execute session10-lease-lab --remote --file=schema.sql`.
5. Set secrets individually (never commit): `npx wrangler secret put CLASS_CODE`, `npx wrangler secret put TOKEN_SECRET`, `npx wrangler secret put ADMIN_KEY`.
6. Review changes with `npx wrangler deploy --dry-run` and inspect Cloudflare's domain routes before any actual deploy.

## Routing expectations
- `/lease-lab` and `/lease-lab/` serve the student login.
- `/lease-lab/admin` serves the instructor dashboard.
- `/lease-lab/api/login`, `/lease-lab/api/register`, `/lease-lab/api/me`, etc. reach the new Worker's API handler.
- `/viewer.html?ch=20&p=1` and `/assets/app.js` continue to reach the original textbook Worker.

## Staging smoke tests before publishing
1. Use a temporary `workers.dev` deployment or staging hostname before attaching production routes; in temporary testing adapt the prefix if necessary.
2. Check responsive UI and all API paths; D1 schema, secrets, registration, login and dashboard.
3. Test 54 simultaneous distinct NIU registrations; confirm exactly 27 lessors, 27 lessees with case quotas 6/6/5/5/5. **Current registration code cannot guarantee these under concurrency; this remains a blocker.**
4. Attempt duplicate and unauthorized registration, cross-case matching, repeat matching and partner answer access before both have submitted.
5. Check 5 IFRS 16 scenarios against a manually reviewed accounting key, including manufacturer dealer selling profits.
6. Verify existing textbook links before and after attaching the LeaseLab routes.
7. Ensure class registration and answer submissions can be closed and instructor can repair absent pairs before classroom use.
8. Rehearse 30 min quiz + 45 min lab + 45 min debrief using dummy students and instructor projector.

## Rollback
Disable only the two LeaseLab routes or redeploy the previous LeaseLab Worker version. Do not modify the textbook Worker, its DNS record, or its root static assets.

## Suggested teaching access
- Student: `https://akm.gunggu.my.id/lease-lab`
- Instructor: `https://akm.gunggu.my.id/lease-lab/admin`
- Book reader: `https://akm.gunggu.my.id/viewer.html?ch=20&p=1`
