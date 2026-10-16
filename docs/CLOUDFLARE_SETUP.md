# Cloudflare setup for LawLab

This guide is based on Cloudflare's official Codex agent and Cloudflare Pages documentation, verified October 2026:

- https://developers.cloudflare.com/agent-setup/
- https://developers.cloudflare.com/agent-setup/codex/
- https://developers.cloudflare.com/cf/agents/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/build-image/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

## 1. Connect Codex to Cloudflare (one-time, on your own computer)

If you use Codex CLI, start Codex in the LawLab working directory:

```powershell
cd path\to\LawLab
codex
```

Inside Codex run `/plugins`, then search for and install the **Cloudflare** plugin. The Cloudflare plugin provides Cloudflare Skills and MCP servers. If using the Codex desktop application, install Cloudflare via the Plugins interface.

If the plugin cannot be used, use the official remote Cloudflare MCP endpoint as an alternative:

```powershell
codex mcp add cloudflare --url https://mcp.cloudflare.com/mcp
codex mcp list
```

You can add a separate documentation MCP server if needed:

```powershell
codex mcp add cloudflare-docs --url https://docs.mcp.cloudflare.com/mcp
codex mcp list
```

Cloudflare OAuth approval occurs in your own browser on the first authenticated call. Only approve the permissions needed. Restart Codex after changing plugins or MCP registrations.

Cloudflare also provides a beta `cf` CLI, optional for this static Pages site:

```powershell
npm install --global cf
cf auth login
```

`cf auth login` requires your interactive browser authorization. The project-level `AGENTS.md` tells Codex when to prefer `cf` over Wrangler. Don't put API tokens in source control.

**Important:** Changes to a sandbox or GitHub repository do not install CLI tools or register MCP servers on your personal Windows computer.

## 2. Verify the frontend before publishing

Requirements: Node.js 22 LTS (pinned in `.node-version`) and npm.

```powershell
npm install
npm test
npm run typecheck
npm run build
npm run preview
```

Check browser behavior for all six modules, console errors and responsive layout; do not upload actual contracts or private case materials.

## 3. Connect GitHub to Cloudflare Pages

1. Sign in at https://dash.cloudflare.com/ using your own Cloudflare account.
2. Open **Workers & Pages** and select **Create application → Pages → Import an existing Git repository** (the labels can vary by dashboard version).
3. Authorize Cloudflare's GitHub integration **only for the repository `zeye-w/LawLab`**, if the integration offers a repository selection.
4. Configure Pages:
   - Project name: `lawlab` (or another available name)
   - Framework preset: **React (Vite)** / **Vite**
   - Production branch: `main` **only after** the application has been reviewed and merged to main
   - Root directory: `/`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `22.16.0` using the committed `.node-version` (or set `NODE_VERSION` in build settings)
5. Only after you decide to publish, click **Save and Deploy**. Cloudflare will provide an HTTPS URL such as `https://<project-name>.pages.dev`.

The Vite build produces `dist`, and Cloudflare Pages automatically handles SPA navigation when there is no top-level `404.html`. No Worker configuration or backend is necessary for V0.1.

## 4. Review and security

- Cloudflare dashboard access, OAuth and GitHub access grants are user-authorized steps, not automatically completed in this repository.
- If you connect a Git branch as production, commits to that branch may trigger **automatic public deployments**. Confirm the branch and review the site before enabling this.
- Do **not** add Cloudflare API tokens, OpenAI API keys or other credentials to GitHub, frontend source, or `VITE_*` variables.
- This frontend has no real AI contract review; rule-based checks must clearly state limitations.
- Time-line entries and quiz progress may persist in browser localStorage; use only synthetic test data.
- To incorporate real AI later, introduce a server-side authenticated, rate-limited proxy, a privacy policy, and a separate deployment/security review.

## Current implementation boundary

This repository contains deployment preparation and agent instructions only; it does not itself install a plugin on your laptop, authorize Cloudflare, create a Pages project or publish the website.
