# Research reliability and verification limits

The crawler follows official same-institution links, retaining the existing HTTPS,
academic-host and redirect checks. It reads up to 10 HTML pages in at most 14
attempts, with a shared 24-second budget propagated to robots and each fetch.
Requests retain the declared ApplyTrack user agent. Robots failure/denial and human
verification are not bypassed. Robots results, including failures, are reused
within a lookup. No new scraping service, proxy, AI API or account is introduced.

Source priority balances checklists, international instructions, school materials,
writing, testing, dates, fees and aid rather than spending all slots on similar
pages. Dedicated recommendation links get priority while specific letter evidence
is missing. Explicitly wrong first-year/transfer pathways are not queued. The
parser now handles definition lists, readable leaf blocks and deeper headings,
keeps list introductions, and respects parent sections when excluding another
applicant pathway. Conditional evidence is kept prominent; mixed conditions stay
mixed. Passing mentions do not establish required interviews. Financial-aid forms
are separate from admission requirements; proof of funds is financial certification.

## What the response and UI report

verification lists topic-level explicit instructions, conditions, policies, mentions,
mixed conditions and absent evidence. Missing evidence is never a waiver, exemption
or automatic requirement. English-language policy can remain unknown for domestic
applicants too; applicant type does not establish language eligibility.

scan records read/attempt counts, stop reason, failed URLs and reasons, plus discovered
but uninspected links. Relevant PDFs are listed for manual reading, not silently
counted as extracted. Empty script shells are unreadable. The UI separately checks
whether fee, waiver policy and an admission round/year were actually extracted.
It does not claim to verify all rounds, current cycle, personal eligibility, aid
applications, program-specific supplements or the final applicant-portal checklist.

Instructions, mentions/mixed conditions, financial-aid evidence and excluded options
are separate groups. The select-all control includes admission instructions and
policies only; uncertain mentions and aid items require individual selection.
Unavailable interviews cannot be added as a required checklist item by that control.

## Amherst's optional dated guide

On 2026-11-01 the deployed endpoint and direct Node requests returned HTTP 405
Human Verification for Amherst's robots.txt / first-year source. The live report
keeps zero fetched pages and no live documents when blocked. Separately, an
optional saved reference is offered for Amherst first-year applicants. It contains
human-reviewed summaries from these official pages:

- https://www.amherst.edu/admission/apply/firstyear
- https://www.amherst.edu/admission/apply/international

Reviewed 2026-11-01, reference cycle 2026–2027. It covers application form, writing,
school transcript/report, counselor and two teacher recommendations, midyear
updates, ED-specific items, optional testing/arts, conditional English evidence and
an interview-policy exclusion. Domestic profiles omit international-only entries;
transfer profiles are not given this first-year reference. It is not a live scrape,
not a complete checklist and not confirmation of personal applicability.

The user must explicitly open this guide. Its sources and each summary are labelled
not live verified. Fees and deadlines are deliberately absent from the guide; they
cannot silently become cached autofill values. Pasted text remains another option,
explicitly not authenticated or fetched. Keep the review date/cycle current when
maintaining this guide; do not update those labels without checking the sources.

## Saved-data behavior

Research still fills only an editable draft. Existing fees, dates, personal waiver
statuses, notes and completed documents are preserved. Rechecks deduplicate by base
document label while keeping the existing saved name/condition; new excerpts go to
notes for review. Identical source blocks and document excerpts are not repeatedly
appended. If notes cannot fit, the user sees an overflow warning and existing notes
are not overwritten. No source can prove that absent documents are unnecessary.

Previously researched colleges retain the disabled Requirements already found
button, plus an explicit Check sources again action. Saved college cards keep a
visible reminder, and notes retain source provenance, unresolved topics and live
failures where space permits. Reference/pasted deadline provenance is manual,
never a fabricated fetched timestamp. No storage/backup schema migration is needed.

## Validation

Tests cover blocked Amherst without invented live evidence, dated-guide profile
matching and empty fee/deadline arrays, evidence-state distinctions, nested/definition
list parsing, scope inheritance, conditional aggregation, financial-aid separation,
manual PDF follow-up, scan limits, unreadable shells, expired request budgets and
profile-specific links. Existing official-response autofill and saved-data tests
remain in the suite. Browser checks use a disposable localhost workspace, including
13 guide selections, blank initial fee/deadline, rechecking without duplicate
documents, completed-document retention and a manually entered fee preserved.
