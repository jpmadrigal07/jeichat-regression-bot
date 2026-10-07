import { afterEach, expect, test } from "bun:test";
import { verifyDevStack } from "./verify-stack.js";

const keys = [
  "VERIFY_APP_WEB_ORIGIN",
  "VERIFY_APP_API_ORIGIN",
  "JEICHAT_WEB_ORIGIN",
  "JEICHAT_API_URL",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test("verifyDevStack uses VERIFY_APP_* over JEICHAT_*", () => {
  process.env.VERIFY_APP_WEB_ORIGIN = "http://app:4000";
  process.env.VERIFY_APP_API_ORIGIN = "http://api:4001";
  process.env.JEICHAT_WEB_ORIGIN = "http://localhost:3000";
  process.env.JEICHAT_API_URL = "http://localhost:3001";
  const stack = verifyDevStack();
  expect(stack.web).toBe("http://app:4000");
  expect(stack.healthUrl).toBe("http://api:4001/health");
});
