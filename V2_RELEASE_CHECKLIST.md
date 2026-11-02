# LeaseLab V2 — staging release checklist

DO NOT switch the production Cloudflare Worker to this branch before staging D1 migration and runtime testing.

## Database migration
1. Export/backup the current D1 database before changes.
2. Use a separate STAGING D1 database for rehearsals; do not use the private 54-student roster in public staging.
3. Apply migration_003_v2.sql once to the target D1 database.
4. Confirm tables: allocation_guard, drafts, audit_events, login_limits.
5. Confirm students.assigned_at and interactions.status, initiated_by, confirmed_at.
6. Do not run allocation on the real roster until class begins.

## New workflow
- Student enrolls with individual NIU/code, creates personal PIN, then waits without seeing case/role.
- Instructor closes attendance and randomizes all registered students atomically across up to five company cases.
- Each case has lessor and lessee representatives; students independently request conversations from multiple counterparts.
- The counterpart must explicitly confirm an interaction; any counterpart may confirm several.
- Students can autosave worksheet drafts, enter structured balanced journals, and submit independent work.
- Instructor can allow late check-in, assign newly registered students, freeze submissions, and export anonymized discussion or identifiable attendance reports.
- A class allocation can be reset only before any interactions or submissions exist.

## Acceptance tests in staging
1. Check in 13 dummy NIUs; verify all see waiting state.
2. Randomize; confirm each of five active cases has at least one lessor and one lessee.
3. Trigger two allocations concurrently; confirm only one succeeds and assignments are complete.
4. Test attempted second allocation and guarded reset before and after interactions.
5. Request one counterpart interaction, confirm with the opposite student, and repeat with a different student.
6. Confirm same-role and cross-case interaction requests fail.
7. Verify submission is blocked before confirmed interaction.
8. Verify draft autosave persists after browser reload.
9. Verify journal debit/credit validation requires commencement and Year 1 events.
10. Verify responses are not revealed until own submission.
11. Test PIN recovery, invalid PIN lockout, late arrival, instructor reassignment, and submission freeze.
12. Test desktop, tablet and 375-px mobile layout and check old textbook site remains accessible.

## IFRS 16 assumptions and accounting
- Finance lessor cases 1, 3, 5 have fair values reconciled to PV rentals at stated implicit rates and no unguaranteed residual.
- At commencement the manufacturer/dealer finance lessor recognises sales revenue = lower of FV and PV rentals at market rate; cost of sales = asset carrying amount (no residual); selling profit is the difference.
- Operating lessor cases 2, 4 retain underlying assets, recognise rental income and depreciation. The provided rate is lessee IBR, not necessarily implicit lessor rate.
- Lessee uses ROU model. For Case 3 rent is paid at commencement, so liability immediately after payment equals PV rentals less first payment, while ROU asset includes that payment.
- Instructor financial benchmarks are NOT an automated marking engine; validate full debit/credit solutions independently before grading.

## Remaining limitations
- Enrollment codes verify possession but not university SSO identity.
- Conversation occurs in person, not through real-time chat.
- No full amortization table or automatic numerical grading.
- Production Cloudflare has not been switched to V2; release requires migration and testing.