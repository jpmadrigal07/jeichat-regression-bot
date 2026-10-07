import { expect, test } from "bun:test";
import {
  parseGithubPullRequestUrl,
  parseGithubRepoUrl,
  pullHeadGitRef,
} from "./github-pr.js";

test("parses GitHub pull request URLs", () => {
  expect(
    parseGithubPullRequestUrl("https://github.com/jpmadrigal07/jeichat/pull/22"),
  ).toEqual({
    owner: "jpmadrigal07",
    repo: "jeichat",
    number: 22,
  });
});

test("builds pull head ref", () => {
  expect(pullHeadGitRef(23)).toBe("refs/pull/23/head");
});

test("parses GitHub repo URLs", () => {
  expect(parseGithubRepoUrl("https://github.com/jpmadrigal07/jeichat")).toEqual({
    owner: "jpmadrigal07",
    repo: "jeichat",
  });
});
