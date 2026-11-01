# Workspace storage and backup compatibility

The browser key remains applytrack-v1. Legacy values are college arrays. The new
reader accepts them without writing and supplies an empty shared activities list.
On the first successful save, colleges and activities are written atomically as
one localStorage value: {format:"ApplyTrackStore",version:1,colleges,activities}.
This avoids a college import succeeding while its activity write fails. Validation
and quota failures leave both lists intact; the stale-tab guard compares the exact
stored snapshot before writing. Cross-tab reconciliation reads either format.

Backups use ApplyTrack version 6 with colleges and activities arrays. Versions 1–5
still import and preserve current activities because they have no activity payload.
Version 6 requires a valid activities array. Replace explicitly replaces both lists
and first preserves both in Recovery. Add new items merges missing IDs independently
for colleges and activities, preserving current edits and activity ordering.

Older deployed code cannot read the new envelope. After this version is saved,
an old tab's stale snapshot guard blocks its write; an old reload shows unreadable
storage without overwriting it. Reload into the current release before editing.
Older app versions reject version 6 backups rather than silently drop data.

Backups and Recovery include essay prompt provenance, working drafts and shared
activities. Profile, theme and welcome preferences remain separate, as before.
Activities can exist without any colleges. No account or network storage is added.
