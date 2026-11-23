# DisclosureLab Session 13 — pedagogical, evidence and operations audit

**Scope:** student application `disclosurelab/index.html`, instructor-side file review `disclosurelab/review.html`. Review is of the committed source and simulated browser interactions, not a completed Cloudflare/mobile user acceptance test.

## Pedagogical evaluation
- **Construct coverage:** five structured workpapers integrate presentation, related parties, subsequent events, reportable segments, interim reporting, investor-defined measures, and an integrated memo. All six supporting records are necessary to fully engage with the assignment.
- **Evidence-first assessment:** students receive underlying dates, arrangements, operating records and financial figures; there are no standard citations revealing the expected treatment, no worked examples, no model-response text, no grading or correctness API.
- **Cognitive demand:** predominantly apply/analyze/evaluate rather than recall. Requires calculations, evidence justification and professional writing. A full, high-quality response to 34 structured fields may take approximately 60–75 minutes, not 20 minutes. An instructor can shorten this by assigning selected numbered sections.
- **Clue leakage:** removed teaching language embedded in company records (e.g. references to an exercise), standardized financial-statement category labels, explicit performance-measure definition wording and solved numeric results.
- **Fairness:** sources include the dates needed for period-end classification, a receivable recovery estimate to permit numerical assessment, and a complete operations-to-group profit bridge. Ambiguities requiring external information can be explicitly noted by students rather than guessed.
- **Artificial evidence note:** Merapi Industrial Systems is fictional. Documents are purpose-built for teaching and should not be represented as actual third-party evidence.

## Data and cross-document checks
- Group revenue reconciles to quarterly total, external operating-line revenue, and the individual source schedule.
- Gross segment revenues include separately identified internal transactions; group revenue excludes them.
- Sum of segment results less unallocated group expense reconciles to group operating result.
- The investor communication's adjusted subtotal agrees arithmetically with the source income-and-expense schedule and the specified excluded charge.
- Related-party contract dates, reported year-end balance, insurance period and reporting-authorization date are chronologically consistent after revision.
- Reporting schedule, corporate correspondence and annual/interim financial records no longer use out-of-character narrative instructions.

## Visual and experience revision
- Corporate reporting-room palette and structured paper-like documents with reference IDs, issuing office, dates, document classification and register navigation.
- Five numbered accounting workpapers, 34 structured response fields, keyboard-addressable navigation, narrative character counters and content-only progress status.
- Document opening log is a navigation aid only; it does **not** assert that students understood or audited the document.
- Tablet/mobile responsive adjustments, high-contrast focus indicators and reduced-motion CSS included.

## Operation and safety checks
- Narrative response fields remain plain text; numerical and classification fields are captured as strings in version-2 JSON. Prompt-like input and HTML snippets are retained as data and never interpreted as commands or displayed as executable markup in instructor review.
- Local autosave, pagehide flush, JSON version-2 export, separately marked draft backup, JSON restore and 34-field response preservation checked in an in-memory browser-state smoke test. The instructor review parser supports the prior version-1 seven-section narrative format.
- Empty sections cause an explicit export confirmation; they do **not** receive instructional feedback.
- Review utility counts answered sections and flags multiple records under the same NIU, but does not grade; repeated imports of the same record ID retain the latest exported record.
- CSV output prepends a neutralizing quote to spreadsheet-formula-like values.
- No live server API, database call, AI service or automated answer endpoint appears in the student script.
- Source search found no answer keys, solved outputs, model responses, answer-oriented chat text or prompt-following commands in the published student page.

## Residual risks / release gate
1. No authentication, server-controlled exam timing, immutable submission or identity verification. NIU/name and timestamps are self-reported; local JSON can be edited before uploading.
2. Local storage can be unavailable or cleared, and shared-device privacy must be managed. Draft backup/download plus eLOK submission remains essential.
3. The `review.html` viewer is public but has no stored roster or server-side data; it is **not** a protected faculty dashboard. The instructor must keep exported JSON private.
4. A rigorous response to all five workpapers may be too long for a brief in-class exercise. Select fewer sections if the time limit is around 20 minutes.
5. Real-device visual, browser accessibility, print-layout and Cloudflare deployment testing are still required. The source smoke checks do not establish these.
6. This app cannot stop students from seeking external AI answers. It does not itself answer their questions or reveal grading criteria.
7. Existing Cloudflare Git integration may automatically rebuild this feature branch on commit. Verify the running build version and test with fictional student records before sending students the URL.

**Audit disposition:** source-level and functional-smoke ready for controlled staging; not verified as an authenticated assessment or fully production-tested application.

## Structured-workpaper follow-up audit (24 November 2026)

- Replaced the former seven freeform essay areas with five workpapers and 34 discrete entries (number fields, classification/decision selectors and short evidence-backed explanations).
- Numerical inputs have format validation only, not correctness validation or auto-calculation. Accounting judgment choices are not preselected.
- Rechecked client JavaScript syntax, all 34 structured entries, JSON version 2 export, draft backup and restore using simulated browser elements.
- Verified that no worked answers, hidden teacher keys, correctness hints or AI-response instructions appear in the student code.
- Corrected escaped regular expressions in client and instructor import code; preserve prior seven-section drafts, including original sections 6 and 7.
- Release limitations remain: no live browser screenshot regression or authenticated Cloudflare/examination backend test performed.
