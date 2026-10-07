import { expect, test } from "bun:test";
import {
  latestGithubPullRequestEvent,
  parseBranchFromSpec,
  suggestedBranchForTicket,
} from "./ticket-git-context.js";

test("parses ## Branch from ticket spec", () => {
  expect(
    parseBranchFromSpec("## Branch\nJCDEV-51-ticket-linking\n\n## Goal"),
  ).toBe("JCDEV-51-ticket-linking");
});

test("suggests branch from ticket key and title", () => {
  expect(
    suggestedBranchForTicket({
      ticketPrefix: "JCDEV",
      ticketNumber: 51,
      name: "ticket linking",
    }),
  ).toBe("JCDEV-51-ticket-linking");
});

test("reads latest github_pull_request channel event", () => {
  const events = [
    {
      type: "github_pull_request",
      toValue: {
        number: 22,
        htmlUrl: "https://github.com/o/r/pull/22",
        state: "open",
      },
    },
    {
      type: "github_pull_request",
      toValue: {
        number: 23,
        htmlUrl: "https://github.com/o/r/pull/23",
        state: "open",
      },
    },
  ];
  expect(latestGithubPullRequestEvent(events)?.prUrl).toBe(
    "https://github.com/o/r/pull/23",
  );
});
