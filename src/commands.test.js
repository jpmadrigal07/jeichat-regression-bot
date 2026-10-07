import { expect, test } from "bun:test";
import { parseReviewerCommand } from "./commands.js";

test("parses status after optional bot word", () => {
  expect(parseReviewerCommand("bot status").name).toBe("status");
  expect(parseReviewerCommand("status").name).toBe("status");
});

test("free text becomes a note for access hints", () => {
  expect(parseReviewerCommand("this needs an account to access").name).toBe(
    "note",
  );
});
