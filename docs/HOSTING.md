# Hosting

Run `pnpm install --frozen-lockfile` followed by `pnpm start`. The server binds to 127.0.0.1:3000 by default. Set PORT to change the port.

For a managed Node host set HOST=0.0.0.0 and PUBLIC_ORIGIN to the actual HTTPS origin. Use HTTPS, network-level access controls and provider rate limits for a shared deployment. Requests are ephemeral; application records remain in each browser.

GitHub Pages can serve static files but cannot run this research API. The existing private live prototype is hosted separately on Sites: https://applytrack-ryeggouti.maplebison10.chatgpt.site

This repository deliberately excludes the private Sites identity, credentials and starter scaffolding. Its standalone server and the hosted prototype implement the same planner and source-research workflow; a GitHub push does not deploy the private Site.
