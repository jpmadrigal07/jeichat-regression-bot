# Fixer smoke — copy-paste

Push the branch with the `FIXER-SMOKE` typo to GitHub first if using `CURSOR_RUNTIME=cloud`.

**Title:** `Fix sample API typo (fixer smoke)`

**Description:**

```
Branch: develop

Typo on GET /sample: message is "Sample API respones" but should be "Sample API response".
Fix apps/api/src/app.service.ts (getSample) and apps/api/src/app.controller.spec.ts.
```

**Checker message:**

```
Verdict: CONFIRM

GET http://localhost:3001/sample returns message "Sample API respones". Should be "Sample API response".
```

Label **Bug**, assign **Fix Bot**.
