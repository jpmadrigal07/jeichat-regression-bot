import { latestFixGitContext, mergeGitContextFromMessages } from "./fix-context.js";

export function parseBranchFromSpec(description) {
  const text = String(description ?? "");
  const match = text.match(/^##\s*Branch\s*\r?\n([^\r\n#]+)/im);
  const branch = match?.[1]?.trim();
  return branch || null;
}

/** Same pattern as jeichat-code-bot `suggestedTicketBranchName`. */
export function suggestedBranchForTicket(ticket) {
  const prefix = String(ticket?.ticketPrefix ?? ticket?.ticketKey ?? "")
    .trim()
    .toUpperCase();
  const number = Number(ticket?.ticketNumber);
  const slug =
    String(ticket?.name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "work";
  if (prefix && Number.isInteger(number) && number > 0) {
    return `${prefix}-${number}-${slug}`;
  }
  return null;
}

/**
 * Channel events are oldest-first; take the latest GitHub PR link.
 */
export function latestGithubPullRequestEvent(events) {
  const rows = Array.isArray(events) ? events : [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row?.type !== "github_pull_request") continue;
    const to = row.toValue;
    if (!to || typeof to !== "object") continue;
    const htmlUrl =
      typeof to.htmlUrl === "string"
        ? to.htmlUrl
        : typeof to.html_url === "string"
          ? to.html_url
          : null;
    if (!htmlUrl) continue;
    return {
      prUrl: htmlUrl,
      prNumber: to.number ?? null,
      state: to.state ?? null,
    };
  }
  return null;
}

/**
 * @param {import("./client.js").JeiChat} client
 * @param {object} ticket
 * @param {string | undefined} fixerUserId
 */
export async function resolveTicketGitContext(client, ticket, fixerUserId) {
  const fromMessages =
    latestFixGitContext(ticket.messageRows, fixerUserId) ??
    mergeGitContextFromMessages(ticket.messageRows);

  let prFromEvents = null;
  try {
    const events = await client.get(
      `/workspaces/${ticket.workspaceId}/channels/${ticket.id}/events`,
    );
    prFromEvents = latestGithubPullRequestEvent(events);
  } catch (error) {
    console.error("could not load ticket GitHub events", error);
  }

  const prUrl = fromMessages?.prUrl ?? prFromEvents?.prUrl ?? null;
  const prNumber = prFromEvents?.prNumber ?? null;

  const branchHint =
    fromMessages?.branch ||
    parseBranchFromSpec(ticket.description) ||
    suggestedBranchForTicket(ticket) ||
    null;

  if (!prUrl && !branchHint) return null;

  return {
    prUrl,
    prNumber,
    branch: branchHint,
  };
}
