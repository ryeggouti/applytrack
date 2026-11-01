# Research coverage and blocked sources

On 2026-11-01, Amherst College returned HTTP 405 Human Verification for both
robots.txt and its first-year admissions page to direct Node fetch. The deployed
Netlify API returned HTTP 200 with an empty pages array and a robots-access warning.
The old UI hid this cause behind a generic request for a more specific URL.
This change does not bypass verification or relax robots restrictions.

The crawler now prioritizes checklist/materials links and reduces redundant
deadline/fee links once that evidence has been found. It still scans at most ten
pages, fourteen attempts, with a 24-second crawl budget. It cannot guarantee completeness.
Essay and document-specific links also receive priority. The parser retains labels in nested lists and separates counselor/teacher letters,
mid-year reports/transcripts, senior grades and ED agreements. List ancestry stays
with evidence so optional/conditional parent labels are not lost. No school-specific
requirements or dates are hardcoded. Amherst’s directory entry supplies a starting
URL only: https://www.amherst.edu/admission/apply/firstyear

Paste page text is an explicit alternative. The user supplies an academic URL and
50–60,000 characters of public plain text. It is escaped before parsing, never
executed or fetched. Reports and saved source notes label it as pasted, not fetched
or authenticated. Deadline evidence uses manual origin and no fetched timestamp;
confirmation still requires the user. Nothing enters saved colleges until Save.
The API body limit is 365,000 bytes to accommodate JSON escaping; text has its own
60,000-character validation and existing origin/rate limits remain.

The current version adds structured coverage and failure reporting, source-purpose
diversity, profile-specific link filtering, PDF/manual follow-up links and a strict
24-second network budget shared by robots, redirects and page bodies. Financial-aid
evidence is separated from admission evidence. See [verification](RESEARCH-VERIFICATION.md).
