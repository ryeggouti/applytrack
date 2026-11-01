# Privacy and backups

Deadline-source URLs, research timestamps and your confirmation choices also stay
with the college record. Local Recovery retains up to 20 removed colleges and
the list before the most recent replacement until displaced by newer recovery
entries or cleared with browser storage. These records never go to the research
API. See [trust and recovery](TRUST-AND-RECOVERY.md).

Application records, tasks, essay prompts, local working drafts, revision notes and draft links, recommender names, request dates and funding plans stay in localStorage for the browser and site address used. Clearing browser data removes them, and some browsers (notably Safari) may clear site storage after a period without visits. ApplyTrack asks the browser to keep its storage (`navigator.storage.persist()`), tracks when you last exported a backup, and reminds you when a fresh backup is due. JSON exports are private backups; do not commit them. When importing into a non-empty list you can either add only colleges that aren't already on it, or replace the whole list with the backup.

The research server receives the university query or URL and applicant/entry type. If you explicitly choose Paste page text, that public-page text is also sent for extraction; ApplyTrack does not authenticate it or fetch the URL in that mode. Do not paste private application information. Stored application notes, fees, completed documents and all planning trackers are never sent. The university directory may query Wikidata; public admissions sites are fetched by the server. Google Fonts is used for typography. No AI API key or ChatGPT sign-in is needed. Cross-origin API requests omit browser credentials. Client addresses may be used transiently for best-effort rate limiting, and the hosting provider may keep infrastructure logs.

Activities (including roles, organizations, participation years, time estimates,
shortlists, achievements and planning notes) and essay prompt references stay in
the same browser workspace. They are included in version 6 JSON backups and local
pre-replacement Recovery. They never go to the research API. The activity text
export includes the visible entries, descriptions, achievements and next steps;
keep it private. It excludes the private-notes field. Opening a prompt’s official
source visits that university’s website; browsing the built-in library sends no
drafts or activity data. See [workspace storage](WORKSPACE-STORAGE.md).

Research reliability reports include only public source URLs, failures and evidence
coverage. The optional Amherst guide is shipped public reference data, labelled
with its review date and cycle; using it sends no private application data. Rechecks
use the same URL/profile inputs as before. See [verification limits](RESEARCH-VERIFICATION.md).
