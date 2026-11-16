# CashFlow Lab — Session 12: Two Methods, One Cash Flow

**Status: tested application and draft PR; not deployed.** This is an independent Cloudflare Worker and additive schema migration for `gunggu/akm-lab`. It shares LeaseLab's existing **D1 student identity** (`students.niu`, `students.name`, `students.pin_hash`), but owns its sessions, submissions and scores under `cf_*` tables. It **never writes LeaseLab's role, case, submissions, allocation, matches, settings or drafts**. `cf_login_limits` is also isolated.

## Student and instructor routes

- Student: `https://akm.gunggu.my.id/cashflow-lab`
- Instructor: `https://akm.gunggu.my.id/cashflow-lab/admin`
- Health: `/cashflow-lab/api/health`
- Readiness: `/cashflow-lab/api/ready`

The instructor creates a session (case A/B/C), students sign in with their **existing NIU and personal PIN**, and the application assigns them to Direct or Indirect by a DB-atomic balanced allocation among those who actually join. **Both teams see the same underlying financial statements and supplementary notes within the class.** The instructor starts a *shared* 20-minute server-side deadline. Individual drafts auto-save; each student can submit only once. Scores and detailed correct values are withheld from students until the timer expires or the instructor closes the session. The instructor gets side-by-side **actual student-reported operating cash medians**, correct-total counts by method, class-average and misconception diagnostics, answer-key reveal and CSV export. The personally identifiable student roster is hidden by default in the discussion view.

Students who do **not** have an existing LeaseLab account should be enrolled in LeaseLab using its normal private roster + generic instructor code process **before** CashFlow Lab. This module intentionally does not add students or set provisional lessor/lessee roles in the shared table.

## Accounting and pedagogical design

The original case **Merapi Industrial Systems plc** is 2026, IAS 7 **before IFRS 18 takes effect** (no early adoption). Interest paid is classified as financing, interest received as investing, and dividends paid as financing under the explicit entity policy. All amounts are **EUR thousands** in the worksheet; source notes label amounts in whole euros. Three class variants multiply all base figures by 1, 2, or 3; because of integer scaling, their account movements and cash flow statements reconcile without rounding.

### Advanced, fair distractions

1. Gross receivables **and** loss allowance, including noncash customer write-offs and credit-loss expense.
2. Inventory impairment/write-down already included in COGS; must **not** be deducted twice in supplier payments.
3. Cash disposal proceeds versus disposal **gain**; original cost and accumulated depreciation of the sold equipment disclosed.
4. Noncash financing of machinery through a lease liability; not a cash capex or a cash loan receipt.
5. Dividends **declared** versus cash dividends **paid**; use dividends payable rollforward.
6. Warranty expense (provision) versus actual warranty cash settlements.
7. Cash interest classification policy for 2026; interest payable and interest income are disclosed.
8. Noncash land revaluation through other comprehensive income.
9. Management's future growth forecast (context, not a 2026 collection figure).

The direct team reconstructs six gross operating cash receipts/payments; the indirect team computes signed profit-reconciling adjustments including net receivables. Both teams complete identical investing/financing entries, cash reconciliation and accounting judgment questions. Scores: **55 operating method + 25 investing/financing + 10 reconciliation + 10 accounting judgments = 100**. No speed-based bonuses, and group scores should not be compared as a measure of which method is superior.

### Independently audited base-case answer checks (in EUR thousands)

- Net profit **102**, customer cash receipts **848**, supplier purchases **455**, cash paid to suppliers **427**.
- Cash provided by operating activities (direct AND indirect): **133**.
- Investing cash flow: **−86**; financing: **+58**.
- Net increase in cash: **+105**; opening cash **95**; closing cash **200**.
- PPE cost rollforward, accumulated depreciation, allowance, gross receivables, inventory, tax/payables, debt, dividends, OCI and equity rollforwards all reconcile.
- The 16 case invariants are tested for all three variants. Do not change only the balance sheet or only cash-flow assumptions: update the model and run the tests together.

## Staging and deployment instructions — **do not skip**

1. Confirm the live LeaseLab Worker and its readiness endpoint, and back up D1 **`session10-lease-lab`**.
2. Clone the production D1 database to a staging database with synthetic students. First apply `cashflowlab/schema.sql` on staging. Verify no `cl_*`, `students`, `roster`, `submissions` or LeaseLab tables were altered by the migration. This is an **additive migration only**.
3. `cd cashflowlab && npm test && npm run check`. Tests use Node's built-in SQLite to simulate D1, checking login, anti-brute-force, assignment, submission locking, scoring and scoreboard privacy. These tests are **not** a full Cloudflare Worker integration test.
4. Set `TOKEN_SECRET` to **exactly the same secret as LeaseLab** because student PIN hashes depend on it. Set `ADMIN_KEY` to an instructor-only secret. Never commit these secrets. Do not use them in tests.
5. Deploy as a **separate Worker** using `cashflowlab/wrangler.toml` only after verifying its route assignments. The configuration binds the **existing** D1 `session10-lease-lab` and serves only `/cashflow-lab` and `/cashflow-lab/*`. Do not route over `/lease-lab` or `/change-lab`.
6. On staging, sign in using real hash formats (legacy SHA256 and PBKDF2), test roster enrollment in LeaseLab separately, test Direct and Indirect allocations for 1–100 concurrent students, network interruption, autosave/refresh, hard deadline, double-submission attempts, instructor dashboard, answer embargo, CSV, mobile/tablet projection and text-to-speech accessibility.
7. Back up production D1 again; apply `cashflowlab/schema.sql` to production only with an explicit deployment decision; set secrets on the new Worker; deploy. Run `/cashflow-lab/api/ready` and perform a synthetic instructor rehearsal before inviting students.

**Important:** Neither creating this PR nor merging it automatically migrates D1 or deploys Cloudflare. No production DB actions are included in this package. The production database must remain untouched until a controlled rollout.

## Local tests

```bash
cd cashflowlab
npm test
npm run check
```

There are no third-party runtime dependencies. The Worker, model and UI are written as ECMAScript modules.

## Classroom operation

Instructor: open `/cashflow-lab/admin` → enter key → create case → students sign in and join → start timer → monitor → after submissions, reveal side-by-side Direct and Indirect keys with reconciliation → export CSV → close session for new class. A previous session's scores remain in `cf_attempts` for audit; the app shows only the latest session by default.

Students: sign in → join → assigned method displayed → examine income statement, comparative balance sheet and seven note sections → complete signed operating entries → complete investing and financing section → reconcile the cash balance → explain noncash and IAS 7 classification decisions → submit once.

### Known limitations

- **Only existing student accounts** are accepted; no generic code registration from CashFlow Lab itself. The separate LeaseLab enrollment flow owns student creation.
- A draft that was never finalized is **not** counted as a submission after expiry. Remind students to press **Final submit**.
- Access uses an instructor-shared key and inherited student PIN authentication. Do not put grades or names on a publicly projected dashboard; instead show the anonymized summary.
- The instructor currently creates sessions one at a time; previous sessions are retained but not displayed by the default dashboard.
- No live Cloudflare staging test or real-student concurrency rehearsal was performed in the authoring environment.