# Welcome and guided tour

First visits show an animated Welcome dialog with a five-step optional tour: add a college, research official sources, view deadlines, update documents and export a backup. Each step highlights its real control or view. Back, Next, Skip and Escape are supported. Completion restores the visitor's original workspace view. About includes Replay welcome tour.

After completion or skipping, later page openings show one of four returning greetings, avoiding an immediate repeat. Greetings dismiss automatically after five seconds or by close button. The sidebar, header, introduction, overview and content reveal with short staggered fades. Prefers-reduced-motion disables these animations. Application content is not CSS-hidden by default, so failure to load the welcome script does not hide the workspace.

Tour history and last greeting use applytrack-welcome-v1, independent of applytrack-v1 application data and backups. Session storage is a fallback when persistent storage cannot be written; unavailable storage does not block use. The tour never adds, edits or removes colleges.

Validation: 49 tests pass. Browser checks covered all five steps, completion, return visits with different greetings, replay from About and preserved sample application/checklist data. A desktop visual check confirmed highlighted controls and the welcome dialog. Reduced motion is handled by both the script's media query and CSS.

## Personalized arrival and optional profile

An optional local profile stores a preferred name, applicant classification, entry type and July–June application cycle start year. New visitors can fill or skip it before the tour; existing visitors are offered setup once after arrival. About includes an edit action. Chosen application preferences prefill new research dialogs but remain editable. Name is used only locally in greetings and is never included in research requests. No academic eligibility or waiver decision is inferred.

Returning visits now show an opaque full-screen greeting first, with the sidebar and main content hidden. After a short hold, the greeting leaves and the workspace reveals in stages. Escape can bypass the intro; reduced-motion uses a static greeting and immediate transition. A timed bootstrap fallback restores the page if the welcome script cannot load. Twenty greeting templates personalize the preferred name and avoid immediate repeats.

The profile uses applytrack-profile-v1, separate from application records and tutorial history. Empty names produce generic greetings. Profile fields are optional, whitelisted and length/range bounded; their text is rendered with textContent. Preferences are not included in college-list backups.

Validation: 51 automated tests pass. Browser checks covered an existing visitor profile prompt, saving a test name and application choices, research prefilling international/transfer values, a personalized full-screen greeting with main visibility hidden, preserved college/checklist data, and fresh-visitor profile skipping followed by the first tutorial step.

The arrival greeting is aligned near the upper-left of the main content column. There is no Continue button; it automatically fades into the workspace after a brief hold. Browser-checked the greeting-only screen and automatic transition.
