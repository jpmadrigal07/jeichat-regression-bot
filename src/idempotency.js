import { parsePrUrl } from "./fix-context.js";

const RESULT_LINE = /\bresult\s*:\s*(pass|fail)\b/i;

export function isRetryComment(text) {
  const plain = String(text ?? "")
    .replace(/\*/g, "")
    .trim();
  if (/^(please\s+)?retry\.?$/i.test(plain)) return true;
  return /@[\s\S]+?\s+(please\s+)?retry\.?$/i.test(plain);
}

function reviewResultIn(text) {
  const plain = String(text ?? "").replace(/\*/g, "");
  const match = plain.match(RESULT_LINE);
  if (!match?.[1]) return null;
  return match[1].toUpperCase();
}

/**
 * `messages` newest-first. Skip if this reviewer already posted PASS/FAIL for the PR,
 * unless a human posted `retry` after that review.
 */
export function alreadyReviewedPr(messages, reviewerUserId, prUrl) {
  const reviewer = String(reviewerUserId ?? "").trim();
  const targetPr = String(prUrl ?? "").trim();
  if (!reviewer || !targetPr) return null;

  let sawRetry = false;

  for (const row of Array.isArray(messages) ? messages : []) {
    if (reviewer && row?.senderId === reviewer) {
      const result = reviewResultIn(row.content);
      const rowPr = parsePrUrl(row.content) ?? targetPr;
      if (result && rowPr === targetPr) {
        return sawRetry ? null : { result, message: row };
      }
      continue;
    }
    if (isRetryComment(row?.content)) sawRetry = true;
  }

  return null;
}

export function alreadyReviewedMessage(existing) {
  const tag = "Tag me with `@Review Bot retry` to run again.";
  return `Already reviewed ${existing?.message ? "this PR" : "this ticket"} (Result: ${existing?.result ?? "PASS/FAIL"}). ${tag}`;
}
