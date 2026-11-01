# Application planning

The workspace adds five views using the existing green and cream palette, dark
mode, native forms, and responsive navigation:

- **This week:** today through the next six calendar days, overdue work, and
  completed-task totals. Admission deadlines join tasks, essays, recommendations
  and funding dates. Completed tracker items are excluded. Confirmed admission
  cutoff times are respected; other tracker dates are calendar dates.
- **Tasks:** college-specific work, optional due dates, notes, links, and
  Not started / In progress / Done stages. Check Done directly on a task card.
- **Essays:** title, full prompt/notes, word limit, optional deadline and draft
  link, with Not started / Drafting / Reviewing / Ready / Submitted stages.
- **Recommendations:** recommender name, requested date, optional due date,
  notes and link, with Not asked / Requested / Received / Submitted stages.
- **Scholarships & aid:** distinguish Scholarship from Financial aid and track
  each program's own date, notes, source link and application status.

Each tracker filters by college and open/completed status. **Plan work** on an
application card opens that college's task list. Item removal offers **Undo**.
Removing a college moves it and its associated planning items to local Recovery in About.

## A quieter workspace

The sidebar groups Tasks, Essays, Recommendations and Scholarships & aid under
**Application work**. The group opens automatically when visiting one of those
views, including a direct link or reload. This week, applications, deadlines and
documents remain visible at the top level.

**This week** also counts open work without a date, including undated admission
deadlines. Select **Without a date** to open and jump to that list. When there is
no upcoming or overdue work, the list opens by default if undated work exists.

## Calendar export

Choose **Export calendar** from This week or Deadlines to download an `.ics`
snapshot of all unfinished dated work, including dates beyond the current week.
Import the file using your calendar app's import option. Completed tracker items,
submitted admissions and items without a date are excluded. Private note and
recommender-name fields are not included; titles and college names are included.

Date-only items become all-day events. Admission cutoffs with an entered time
use their saved time zone (or the browser's local zone when set to My time zone)
and export as UTC. Selecting a zone without a time does not invent a cutoff.
The file does not add notification alarms or submit anything to a calendar
provider. This is a snapshot, not an automatic calendar subscription: changes in
ApplyTrack require a fresh export. Stable event IDs help calendar apps recognize
events, but duplicate handling on reimport depends on the calendar app.

## Saved data and backups

Planning items are nested under their college in the existing `applytrack-v1`
storage entry. Existing colleges receive empty trackers in memory; loading the
app alone does not rewrite storage. College edits preserve planning records.

Backups now use format version 6 and include every tracker and deadline-review metadata. Versions 1, 2, 3, 4 and 5 still
import, with empty trackers if no planning data exists. Older app versions will
reject a version 6 backup rather than silently drop these fields. Update the app
before importing a new backup on another device. Backup files are limited to
20 MB; storage quota failures leave the previous saved list intact.

Import **Add new items only** keeps all details and planning for existing IDs.
**Replace my list** replaces the complete list, including planning items. Export a
copy first when unsure. Trackers and recommender details remain in browser
storage and exported backups; they are never sent to the university research API.

## Verification

Automated tests cover old-data migration, all-field backup round trips, edits,
duplicate IDs, malformed dates and unsafe links, year-boundary weekly grouping,
completed items and funding work after admission submission.

Browser checks cover all four creation forms, task completion/filtering,
removal/undo, backup export and restore on a fresh local origin, college edits,
and phone layout at a 390-pixel viewport. Both Pages and Netlify builds are checked.

## Focused tasks and essays

Tasks now include an application area, priority and concrete next action. Optional
starting points fill only an editable title and next action, never requirements or
dates. Essays separate the official prompt, working draft (30,000-character cap),
word limit and next revision. Counts use whitespace-separated words and may differ
from the submission platform; check the final count there. Existing notes remain
intact. Local drafts are included in backups and Recovery, never calendar exports
or research requests. There is no autosave: save the form before leaving.

## Shared activities and prompt library

Activities are a shared workspace list independent of any college. Store up to 200
entries, shortlist them, reorder them, and draft role / organization / description
fields using 50 / 100 / 150 character limits from Common App guidance. Time, years,
stage, evidence and next steps are editable. Export visible activities as text or
use the normal JSON backup for full fidelity, including private notes. Activity
deletions offer Undo; list replacement stores shared activities in local Recovery.

Essays now offer a source-linked library of 95 editorial prompt summaries from 16
providers. This includes seven Common App topics and eight UC first-year PIQs. It
is not an exhaustive collection of US schools or specialized programs. Selection
opens an editable, unsaved essay with its cycle, source, checked date, choice
instructions and verified limits. Character limits stay separate from word limits.
If a prompt is already saved for that college, it opens the existing draft.
Library summaries are labelled; the full official wording remains at the source.
Users can paste exact wording into their own editor and add custom prompts.

See [prompt sources and scope](PROMPT-LIBRARY.md) and [storage details](WORKSPACE-STORAGE.md).
