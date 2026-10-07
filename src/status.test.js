import { expect, test } from "bun:test";
import { formatElapsed, formatReviewStatus } from "./status.js";

test("formatElapsed shows minutes", () => {
  expect(formatElapsed(0, 5 * 60 * 1000)).toBe("5m");
});

test("formatReviewStatus includes elapsed and agent link", () => {
  const text = formatReviewStatus({
    run: {
      startedAt: Date.now() - 10 * 60 * 1000,
      agentId: "bc-test",
      branch: "feat/x",
    },
    now: Date.now(),
  });
  expect(text).toContain("10m");
  expect(text).toContain("cursor.com/agents/bc-test");
  expect(text).toContain("feat/x");
});
