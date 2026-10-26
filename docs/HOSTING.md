# Hosting

Run `pnpm install --frozen-lockfile` followed by `pnpm start`. The server binds to 127.0.0.1:3000 by default. Set PORT to change the port.

For a managed Node host set HOST=0.0.0.0 and PUBLIC_ORIGIN to the actual HTTPS origin. Use HTTPS, network-level access controls and provider rate limits for a shared deployment. Requests are ephemeral; application records remain in each browser.

## GitHub Pages prototype

The public planner is hosted at https://ryeggouti.github.io/applytrack/.
The Pages workflow prepares the static files in `_site/` and publishes them
on each push to main. College planning, checklists and JSON backups work locally
in the browser. Pages cannot execute the research API, so its research dialog
links to the separate server-hosted prototype instead of making broken API calls.
That prototype currently requires the owner's ChatGPT sign-in:
https://applytrack-ryeggouti.maplebison10.chatgpt.site

The two site addresses have separate browser storage. Use Export and Import
to transfer a list; this does not happen automatically.

This repository deliberately excludes the private Sites identity, credentials and starter scaffolding. Its standalone server and the hosted prototype implement the same planner and source-research workflow; a GitHub push does not deploy the private Site.
