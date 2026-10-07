import { afterEach, expect, test } from "bun:test";
import { cursorAgentOptions } from "./cursor.js";

const keys = [
  "CURSOR_API_KEY",
  "CURSOR_RUNTIME",
  "CURSOR_REPO_URL",
  "CURSOR_REPO_REF",
  "CURSOR_REPO_PATH",
  "CURSOR_CLOUD_ENVIRONMENT",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
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
