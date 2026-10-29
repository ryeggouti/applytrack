# Workspace views

The sidebar links to My applications, Deadlines, Documents and About ApplyTrack. Links use URL fragments for browser back/forward navigation and direct links. Active links expose aria-current; view headings receive focus when navigating. Mobile navigation remains visible as a horizontal row.

Deadlines groups saved colleges into upcoming (including today), past, missing-date and submitted sections. Documents uses the existing records and save function: checking an item updates the same checklist shown on application cards. Navigation and derived views do not write to storage. No storage key, record schema or backup version changed.

About credits ryeggouti, links to the public GitHub profile, explains local storage and research, and reuses the existing backup export action.

Validation: 48 automated tests pass, including date grouping without mutating records. Browser checks covered direct About navigation, empty deadlines, creating a sample only on localhost, checking its document in Documents and verifying the same item and totals on My applications. Desktop About layout was visually inspected. Production college data was not used or modified during testing.
