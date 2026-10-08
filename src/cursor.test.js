import { afterEach, expect, test } from "bun:test";
import { cursorAgentOptions, resolveCursorModel } from "./cursor.js";

const keys = [
  "CURSOR_API_KEY",
  "CURSOR_RUNTIME",
  "CURSOR_REPO_URL",
  "CURSOR_REPO_REF",
  "CURSOR_REPO_PATH",
  "CURSOR_CLOUD_ENVIRONMENT",
  "CURSOR_MODEL",
  "CURSOR_MODEL_FAST",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test("composer-2.5 requests standard variant (not Fast)", () => {
  delete process.env.CURSOR_MODEL;
  delete process.env.CURSOR_MODEL_FAST;
  expect(resolveCursorModel()).toEqual({
    id: "composer-2.5",
    params: [{ id: "fast", value: "false" }],
  });
});

test("CURSOR_MODEL_FAST=true skips fast=false param", () => {
  delete process.env.CURSOR_MODEL;
  process.env.CURSOR_MODEL_FAST = "true";
  expect(resolveCursorModel()).toEqual({ id: "composer-2.5" });
});

test("cloud verification run does not auto-create a PR", () => {
  process.env.CURSOR_API_KEY = "cursor_test";
  process.env.CURSOR_RUNTIME = "cloud";
  process.env.CURSOR_REPO_URL = "https://github.com/jpmadrigal07/jeichat";

  expect(cursorAgentOptions().cloud.autoCreatePR).toBe(false);
});

test("cloud binds a named Cursor environment when CURSOR_CLOUD_ENVIRONMENT is set", () => {
  process.env.CURSOR_API_KEY = "cursor_test";
  process.env.CURSOR_RUNTIME = "cloud";
  process.env.CURSOR_REPO_URL = "https://github.com/jpmadrigal07/jeichat";
  delete process.env.CURSOR_REPO_REF;
  process.env.CURSOR_CLOUD_ENVIRONMENT = "jpmadrigal07/jeichat";

  expect(cursorAgentOptions().cloud).toEqual({
    repos: [
      {
        url: "https://github.com/jpmadrigal07/jeichat",
        startingRef: "main",
      },
    ],
    autoCreatePR: false,
    skipReviewerRequest: true,
    env: { type: "cloud", name: "jpmadrigal07/jeichat" },
  });
});
