# Session 10 LeaseLab — Implementation and Audit Report
Date: 2026-11-02
Scope: `lease-lab/` on `feature/session10-lessor-lessee-lab`.
Status: **DRAFT / NOT APPROVED FOR LIVE CLASSROOM DEPLOYMENT**

## Improvements completed
1. Anonymized instructor discussion endpoint `GET /api/admin/discussion`, returning per-case enrollment, pairs, submissions, lessor classifications and median lease measures without names or NIUs.
2. Discussion screen with five case cards, expected treatment and numerical benchmark, designed for the final 45-minute debrief.
3. Instructor-only financial data: manufacturer asset cost and answer classification are removed from the lessee API response.
4. Lessees use the IFRS 16 right-of-use / lease-liability model instead of being required to elect operating/finance classification.
5. Mandatory class schedule is documented as quiz 30 minutes / lab 45 / instructor discussion 45.

## Source-level checks (NOT runtime-tested)
| Check | Assessment |
|---|---|
| Discussion endpoint behind instructor key | Pass by source inspection |
| New discussion UI and action handler | Pass by source inspection |
| Anonymized aggregated projected results | Pass by source inspection; small group sizes still permit potential inference |
| Same-case exclusive claim | Pass by SQL inspection; UNIQUE constraints guard the two sides |
| Role persistence after registration | Pass by source inspection |
| No existing textbook viewer files modified | Pass by changed-file inspection |
| Correct lessee classification terminology | Improved |
| Case prompt ambiguity for manufacturer sales-type accounting | **Needs correction/validation** |
| 54-student concurrent registration balance | **Not guaranteed** |
| NIU ownership verified | **No** |
| Deployment and browser integration | **Not tested** |

## High-priority issues to resolve before opening registration
**P0 — identity assurance.** NIU + self-selected PIN + a shared class code permits another person to pre-register a student's NIU. Require a roster-based one-use credential or SSO, or explicitly treat this as a low-stakes activity and reconcile attendance manually.

**P0 — safe concurrency in assignment.** The current register flow performs a SELECT followed by an INSERT. Simultaneous registration may calculate the same role/case before either INSERT is visible; this can break parity and leave a matching shortage. Move allocation to a serialized transactional coordinator (Cloudflare Durable Object or comparable single-writer coordinator), and enforce roster quotas. The matching INSERT itself is exclusive, but assignment is not.

**P0 — numerical and IFRS 16 instructor answer key.** The current `calc` outputs present value of fixed rents but do not incorporate expected residual into the lessor's net investment, and the manufacturer lessor's sales revenue, cost of sales, selling profit and residual treatment are not fully articulated. A manufacturer lessor under IFRS 16 must use the IFRS 16 manufacturer/dealer rules; do not grade using current basic `calc` fields as if they were a complete solution. In cases 2 and 4, residual is *unguaranteed*, so it is not part of the lessee lease liability; operating lessor retains underlying asset. In finance cases residual is zero. For lease commencement payments in advance, distinguish amounts paid at commencement from outstanding lease liability.

**P1 — scenario design.** For finance lessors, the provided fair value and fixed rents create present values that can differ; explain the pricing and the manufacturer revenue/cost of sales basis. Case 3 advance payments need a distinct schedule. For operating lessors, residual is a learning assumption rather than an amount recognized as a lease receivable.

**P1 — student UI.** Current work area is text-field based and can be long on phones. Implement a streamlined guided journal entry table, autosave drafts, and a per-task timer with a teacher override before the live session. The expected 20-minute accounting window may be demanding.

**P1 — instructor operations.** Add a way to repair mistaken/absent registrations and forcibly rematch absent students, remove test data, close registration, and stop submissions.

**P1 — security/privacy.** Add login rate limiting, session revocation, roster validation, deletion/retention policy for NIUs and answers, and incident responses. Instructor raw key in browser memory should not be exposed on screen or in public demonstrations. Smaller groups may be reidentified from aggregate metrics.

**P2 — live readiness.** Cloudflare D1 database and secrets have not been configured. Run a staged test with 54 dummy registrations including synchronized bursts, uniqueness challenges, five-case quotas, matching race, both role submissions, exports, mobile rendering, and the projected screen.

## Pedagogical acceptance criteria
- Quiz remains outside the case app for the first 30 minutes.
- Case runs 30–75 minutes; every learner has one stable role and one same-case counterpart, or a documented fallback.
- Pair can identify which side reports ROU asset vs manufacturer inventory/underlying asset/lease receivable.
- Finance lessor: student can explain sales income, cost of sales (manufacturer-specific), finance income, receivable and no depreciation.
- Operating lessor: student can explain retained asset, rental income and depreciation.
- Lessee: recognizes ROU asset, lease liability, interest and depreciation, irrespective of lessor's operating classification.
- The 75–120 minute discussion uses only aggregates/projected anonymized information.
- No live rollout until source, math and identity/concurrency tests pass.

## Verdict
**Prototype enhanced and statically audited. NOT production-ready.** A successful GitHub commit is not evidence of a functional deployment. Live tests and the three P0 issues must be closed before accepting actual student registrations.
