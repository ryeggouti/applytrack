# ApplyTrack

A college application planner with device-local checklists.

**[Open the GitHub Pages prototype](https://ryeggouti.github.io/applytrack/)**

The public prototype supports manual college planning, checklists and backups.
Automatic university research is available through its link to the
[server-hosted prototype](https://applytrack-ryeggouti.maplebison10.chatgpt.site),
which currently requires the owner's ChatGPT sign-in.

## Run locally

Use Node 22.13+ and run `node server.mjs`, then open http://127.0.0.1:3000.
Install the HTML parser first with `pnpm install --frozen-lockfile`.

## Repository history

This repository is an incremental extraction of an existing prototype. Its commits document working extraction checkpoints, not separate days of development. All commits use their actual creation time.

Created with assistance from an AI coding assistant.

## Features

- Custom colleges, rounds, deadlines, fees and notes
- Device-local document checklists and JSON backups
- University lookup and official admissions-page research
- Domestic/international and first-year/transfer source filtering
- Quoted evidence, source links and review before importing suggestions

## Check

Run `pnpm test`. GitHub Actions checks JavaScript syntax and source-research regressions.

Read [research limits](docs/RESEARCH.md), [privacy](docs/PRIVACY.md), and [hosting](docs/HOSTING.md). The admissions suggestions need human review; this tool does not submit applications or guarantee a complete checklist.
