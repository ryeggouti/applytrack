# Privacy and backups

Application records stay in localStorage for the browser and site address used. Clearing browser data removes them. JSON exports are private backups; do not commit them. Import merges new IDs without replacing existing entries.

The research server receives only the university query or URL and applicant/entry type. Stored application notes, fees and completed documents are never sent. The university directory may query Wikidata; public admissions sites are fetched by the server. Google Fonts is used for typography. No AI API key or ChatGPT sign-in is needed. Cross-origin API requests omit browser credentials. Client addresses may be used transiently for best-effort rate limiting, and the hosting provider may keep infrastructure logs.
