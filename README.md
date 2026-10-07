# JeiChat regression bot

Staging clone of [jeichat-reviewer-bot](https://github.com/jpmadrigal07/jeichat-reviewer-bot) for **pipeline regression** and E2E smoke tests. Same verification behavior (Cursor prompts, artifacts, JeiChat uploads); use a **separate JeiChat bot token** and workspace/channel so production reviewer traffic stays isolated.

On each **In review** ticket the Cursor agent reproduces the checker brief and **regression-checks related flows** implied by the PR diff (targeted tests + spot-checks; full checklist when `REVIEWER_LIGHT_VERIFY=false`).

Companion bots: [jeichat-fixer-bot](https://github.com/jpmadrigal07/jeichat-fixer-bot), `jeichat-sample-bot` (sample tester), `jeichat-bug-checker-bot` (live-site QA).

## E2E smoke test (fixer + checker + verification)

Copy-paste templates and a step-by-step checklist:

- [`docs/fixer-pipeline-e2e-test.md`](docs/fixer-pipeline-e2e-test.md)
- [`templates/ticket-bug-fixer-e2e.md`](templates/ticket-bug-fixer-e2e.md)
- [`templates/checker-confirm-fixer-e2e.md`](templates/checker-confirm-fixer-e2e.md)
- [`templates/checker-refute-example.md`](templates/checker-refute-example.md)

## Library modules

| Module | Role |
|--------|------|
| `src/verify-instructions.js` | Prompt block: tests, dev server, browser repro, PNG paths under `/opt/cursor/artifacts/after-fix/` |
| `src/cloud-env-hint.js` | Cursor Cloud: secrets in `process.env`, no committed `.env` |
| `src/verify-stack.js` | `VERIFY_APP_*` dev URLs + health check in prompts |
| `src/verify-spec.js` | Parse ticket `## Routes`, `## Verify commands`, `## Verify scope` |
| `src/verification-artifacts.js` | List/download Cursor artifacts; `REVIEWER_POST_SCREENSHOTS` gate |
| `src/attachments.js` | Presign → R2 → post message with `attachmentIds` |
| `src/screenshots.js` | Shared image helpers (`MAX_SCREENSHOTS`, content types) |
| `src/client.js` | Minimal JeiChat REST + Socket.IO client |
| `src/cursor.js` | Cursor SDK options (cloud env binding, no auto-PR) |

`src/index.js` connects to JeiChat and runs when a ticket moves to **In review** (or is assigned to this bot while In review).

## Run (local)

```bash
bun install
cp .env.example .env
bun run start
bun test src
```

Use the **regression** reviewer bot token from JeiChat (not production reviewer, fixer, or checker tokens).

## Docker

```bash
cp .env.example .env   # fill in tokens
docker compose up --build
```

Pass env into the container the same way as other bots (Coolify UI, or `docker run --env-file .env`).

Or build and run without Compose:

```bash
docker build -t jeichat-regression-bot .
docker run --rm --env-file .env jeichat-regression-bot
```

## Deploy (Coolify)

This bot is one long-running process. It is **not** a website — no domain or HTTP proxy.

1. Push this repo to GitHub.
2. **New resource → Application** → this repo, build pack **Dockerfile**.
3. Set env vars from `.env.example` (live `JEICHAT_API_URL`, regression reviewer token, `CURSOR_*`, optional `FIXER_BOT_USER_ID`).

`docker-compose.yml` is a one-service wrapper for hosts that prefer Compose over a plain Dockerfile.
