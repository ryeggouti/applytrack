# ApplyTrack

A college application planner with device-local checklists.

**[Open the GitHub Pages prototype](https://ryeggouti.github.io/applytrack/)**

The public website supports college planning, checklists, backups and automatic
university research in the same page. No account is needed. GitHub Pages serves
the interface; a separately hosted research API (configured in
`scripts/build-pages.mjs`) fetches official sources in the background. If that API
is unreachable, the planner keeps working and offers manual entry instead.
Saved applications stay in this browser.

To host the complete app independently of ChatGPT, use the included free Render
Node.js configuration. See [the setup and backup migration steps](docs/HOSTING.md#independent-free-nodejs-hosting-render).

## Run locally

Use Node 22.13+ and run `node server.mjs`, then open http://127.0.0.1:3000.
Install the HTML parser first with `pnpm install --frozen-lockfile`.

## Repository history

This repository is an incremental extraction of an existing prototype. Its commits document working extraction checkpoints, not separate days of development. All commits use their actual creation time.

Created with assistance from an AI coding assistant.

## Features

- Custom colleges, rounds (including UCAS and OUAC), deadlines with optional time and time zone, fees in 15 currencies, and notes
- Countdown labels and urgency highlighting for upcoming deadlines
- Device-local document checklists, backup reminders, and JSON backups that can be merged or restore a whole list
- University lookup and official admissions-page research
- Domestic/international and first-year/transfer source filtering
- Quoted evidence, source links and review before importing suggestions

## Check

Run `pnpm test`. GitHub Actions checks the syntax of every server and browser script and runs the test suite.

Read [research limits](docs/RESEARCH.md), [privacy](docs/PRIVACY.md), and [hosting](docs/HOSTING.md). The admissions suggestions need human review; this tool does not submit applications or guarantee a complete checklist.
