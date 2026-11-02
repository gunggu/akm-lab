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
Create the `session10-lease-lab` D1 database, replace the placeholder ID in `wrangler.toml`, and apply `schema.sql`. Create Worker secrets `CLASS_CODE`, `TOKEN_SECRET` and `ADMIN_KEY`.

**Not production ready:** See `AUDIT.md`. NIU verification, allocation concurrency and complete manufacturer/dealer lessor accounting grading remain unresolved. Do not put real student data in the app yet.

The future custom domain path is `akm.gunggu.my.id/lease-lab`, but the custom routes in `wrangler.toml` are intentionally commented out pending staging verification. The original textbook app remains in the separate `gunggu/flipbookakm` repository.

## Cloudflare build refresh
A fresh commit was requested to trigger a new connected build from `feature/lease-lab`. The intended deploy command is `npx wrangler deploy --config ./wrangler.toml`. This commit does not change application behavior or configure the D1 database.
