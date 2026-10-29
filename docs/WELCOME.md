# Welcome and guided tour

First visits show an animated Welcome dialog with a five-step optional tour: add a college, research official sources, view deadlines, update documents and export a backup. Each step highlights its real control or view. Back, Next, Skip and Escape are supported. Completion restores the visitor's original workspace view. About includes Replay welcome tour.

After completion or skipping, later page openings show one of four returning greetings, avoiding an immediate repeat. Greetings dismiss automatically after five seconds or by close button. The sidebar, header, introduction, overview and content reveal with short staggered fades. Prefers-reduced-motion disables these animations. Application content is not CSS-hidden by default, so failure to load the welcome script does not hide the workspace.

Tour history and last greeting use applytrack-welcome-v1, independent of applytrack-v1 application data and backups. Session storage is a fallback when persistent storage cannot be written; unavailable storage does not block use. The tour never adds, edits or removes colleges.

Validation: 49 tests pass. Browser checks covered all five steps, completion, return visits with different greetings, replay from About and preserved sample application/checklist data. A desktop visual check confirmed highlighted controls and the welcome dialog. Reduced motion is handled by both the script's media query and CSS.
