import { expect, test } from "bun:test";
import {
  parseVerifyCommands,
  parseVerifyScope,
  resolveVerifyBrowseUrls,
} from "./verify-spec.js";

test("parseVerifyScope detects static-only", () => {
  const description = "## Verify scope\nstatic-only\n\n## Goal\nx";
  expect(parseVerifyScope(description)).toBe("static-only");
});

test("resolveVerifyBrowseUrls prefers Routes", () => {
  const description = "## Routes\n/apps/settings\n";
  expect(resolveVerifyBrowseUrls(description, "http://t/1")).toEqual([
    "/apps/settings",
  ]);
});

test("parseVerifyCommands returns fenced block body", () => {
  const description = "## Verify commands\nbun test apps/web\n";
  expect(parseVerifyCommands(description)).toBe("bun test apps/web");
});
