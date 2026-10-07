# Fixer E2E — checker message (copy-paste)

Post this in the **same ticket thread** as a **bot** message (checker bot, or any bot if `CHECKER_BOT_USER_ID` is unset on the fixer).

The fixer must already be the assignee and the ticket description must include `Branch: …`.

```
Verdict: CONFIRM

## Reproduction
- `GET /health` returns ok.
- `GET /sample` returns `message: "Sample API response"` without a trailing period.

## Impact
Low — sample/demo endpoint only; good fixer pipeline smoke test.

## Suggested fix
Add the missing period in `getSample()` and update `app.controller.spec.ts` if it asserts the full string.
```

After this message, the fixer should start Cursor (if `Branch:` is set) and reply when the run finishes.
