import { expect, test } from "bun:test";
import {
  isStatusInReview,
  shouldStartReviewFromEvent,
} from "./events.js";

test("status in_review triggers review", () => {
  expect(
    isStatusInReview({
      type: "status_changed",
      toValue: "in_review",
    }),
  ).toBe(true);
  expect(
    shouldStartReviewFromEvent(
      { type: "status_changed", toValue: "in_review" },
      "bot",
    ),
  ).toBe(true);
});

test("assignee to bot triggers when wired", () => {
  expect(
    shouldStartReviewFromEvent(
      {
        type: "assignee_changed",
        toValue: { id: "bot-1", name: "Review Bot" },
      },
      "bot-1",
    ),
  ).toBe(true);
});
