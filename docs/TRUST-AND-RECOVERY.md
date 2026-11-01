# Trust and recovery

## Deadline checks

A saved date is not automatically verified. Existing records start as needing
confirmation. Research-filled dates keep their source URL and research timestamp
where a source can be paired with the selected date and round. The editor lets
you add a source URL and explicitly confirm that you checked the date and round.
Badges appear on application cards, admission rows and the weekly admission item.

Confirmation belongs to the exact college name, website, date, round, time and
zone. Changing those details invalidates it. It means **confirmed by you**, not
independently certified by ApplyTrack. Calendar descriptions include the review
status. Old research notes stay intact and are not treated as proof of verification.

## Removed colleges and list replacement

About → Recovery retains the last 20 removed colleges, including their document
checklists and all planning items. A recovery record is written before deletion;
if it cannot be written, the deletion is blocked. Once 20 removals are retained,
the oldest entry is displaced by a new removal. This is local convenience
recovery, not a replacement for exported backups.

Replacing a non-empty list during backup import first saves the previous list in
the same recovery store. The most recent previous list can be downloaded or its
missing colleges restored. Restoration never overwrites an existing college ID.
To recover a different version of an existing ID, download the previous list and
inspect it before using the explicit import replacement flow.

Recovery uses `applytrack-recovery-v1` in the same browser and origin. Clearing
browser storage removes it too. Standard exports contain active colleges only;
restore removed colleges first if you want them in the next export. A previous
replacement snapshot can also be downloaded directly. Recovery read errors leave
stored contents untouched. Storage quota failures do not proceed with deletion
or replacement.

## Editing safeguards

College and planning forms ask whether to keep editing before discarding a
changed draft. Browser-supported unload warnings also help with page navigation;
these warnings depend on the browser and are not an autosave system.

Saves compare the stored list with the snapshot loaded by that tab. If another
tab changed it, a stale save is refused and the draft remains visible so you can
copy it. Closing the form loads the latest saved list. With no form open, storage
events synchronize the tab automatically. This is a stale-write safeguard using
browser storage, not a server-backed collaborative editing system.

## Navigation and finding work

Application work animates its height and opacity on open and close, supports rapid
reversal, and uses native details/summary semantics. Reduced-motion users retain
the instant native disclosure. Trackers now search title, notes, recommender name
and college name without changing data. Calendar help is expandable.

## Compatibility and checks

Backups now use version 5 to retain deadline-review metadata; versions 1–4 remain
supported. Old app versions reject version 5 instead of dropping fields silently.
Automated tests cover confirmation invalidation, metadata validation, stale-tab
saves, recovery retention and quota failure. Browser checks cover deletion and
restoration with linked work, list replacement recovery, draft keep/discard,
cross-tab conflicts and tracker search. Deployment remains GitHub Pages with
the independent Netlify research API.
