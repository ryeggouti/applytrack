# Hosting

Run `pnpm install --frozen-lockfile` followed by `pnpm start`. The server binds to 127.0.0.1:3000 by default. Set PORT to change the port.

For a managed Node host set HOST=0.0.0.0 and PUBLIC_ORIGIN to the actual HTTPS origin. Use HTTPS, network-level access controls and provider rate limits for a shared deployment. Requests are ephemeral; application records remain in each browser.

## GitHub Pages prototype

The public app is hosted at https://ryeggouti.github.io/applytrack/.
The Pages workflow prepares static files in `_site/` and publishes them on
each push to main. Its research dialog calls the public API configured by
`scripts/build-pages.mjs` without leaving the page, sending cookies or signing in.
The hosting service runs the scraper; GitHub Pages serves the interface.

The API allows the Pages browser origin and its own origin. It answers OPTIONS
preflight requests for JSON POSTs, bounds body sizes and uses per-instance
concurrency and rate limits. These limits are best-effort, not a distributed quota.
No application records are stored on the research server.

Asset hashes in the published HTML prevent an old browser-cached configuration
from mixing with a newly deployed research client.

This repository excludes hosting identity, credentials and starter scaffolding.
Its standalone server uses the same request policy as the hosted API.
A GitHub push deploys the Pages frontend; backend changes must also be deployed
to the research service.
