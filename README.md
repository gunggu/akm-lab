# LeaseLab — Session 10

Standalone IFRS 16 lessor/lessee role-play application for Intermediate Accounting II. This branch contains the app in the **repository root**, not a nested `lease-lab/` folder.

## Cloudflare Workers Builds
- Repository: `gunggu/akm-lab`
- Production branch: `feature/lease-lab`
- Root directory: `/` (repository root; leave blank if the dashboard accepts it)
- Build command: none
- Deploy command: `npx wrangler deploy`
- Worker name: `lease-lab`
- Entrypoint: `worker.js`
- Static assets: `public/`
- D1 binding: `DB`

## Before deployment
Create the `session10-lease-lab` D1 database, replace the placeholder ID in `wrangler.toml`, and apply `schema.sql`. Create Worker secrets `TOKEN_SECRET` and `ADMIN_KEY`.

**Not production ready:** See `AUDIT.md`. NIU verification, allocation concurrency and complete manufacturer/dealer lessor accounting grading remain unresolved. Do not put real student data in the app yet.

The future custom domain path is `akm.gunggu.my.id/lease-lab`, but the custom routes in `wrangler.toml` are intentionally commented out pending staging verification. The original textbook app remains in the separate `gunggu/flipbookakm` repository.

## Cloudflare build refresh
A fresh commit was requested to trigger a new connected build from `feature/lease-lab`. The intended deploy command is `npx wrangler deploy --config ./wrangler.toml`. This commit does not change application behavior or configure the D1 database.

## Private roster enrollment (54 students)
- Student roster and one-time codes are **not included in this public GitHub repository**.
- Instructor has two private files: `roster_import_PRIVATE.sql` (54 hashed credentials and preassigned roles) and `student_access_codes_PRIVATE.csv` (individual codes to distribute privately).
- Execute `roster_import_PRIVATE.sql` in the Cloudflare D1 `session10-lease-lab` Console, once, on an empty `roster` table. Its first command creates the roster table.
- Role allocation is precomputed and balanced (27 lessors/27 lessees; 6,6,5,5,5 pairs). Registration does not choose or change roles, so concurrent student registration cannot change case/role quotas.
- Each student registers with their **short NIU**, their **individual enrollment code**, and a self-chosen **8+ character PIN**. The official name is retrieved from the roster.
- Codes are random and only SHA-256 hashes are stored in D1; the private CSV contains the original codes. Treat this CSV as confidential and destroy/archive appropriately after class.
- `TOKEN_SECRET` and `ADMIN_KEY` Worker secrets are required. The old shared `CLASS_CODE` is no longer needed.
- Verify tables: `SELECT case_id,role,COUNT(*) FROM roster GROUP BY case_id,role ORDER BY case_id,role;`
- **Caution:** This setup verifies possession of an individually issued code, not a university SSO identity. Keep instructor distribution restricted, confirm attendance, and do not publish the codes.
- Application still needs a full classroom runtime test and audited IFRS 16 manufacturer/dealer answer key before real grading.
