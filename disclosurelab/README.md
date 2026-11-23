# DisclosureLab · Intermediate Accounting II · Session 13

A self-contained **student case workpaper** for Kieso, *Intermediate Accounting: IFRS Edition*, 5th edition, Chapter 23, with IFRS 18 / PSAK 118 reporting judgment. Fictional reporting entity: Merapi Industrial Systems (year ended 31 December 2027).

## Scope and operational boundary

- Student page: `disclosurelab/index.html`
- Local instructor workpaper importer: `disclosurelab/review.html`
- Does **not** change LeaseLab, CashFlow Lab, ChangeLab, Cloudflare Worker routing, D1 schemas, credentials or existing students.
- **Deployment must be verified separately.** The feature branch may be connected to automatic Cloudflare Git builds; a GitHub commit alone does not prove the live website updated.
- No correct answers, marking criteria, solved calculations, hint strings or grading functions are shipped. Structural field checks do not assess accounting accuracy.
- No AI model, chatbot, prompt processing, network submission, API calls, response interpretation or AI-generated feedback.
- The review utility imports JSON on the instructor's own device and is **not an authenticated server**. It offers no protected cloud dashboard. A password placed in browser JavaScript would not be secure.

## Student experience

Students enter a numeric short NIU and full name (no account). They inspect six original case records, complete five structured accounting workpapers with 34 individually captured fields, then download a version-2 JSON submission or a distinct draft-backup file. An autosaved local draft survives refresh on the same browser/device when localStorage is available. Students can restore an exported JSON backup, view a six-document register with document IDs, and navigate five numbered workpapers. Local draft storage is not a backup: students must download and upload the JSON to eLOK before finishing. The application never submits grades or files to eLOK.

The case includes financial results, year-end and later events, a shareholder financing agreement, operating-line data, interim records and public investor communications. This is an **assessment**, not a guided tutorial: there is no confirmation of whether a response is accurate. The evidence is necessary to answer; wording deliberately avoids normative answer labels.

## Instructor experience

Open `review.html` from a separate instructor-controlled environment, select multiple submission JSON exports, inspect answers, see field-completion counts and repeated-NIU warnings, and export a summary CSV. Draft backups use a different file type and are not accepted as final submissions. No answer keys are present; assessment uses the instructor's existing course rubric. This file should not be published as a password-protected system; it is simply a local convenience utility with no authentication.

## Local testing

1. Serve the repository root with a static file server, e.g. `python -m http.server 8000`.
2. Open `http://localhost:8000/disclosurelab/` in desktop and mobile browsers.
3. Enrol with synthetic NIU and name; open all six documents, enter responses, save and refresh.
4. Download a JSON file and inspect it for student identification and all seven responses.
5. Open `/disclosurelab/review.html`; import the file and check for correct display and spreadsheet-safe CSV.
6. Test malicious-looking user inputs (HTML tags and common chat instructions) as ordinary text: they must never alter the application, produce answers, or execute scripts.
7. Test offline behavior, private/incognito storage restrictions, shared-device resets, 200% zoom and keyboard navigation.

Node-based source and syntax checks may be run with `node --test disclosurelab/tests/static.test.mjs`. See `AUDIT_SESSION13.md` for pedagogical findings, arithmetic reconciliation, redaction/wording checks, and remaining release limitations. They are not a substitute for a real browser or a supervised classroom rehearsal.

## Pedagogical and privacy boundaries

- This activity emphasizes analysis rather than multiple-choice cues.
- The app **cannot stop students consulting external AI**. It does not itself produce AI replies, correct solutions or diagnostic hints.
- Case materials remain visible to every student as they must be for a fair exercise; the company is fictional.
- Student NIU/name and workpaper are stored locally only. They may be visible to others on a shared device until cleared. Use university-approved eLOK submission for retention and assessment.
- Browser localStorage and client-side timestamps do not provide secure identity, a tamper-proof deadline, immutability, or anti-cheating protection. A secure timed exam requires authenticated backend infrastructure.
- No automatic correctness scoring, exam-grade identity verification, response locking, or reliable cross-device synchronization is implemented.
- Do not publish a private answer key in this repository or any student-accessible frontend.

## Structured workpaper revision (Session 13 v2)

The five workpapers cover (1) income-statement presentation and investor performance subtotal, (2) post-year-end events, (3) IFRS 8 segment thresholds and decisions, (4) interim accounting, and (5) related-party disclosure and final review memorandum. Numerical fields are typed by students; financial statement totals are **not** calculated for them. Reporting decisions are selected by students; the application does not mark them correct or incorrect. Narrative fields are reserved for evidence citation and professional judgment.

Student exports use JSON `version:2`, with responses structured by `w1`–`w5` and field IDs. The instructor review utility imports both version-1 narrative submissions and version-2 structured submissions. Earlier browser drafts with seven narrative responses are migrated, preserving sections 6 and 7 inside the relevant newer workpapers as prior narrative text. Backups should be downloaded before resetting or changing devices. **A valid-looking student submission JSON is not authenticated or tamperproof.**

The full structured case likely requires **about 60–75 minutes** for a typical prepared undergraduate student; this is a design estimate, not observed completion data. Shorter sessions should omit selected fields or tasks via instructor directions rather than cutting off evidence review.
