import { cursorCloudEnvVerifyBullet, isCloudRuntime } from "./cloud-env-hint.js";
import { maxVerificationScreenshots } from "./screenshots.js";
import {
  parseVerifyCommands,
  parseVerifyScope,
  resolveVerifyBrowseUrls,
} from "./verify-spec.js";
import { cleanInstallVerifyBullets } from "./verify-boot.js";
import { verifyDevStack } from "./verify-stack.js";

/** Cursor Cloud stores run outputs under this directory (also visible via Agent.listArtifacts). */
export const CLOUD_ARTIFACTS_DIR = "/opt/cursor/artifacts";

export const VERIFICATION_SCREENSHOT_PREFIX = "after-fix";

/**
 * Prompt block: checker repro + regression on areas related to the diff.
 * @param {{ light?: boolean }} [options]
 */
export function regressionScopeInstructions(options = {}) {
  const light = options.light ?? lightVerifyEnabled();
  if (light) {
    return [
      "Regression (related to this change — do not skip):",
      "   - From the PR diff, name the modules, routes, APIs, and UI flows you expect to be affected.",
      "   - **Must pass:** reproduce the checker report (the reported bug or gap).",
      "   - **Also verify:** 2–5 adjacent behaviors that share code paths with the diff (same page, parent flow, API consumer, permission gate, etc.). If unsure, pick the highest-risk neighbors.",
      "   - Run targeted automated tests for each touched package (not the whole monorepo unless the diff is wide).",
      "   - If you find a regression unrelated to the checker brief, **Result: FAIL** and describe it.",
    ].join("\n");
  }
  return [
    "Regression (related to this change — do not skip):",
    "   - From the PR diff, list impacted areas (packages, routes, jobs, shared utilities).",
    "   - **Must pass:** full reproduction of the checker report.",
    "   - **Also verify:** related flows end-to-end in the browser (happy path + one edge case per major area touched).",
    "   - Run tests for every package you changed; add integration checks when the diff crosses API + web.",
    "   - If anything that worked before this change is now broken, **Result: FAIL** even when the original checker issue is fixed.",
  ].join("\n");
}

/**
 * Prompt block: run the app, reproduce checker brief + ticket spec, save proof screenshots.
 * @param {{ pageUrl?: string | null; runtime?: string; description?: string | null; verifyScope?: 'browser' | 'static-only'; browseUrls?: string[]; verifyCommands?: string | null; bootConfig?: import("./verify-boot-config.js").VerifyBootConfig | null }} ctx
 */
function lightVerifyEnabled() {
  const raw = process.env.REVIEWER_LIGHT_VERIFY?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  return true;
}

function formatBrowseUrls(urls) {
  if (!urls?.length) return null;
  if (urls.length === 1) {
    return `   - Open **${urls[0]}** (from **## Routes** or the ticket page).`;
  }
  const list = urls.map((u) => `     - ${u}`).join("\n");
  return `   - Open these URLs/paths from **## Routes**:\n${list}`;
}

/** Screenshots are posted to the ticket as proof — capture only when UI is ready. */
function screenshotProofBullets(isCloud, artifactDir, maxShots, localDir) {
  const pathLine = isCloud
    ? `   - Save up to **${maxShots}** PNG proof screenshots under \`${artifactDir}/\` (e.g. \`${artifactDir}/01-repro.png\`). The regression bot downloads these via Cursor artifacts and posts them to the ticket.`
    : `   - Save up to **${maxShots}** PNG proof screenshots under \`./${localDir}/\` in the repo root.`;

  return [
    pathLine,
    "   - **Screenshot proof:** Each PNG must show the checker repro or **Done when** behavior clearly. Reviewers treat these as evidence — unusable shots count as incomplete verification.",
    "   - **Wait before capture:** Do not screenshot while the page is still loading. Wait until spinners/skeletons are gone, main content and images are visible, and dialogs or sheets are fully open. Use browser snapshot/polling and **retry** after a few seconds if anything still says Loading or looks empty.",
    "   - Re-navigate or reopen the flow and capture again if the first shot was mid-transition, blurred, or missing the element under test.",
  ];
}

