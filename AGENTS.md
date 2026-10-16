# LawLab — agent instructions

## Product scope
- LawLab is a six-module, Chinese-language legal education and simulated casework frontend.
- Keep the V0.1 site static: React, TypeScript, Vite and Tailwind CSS. Do not add a database, paid API, authentication service or production deployment without a specific task requiring one.
- Use fictional example cases. Do not treat automated contract checks as professional legal advice; never include real case documents or personally identifiable information in commits.

## Cloudflare
- When interacting with Cloudflare, use the `cf` CLI unless this project has a Wrangler configuration file. Existing Wrangler-based projects should continue using Wrangler.
- For this frontend-only project, prefer **Cloudflare Pages Git integration** (rather than introducing Cloudflare Workers or Wrangler). The expected build command is `npm run build`; output directory is `dist`; repository root is `/`.
- Do not deploy, connect an account, change Cloudflare resources, grant OAuth scopes, or set production branch without explicit user authorization. Preserve the existing `main` branch; develop in feature branches.
- Do not commit tokens, API keys, Cloudflare account IDs, OAuth credentials, or runtime secrets. Do not put private keys into `VITE_*` environment variables: Vite embeds them in the public bundle.
- Before proposing a public deployment, run `npm test`, `npm run typecheck`, and `npm run build`, and check the demo for sensitive information.
- Cloudflare setup instructions: `docs/CLOUDFLARE_SETUP.md`. Official agent instructions: https://developers.cloudflare.com/agent-setup/codex/ and https://developers.cloudflare.com/cf/agents/.
