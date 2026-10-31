# Hosting

## Primary website: GitHub Pages with Netlify research

Keep using https://ryeggouti.github.io/applytrack/. The Pages build configures
`https://zesty-quokka-213e5b.netlify.app` as its research API. Netlify runs the
Node.js functions; no runtime call goes to ChatGPT hosting. Keep the Netlify
project public so the GitHub website can reach those functions.

Your GitHub-address saved list stays in the same browser storage. No import is
needed for colleges already saved there. If you added colleges on either other
address, export that address's backup and import it on GitHub Pages as needed.

Both deployments follow `main`: GitHub Actions publishes the interface, while
Netlify builds the research functions. Keep the Netlify project connected.

## Netlify Free (no card required by the advertised plan)

This is the recommended route if Render asks for card verification. The included
`netlify.toml` builds the static interface and two Node.js Functions for university
lookup and research. Both endpoints use the new site's own domain; no requests go
to ChatGPT hosting. Do not use the GitHub Pages build command for this deployment.

1. Merge `deploy/netlify-no-card` into `main` on GitHub.
2. Export your college-list backup from the old website.
3. Sign up at https://app.netlify.com/ and choose the **Free** plan.
4. Choose **Add new project → Import an existing project → GitHub**.
5. Select `ryeggouti/applytrack` and branch `main`.
6. Keep the detected settings: build command `node scripts/build-netlify.mjs`,
   publish directory `dist-netlify`, functions directory `netlify/functions`.
7. Deploy, open the provided `netlify.app` URL, and import your backup.
8. Test university lookup and research before retiring the old website.

No API key, database or environment secret is needed. Lists remain in browser
storage, which is separate for each website address. The existing sites stay
available; this setup does not delete or transfer their stored data automatically.

The advertised Free plan requires no credit card and has a monthly usage-credit
limit. Functions have a 60-second execution limit; research already uses bounded
fetches and a 55-second browser timeout. Per-instance request limits remain
best-effort when serverless instances scale. Deployment on a real Netlify account
still needs to be verified after connecting the repo.

References: https://www.netlify.com/blog/introducing-netlify-free-plan/,
https://www.netlify.com/pricing/,
https://docs.netlify.com/build/functions/configuration/.

## Independent free Node.js hosting (Render)

`render.yaml` runs the complete planner and research API in one Node.js service.
The browser calls `/api/research` and `/api/universities` on that same service.
It does not use ChatGPT hosting, OpenAI credentials, or any paid AI API.

1. Merge the standalone-hosting branch into `main` on GitHub.
2. Export a backup from each old ApplyTrack address where you saved colleges.
   Browser storage belongs to each address; a new domain cannot read the old list.
3. Create a free account at https://dashboard.render.com/.
4. Choose **New → Blueprint**, connect `ryeggouti/applytrack`, and select `main`.
5. Render reads `render.yaml`. Confirm the service is on the **Free** plan and deploy.
6. Open the HTTPS `onrender.com` URL shown by Render, import your backup, and test
   university search and research. No need to configure an API address.

If you use **New → Web Service** instead, select Node, use
`npx --yes pnpm@11.25.0 install --frozen-lockfile --prod --ignore-scripts` as the
build command and `npm start` as the start command. Choose Free, and add
`HOST=0.0.0.0` and `NODE_VERSION=22`. Health check path: `/health`.
Render supplies `PORT` and `RENDER_EXTERNAL_URL` automatically. For another host,
set `PUBLIC_ORIGIN` to its actual HTTPS origin.

The free service sleeps after 15 idle minutes and can take about one minute to
wake up. It also has usage limits. See https://render.com/docs/free.
No database is required: application data stays in browser storage. Keep backups.

The existing copies remain available during the move. Their saved lists are
separate. GitHub Pages now uses Netlify for research, so moving to Render is
optional. Old hosting can be retired separately after checking backups.

Configuration reference: https://render.com/docs/blueprint-spec.

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