export function verificationInstructions(ctx = {}) {
  const description = ctx.description ?? "";
  const pageUrl = ctx.pageUrl?.trim();
  const verifyScope =
    ctx.verifyScope ?? parseVerifyScope(description);
  const staticOnly = verifyScope === "static-only";
  const browseUrls =
    ctx.browseUrls ?? resolveVerifyBrowseUrls(description, pageUrl);
  const verifyCommands =
    ctx.verifyCommands ?? parseVerifyCommands(description);

  const isCloud = isCloudRuntime(ctx.runtime);
  const artifactDir = `${CLOUD_ARTIFACTS_DIR}/${VERIFICATION_SCREENSHOT_PREFIX}`;
  const maxShots = maxVerificationScreenshots();
  const light = lightVerifyEnabled();
  const { web, healthUrl } = verifyDevStack();

  const envBullet = cursorCloudEnvVerifyBullet(ctx);
  const browseBullet = staticOnly ? null : formatBrowseUrls(browseUrls);

  const commandsBullet = verifyCommands
    ? `   - Run these **## Verify commands** from the spec (adjust only if the diff clearly requires more):\n\`\`\`\n${verifyCommands}\n\`\`\``
    : "   - Run the smallest commands that prove the change (see **## Verify commands** in the spec when present).";

  const checkerBullet =
    "   - Reproduce the **checker report** (in the prompt above). When the description has **Done when**, satisfy both.";

  const authBullet =
    "   - When auth is required: **## Test account** in the description first, then access/login notes in the prompt, then `REVIEWER_TEST_EMAIL` / `REVIEWER_TEST_PASSWORD` from the cloud environment.";

  const cleanInstallBullets = cleanInstallVerifyBullets(ctx.bootConfig ?? null);

  const lines = [];

  if (staticOnly) {
    lines.push(
      "Before you finish verification (**static-only** per ticket — no browser, no `bun run dev` unless a command requires it):",
      ...(envBullet ? [envBullet] : []),
      "   - Read the PR diff first.",
      commandsBullet,
      checkerBullet,
      ...cleanInstallBullets,
      "   - Do **not** start the dev server or walk UI unless the spec, checker brief, or diff proves you must.",
    );
  } else if (light) {
    lines.push(
      "Before you finish verification (keep this **lean** — aim to finish in under ~15 minutes):",
      ...(envBullet ? [envBullet] : []),
      "   - Read the PR diff first. Only run commands needed for the files you changed.",
      commandsBullet,
      ...cleanInstallBullets,
      "   - Prefer targeted checks over the full monorepo suite unless the diff is wide.",
      "   - Start `bun run dev` **only** if you must exercise UI; skip DB migrate unless the diff touches schema/migrations.",
      authBullet,
      checkerBullet,
      browseBullet ??
        "   - Open the flow in the checker report or routes in **## Routes**.",
    );
  } else {
    lines.push(
      "Before you finish verification:",
      ...(envBullet ? [envBullet] : []),
      "   - Run `bun run test` from the monorepo root (or the smallest relevant package tests).",
      commandsBullet,
      ...cleanInstallBullets,
      "   - Apply DB migrations if schema changed: `cd apps/api && bun run db:migrate`.",
      `   - Start the stack: \`bun run dev\` (web ${web}). Wait until \`curl -sf ${healthUrl}\` succeeds.`,
      authBullet,
      checkerBullet,
      browseBullet ??
        "   - Open **## Routes**, the checker flow, or the ticket page when UI is involved.",
    );
  }

  if (!staticOnly) {
    lines.push(
      ...screenshotProofBullets(
        isCloud,
        artifactDir,
        maxShots,
        VERIFICATION_SCREENSHOT_PREFIX,
      ),
    );
  }

  lines.push(
    staticOnly
      ? "   - In your final reply, include a **Verification** section listing commands run and screenshot filenames when applicable."
      : "   - In your final reply, include a **Verification** section listing what you ran and the screenshot filenames.",
  );

  lines.push("", regressionScopeInstructions({ light }));

  return lines.join("\n");
}
