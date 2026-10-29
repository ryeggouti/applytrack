# Research autofill correction — 2026-10-29

## Reproduction and diagnosis

Inspected GitHub default-branch commit 4048824 and the deployed Pages HTML and research-autofill.js on 2026-10-29. The published HTML loaded the extension after app.js and research.js but did not version its URL. The deployed API was queried with Yale's first-year application-process URL, international, first-year.

The API redirected to https://admissions.yale.edu/apply and returned three yearless excerpts: single-choice early action November 1, QuestBridge November 1 and regular decision January 2. It returned no fee excerpts. Three of five scanned pages were unrelated Yale international travel resources.

The old extension's separate click listener normally ran after research.js reset/opened the draft, copied documents, appended source references and closed the research dialog. Closing aborts lookups but does not clear researchReport. Thus normal event order does not explain the missing fields: missing fee evidence and explicit-year-only parsing do. However, returning from the main listener's changed-editor guard did not stop the extension's second listener, so it could still modify the wrong draft. Its waiver userTouched flag also survived form resets.

Old extraction required a unique date with an explicit year in each excerpt, could not associate multiple rounds/dates, required the dollar amount to follow the fee phrase, omitted heading/short fee evidence, and treated mention of a waiver as a reason to set To request. It could not distinguish personal eligibility from general availability. Some round types were absent from the form. Deadlines/fee excerpt limits could discard relevant evidence.

## Result

One guarded transfer explicitly invokes the extractor. No second click listener remains. Extraction accepts ISO and month-name dates, including abbreviated months and day-first month names. Multiple dates are paired only in supported clear round/date or date-for-round clauses. Invalid, conflicting, range and ambiguous dates remain unfilled. Notification, test and financial-aid dates are excluded from application deadlines.

The optional application-cycle start year is an explicit user choice: July of that year through June of the next year. It is not inferred from the clock, checkedAt or URL. A year explicitly supplied by the source is retained. Without a cycle, yearless evidence is still recorded with its source and an unknown-year label.

The chosen round fills an empty deadline; changing rounds updates only an untouched deadline generated in that draft. All established rounds, date basis and sources are appended to notes. ED I, ED II, restrictive early action, QuestBridge and priority rounds are available and accepted in backups. Existing round values and version-1 backups remain valid. Round switching after reopening a saved college does not regenerate dates from notes: the saved deadline stays authoritative.

Fee amounts work in either order, including standalone amounts under an application-fee heading. Inconsistent amounts, deposits, tuition, conditional free-fee statements, ambiguous foreign currency and ungrounded excerpts are left unknown. Waiver excerpts, conditions and negations are copied to notes; the user's waiver workflow status is preserved. Availability does not establish personal eligibility or justify marking a request approved.

Crawler priorities favor application entry pages, timelines, requirements and fee evidence over travel, financial aid and other applicant types. Heading/short evidence is retained and excerpts are not truncated at 650 characters or capped at eight deadline/five fee records. Five-page, time, size, origin, robots and SSRF protections remain.

Research only edits the draft. It never writes localStorage or automatically saves. Existing fees, deadlines, waiver statuses, notes and completed document states are preserved. Duplicate evidence blocks are skipped; notes remain bounded at 5,000 characters and overflow is announced.

## Live verification

Official pages were retrieved on 2026-10-29. Captured API-shaped fixtures retain source URLs and timestamps for deterministic tests.

| University | Application deadlines with explicitly chosen 2026 cycle | Fee evidence |
| --- | --- | --- |
| Yale | Restrictive/single-choice early action and QuestBridge: 2026-11-01; regular: 2027-01-02 | Current scanned admissions pages do not state an amount; leave blank. Waiver conditions retained. |
| Harvard | Restrictive early action: 2026-11-01; regular: 2027-01-01 | $95; waiver conditions retained. |
| MIT | Early action: 2026-11-01; regular action: 2027-01-04 | $75; domestic/international waiver conditions retained. |

Yale's current https://admissions.yale.edu/requirements page describes application-platform waiver eligibility, free QuestBridge applications and military exceptions, but no dollar fee. Its official 2025–26 Common Data Set reports $80: https://oir.yale.edu/sites/default/files/yale_cds_2025-26_md_20260410_0.pdf . That retrospective document was not silently promoted to a current-cycle fee or hardcoded. This patch intentionally does not guarantee Yale's fee field will be populated until a current applicable official amount is retrieved. PDF crawling remains unsupported.

## Validation and delivery

Run `pnpm install --frozen-lockfile`, `node --test`, `node --check public/research-autofill.js`, `node --check public/research.js`, `node --check public/app.js`, and `node scripts/build-pages.mjs`.

Tests cover Yale/Harvard/MIT captured official responses, all extracted rounds, ED I/II, explicit cycle requirements, invalid/conflicting dates, multi-round pairing, fee-order variants, currency/conflict rejection, waiver negation retention, short heading evidence and form preservation. Form tests execute the extension in a simulated DOM; no manual browser end-to-end session was performed.

Deploy the same revision to BOTH the Pages frontend and the Node research service. The Pages build now fingerprints research-autofill.js too. A GitHub Pages push does not deploy the API service. No production deployment or remote push was performed by this work.
