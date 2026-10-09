# Per-repo verify boot (regression bot)

The bot loads **`{owner}__{repo}.json`** from this folder using the ticket board’s linked GitHub repo (e.g. `jpmadrigal07__koobo-main.json`).

Copy [`_example.json`](./_example.json) when adding a repo. App repos do not need a verify-boot file.

Keep profiles in sync with [jeichat-code-bot](https://github.com/jpmadrigal07/jeichat-code-bot) when both bots verify the same repositories.

## Schema

```json
{
  "globalBoot": true,
  "commands": ["bun install", "..."],
  "packages": ["apps/web"],
  "packageScript": "build"
}
```

Use **`commands`** for turbo/monorepo scripts, or **`packages`** for simple `cd … && bun run build` loops.

## Add a new repo

1. Copy an existing profile JSON.
2. Rename to `GitHubOwner__GitHubRepo.json` (match the board link exactly).
3. Redeploy / restart the regression bot.

Optional override: `REPO_PROFILES_DIR` on the bot points at another directory.
