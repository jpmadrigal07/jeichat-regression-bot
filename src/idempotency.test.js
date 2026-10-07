import { expect, test } from "bun:test";
import { alreadyReviewedPr } from "./idempotency.js";

test("skips when reviewer already posted Result: PASS for same PR", () => {
  const messages = [
    {
      senderId: "reviewer",
      content:
        "**Changes**\n- foo\n\nResult: PASS\n\nPR: https://github.com/o/r/pull/9",
    },
    {
      senderId: "fixer",
      content: "PR: https://github.com/o/r/pull/9\nBranch: fix/x",
    },
  ];
  expect(
    alreadyReviewedPr(
      messages,
      "reviewer",
      "https://github.com/o/r/pull/9",
    ),
  ).toEqual({ result: "PASS", message: messages[0] });
});

test("retry after review clears skip", () => {
  const messages = [
    { senderId: "human", content: "@Review Bot retry" },
    {
      senderId: "reviewer",
      content: "Result: FAIL\n\nPR: https://github.com/o/r/pull/9",
    },
    {
      senderId: "fixer",
      content: "PR: https://github.com/o/r/pull/9\nBranch: fix/x",
    },
  ];
  expect(
    alreadyReviewedPr(
      messages,
      "reviewer",
      "https://github.com/o/r/pull/9",
    ),
  ).toBeNull();
});
