import { expect, test } from "bun:test";
import {
  latestFixGitContext,
  mergeGitContextFromMessages,
  parseBranchName,
  parsePrUrl,
} from "./fix-context.js";

test("parses PR and Branch lines", () => {
  const text = "Fixed it.\n\nPR: https://github.com/o/r/pull/12\nBranch: fix/gen-1";
  expect(parsePrUrl(text)).toBe("https://github.com/o/r/pull/12");
  expect(parseBranchName(text)).toBe("fix/gen-1");
});

test("parses code-bot Branch backticks", () => {
  expect(
    parseBranchName("Branch `GEN-19-code-bot-test-123`"),
  ).toBe("GEN-19-code-bot-test-123");
});

test("merges PR and branch from different messages", () => {
  const messages = [
    { content: "PR: https://github.com/o/r/pull/3" },
    { content: "Branch `feat/gen-3`" },
  ];
  const ctx = mergeGitContextFromMessages(messages);
  expect(ctx?.prUrl).toContain("/pull/3");
  expect(ctx?.branch).toBe("feat/gen-3");
});

test("prefers fixer bot message", () => {
  const messages = [
    {
      senderId: "other",
      content: "PR: https://github.com/o/r/pull/1\nBranch: wrong",
    },
    {
      senderId: "fixer",
      content: "PR: https://github.com/o/r/pull/2\nBranch: fix/gen-2",
    },
  ];
  const ctx = latestFixGitContext(messages, "fixer");
  expect(ctx?.branch).toBe("fix/gen-2");
  expect(ctx?.prUrl).toBe("https://github.com/o/r/pull/2");
});
