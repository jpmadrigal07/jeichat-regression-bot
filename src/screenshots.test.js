import { afterEach, expect, test } from "bun:test";
import { maxVerificationScreenshots } from "./screenshots.js";

const key = "REVIEWER_MAX_SCREENSHOTS";
const previous = process.env[key];

afterEach(() => {
  if (previous === undefined) delete process.env[key];
  else process.env[key] = previous;
});

test("default max screenshots is 12", () => {
  delete process.env[key];
  expect(maxVerificationScreenshots()).toBe(12);
});

test("REVIEWER_MAX_SCREENSHOTS is capped at 30", () => {
  process.env[key] = "99";
  expect(maxVerificationScreenshots()).toBe(30);
});
