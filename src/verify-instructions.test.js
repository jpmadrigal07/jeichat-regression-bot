import { afterEach, expect, test } from "bun:test";
import {
  regressionScopeInstructions,
  verificationInstructions,
} from "./verify-instructions.js";

const keys = [
  "CURSOR_RUNTIME",
  "REVIEWER_LIGHT_VERIFY",
  "VERIFY_APP_API_ORIGIN",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test("cloud verification block mentions artifact dir and cloud config", () => {
  process.env.CURSOR_RUNTIME = "cloud";
  process.env.REVIEWER_LIGHT_VERIFY = "false";
  process.env.VERIFY_APP_API_ORIGIN = "http://localhost:3999";
  const block = verificationInstructions({
    pageUrl: "http://localhost:3000/w/ws-1/c/ticket-1",
  });
  expect(block).toContain("/opt/cursor/artifacts/after-fix");
  expect(block).toContain("Cursor Cloud Environment");
  expect(block).toContain("**Verification**");
  expect(block).toContain("bun run test");
  expect(block).toContain("http://localhost:3999/health");
  expect(block).toContain("Regression");
  expect(block).toContain("checker report");
  expect(block).toContain("Screenshot is the last action");
  expect(block).toContain("Snapshot before screenshot");
  expect(block).toContain("browser_snapshot");
});

test("verification uses Verify commands from ticket description", () => {
  process.env.REVIEWER_LIGHT_VERIFY = "true";
  const block = verificationInstructions({
    description: "## Verify commands\ncd apps/api && bun test\n",
  });
  expect(block).toContain("cd apps/api && bun test");
});

test("regression scope is lean in light verify mode", () => {
  const block = regressionScopeInstructions({ light: true });
  expect(block).toContain("2–5 adjacent");
  expect(block).not.toContain("every package you changed");
});

test("regression scope is broader when light verify is off", () => {
  const block = regressionScopeInstructions({ light: false });
  expect(block).toContain("every package you changed");
});
