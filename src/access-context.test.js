import { expect, test } from "bun:test";
import {
  collectAccessContext,
  messageLooksLikeAuthNote,
  parseTestCredentialsFromDescription,
} from "./access-context.js";

test("parses test credentials from description", () => {
  expect(
    parseTestCredentialsFromDescription(
      "Test credentials: qa@example.com / secret\nBranch: develop",
    ),
  ).toBe("qa@example.com / secret");
});

test("detects auth notes in chat", () => {
  expect(messageLooksLikeAuthNote("this needs an account to access")).toBe(true);
});

test("collects mention note for reviewer", () => {
  const ctx = collectAccessContext(
    {
      description: "",
      messageRows: [
        {
          content: "@Echo this needs an account to access",
          sender: { isBot: false },
        },
      ],
    },
    { botName: "Echo" },
  );
  expect(ctx).toContain("needs an account");
});
