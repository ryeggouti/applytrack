## Official-source research

Choose Research a university, search by name or paste an official admissions URL,
then choose international/domestic and first-year/transfer.
Twenty common US universities have navigation seeds only, not stored requirements.
Other name searches use Wikidata's official-website claims and ask the student to
confirm the match. A URL can be supplied when search is unavailable.

The server scans up to five public HTML pages within the university's academic
domain, prioritizing the requested applicant and entry type. Each suggestion has
a source excerpt, source URL, classification and lookup time. It honors robots
rules, validates every redirect, limits response sizes, and reports partial scans.
It does not execute page scripts, bypass access controls, inspect PDFs, or use a
paid AI service. Supported domains: .edu, .edu.country, .ac.country,
uni-/univ-<name> sites in several European countries, and an explicit list of
university domains in `lib/urls.mjs` (for example utoronto.ca, mcgill.ca,
ethz.ch and tudelft.nl). Add a university's root domain to that list to support it.

These are keyword-based research suggestions, not a verified or exhaustive
admissions policy. Optional, recommended and conditional language is retained;
mixed passages are flagged for review. No suggestions are preselected.
The user chooses items, reviews the editable college form, then saves it.
Previously completed checklist items are preserved when editing.
Dates and fees are shown as source excerpts, not guessed or automatically entered.
Verify the relevant round, entry year, program, citizenship/residence and schooling.
Financial-aid and enrollment documents can have different applicability.

Deadlines are calendar dates entered by the student, with an optional time and
time zone; when both are set, the planner also shows the deadline in the
student's own time zone. Always confirm the date, submission time, time zone,
and document requirements with the college. Fees can be entered in one of 15
currencies; research only extracts US-dollar fees. This tool does not submit applications or send reminders.

## Verification

Run `pnpm test` and `node --check public/research.js`.
Research tests cover profile filtering, qualifiers, robots, redirects, body limits,
deduplication, unavailable-source behavior and search fallback.
Backup files are validated before import; no existing records are replaced.

Created with assistance from an AI coding assistant.
