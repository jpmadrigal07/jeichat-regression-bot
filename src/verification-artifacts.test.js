import { expect, test } from "bun:test";
import {
  pickVerificationArtifactPaths,
  postVerificationScreenshotsEnabled,
} from "./verification-artifacts.js";

test("prefers after-fix artifact paths", () => {
  const paths = pickVerificationArtifactPaths(
    [
      { path: "/opt/cursor/artifacts/other.png", sizeBytes: 1, updatedAt: "" },
      {
        path: "/opt/cursor/artifacts/after-fix/01-repro.png",
        sizeBytes: 2,
        updatedAt: "",
      },
    ],
    5,
  );
  expect(paths).toEqual(["/opt/cursor/artifacts/after-fix/01-repro.png"]);
});

test("keeps the latest after-fix screenshots when over the limit", () => {
  const paths = pickVerificationArtifactPaths(
    [
      { path: "/opt/cursor/artifacts/after-fix/01-debug.png", sizeBytes: 1, updatedAt: "" },
      { path: "/opt/cursor/artifacts/after-fix/02-debug.png", sizeBytes: 1, updatedAt: "" },
      { path: "/opt/cursor/artifacts/after-fix/03-proof.png", sizeBytes: 1, updatedAt: "" },
      { path: "/opt/cursor/artifacts/after-fix/04-proof.png", sizeBytes: 1, updatedAt: "" },
    ],
    2,
  );
  expect(paths).toEqual([
    "/opt/cursor/artifacts/after-fix/03-proof.png",
    "/opt/cursor/artifacts/after-fix/04-proof.png",
  ]);
});

test("postVerificationScreenshotsEnabled respects REVIEWER_POST_SCREENSHOTS", () => {
  const previous = process.env.REVIEWER_POST_SCREENSHOTS;
  process.env.REVIEWER_POST_SCREENSHOTS = "false";
  expect(postVerificationScreenshotsEnabled()).toBe(false);
  delete process.env.REVIEWER_POST_SCREENSHOTS;
  expect(postVerificationScreenshotsEnabled()).toBe(true);
  if (previous !== undefined) process.env.REVIEWER_POST_SCREENSHOTS = previous;
});
