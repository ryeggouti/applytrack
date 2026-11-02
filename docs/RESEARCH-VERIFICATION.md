# Research reliability and verification limits

The crawler follows official same-institution links, retaining the existing HTTPS,
academic-host and redirect checks. It reads up to 10 HTML pages in at most 14
attempts, with a shared 24-second budget propagated to robots and each fetch.
Requests retain the declared ApplyTrack user agent. Legacy HTTP redirect targets
are attempted over HTTPS only (not fetched over HTTP); certificate, university-host,
same-institution and per-destination robots checks still apply. This fixes old
Location headers from Washington and Lee and Bowdoin. Robots failure/denial and human
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

Public prose inside forms is retained, but interactive controls, hidden values,
questionnaires and applicant response fields are removed before extraction.
Slate paragraph/instruction blocks survive; typed-question blocks do not. No form
is executed or submitted. Quick Pass is treated only as a waiver-policy source,
so its questionnaire does not become an admission document checklist.

At least one dedicated timeline page retains priority even if a general checklist
already mentions a date. Financial-aid dates and QuestBridge-only dates/fees are
excluded from general application autofill. Yearless dates still require the
applicant's explicit application cycle.

## Automatic Amherst alternatives and pathway separation

If the Amherst first-year starting page cannot be read, the same bounded scan
automatically tries these public university-owned sources:

- https://admission.amherst.edu/register/quickpass
- https://admission.amherst.edu/register/qbrdsupplement

Only addresses are configured; requirements, dates and fees are extracted anew.
Each origin's robots policy is checked. Alternative forms do not expand into
other application pathways. They are not used for transfer or unrelated schools.

Quick Pass can establish an institutional waiver option, never personal eligibility
or an application fee amount. The QuestBridge supplement's documents, fees and
deadlines are partitioned into a `pathways` report, displayed under **QuestBridge
only — separate application pathway**. They do not enter the general checklist,
topic coverage, document selection, fee autofill or deadline autofill. This
partition also applies to dedicated QuestBridge pages entered directly and to
QuestBridge sections encountered on general admissions pages.

The main Amherst checklist remains unverified when its source is blocked. The UI
states this even when the alternatives load successfully; the optional dated guide
and paste fallback remain available. Opening the dated guide is an explicit action
and does not turn saved summaries into live verification.

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
keeps no fetched evidence from the blocked main source; accessible alternatives
can still contribute live waiver policy and separate QuestBridge excerpts. An
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

## Application deadline layouts

The deadline reader retains labelled rows/columns from tables, date-plus-application
lists and two-column timelines before flattening page text. Parent round headings
remain attached to nested cards. Bare unlabelled dates, merged/ambiguous columns
and ranges are not assigned to a round. Application dates are separated from aid,
testing, notification, reply, grade-report, optional-arts and other material dates.
QuestBridge-prefixed records and labelled process cards are isolated, including
Caltech's proof-of-certification row and Dartmouth's QuestBridge-only process card.
General autofill also excludes QuestBridge defensively from older responses.

A yearless restatement can match an explicitly dated statement for the same day;
the source year is retained. Yearless-only evidence still requires the applicant's
chosen cycle. Different days or differing known years stay unresolved. The UI shows
the candidate dates, quotes and source links for comparison instead of asserting
that the university itself published contradictory application deadlines.

See [the 18-school deadline audit](DEADLINE-RELIABILITY.md) for results, dated source
links and Williams's remaining access block. Production code contains no
university-specific deadline values. The deadline source and confirmation controls
also remain contained within the edit dialog when a long source URL is supplied.

## Validation

Tests cover blocked Amherst without invented live evidence, dated-guide profile
matching and empty fee/deadline arrays, evidence-state distinctions, nested/definition
list parsing, scope inheritance, conditional aggregation, financial-aid separation,
manual PDF follow-up, scan limits, unreadable shells, expired request budgets and
profile-specific links. Existing official-response autofill and saved-data tests
remain in the suite. Browser checks use a disposable localhost workspace, including
13 guide selections, blank initial fee/deadline, rechecking without duplicate
documents, completed-document retention and a manually entered fee preserved.

The automatic-source tests also cover form-field exclusion, no cross-pathway
document/date/fee leakage, per-origin robots denial, blocked alternatives, HTTPS
redirect upgrades and official directory matching for the 18-school coverage set.
See [US research coverage checks](US-RESEARCH-CHECKS.md) for the dated live audit and
the repeatable check command. Readable sources do not prove a complete checklist.
