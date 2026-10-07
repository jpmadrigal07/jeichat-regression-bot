import { JeiChat } from "./client.js";
import { sendMessageWithAttachments } from "./attachments.js";
import { helpText, parseReviewerCommand } from "./commands.js";
import { createReviewDebouncer } from "./debounce.js";
import {
  shouldStartReviewFromEvent,
  ticketIdFromEvent,
} from "./events.js";
import { resolveTicketGitContext } from "./ticket-git-context.js";
import {
  alreadyReviewedMessage,
  alreadyReviewedPr,
} from "./idempotency.js";
import { isBotMentioned, stripBotMentions } from "./mention.js";
import { resolveRepoUrl } from "./repo.js";
import { formatTicketDisplayId, ticketPageUrl } from "./ticket-link.js";
import {
  downloadVerificationArtifacts,
  postVerificationScreenshotsEnabled,
} from "./verification-artifacts.js";
import { verifyTicket } from "./verify.js";
import { latestCheckVerdict, checkReportFromMessage } from "./check-report.js";
import { createRunTracker, cursorAgentUrl, formatReviewStatus } from "./status.js";
import {
  collectAccessContext,
  formatAccessNoteAck,
} from "./access-context.js";

const token = process.env.JEICHAT_BOT_TOKEN?.trim();
if (!token) {
  console.error("JEICHAT_BOT_TOKEN is required");
  process.exit(1);
}

const client = new JeiChat({
  apiUrl: process.env.JEICHAT_API_URL ?? "http://localhost:3001",
});

const reviewing = new Set();
const debouncer = createReviewDebouncer();
const runs = createRunTracker();

client.on("ready", () => {
  console.log(
    `Regression reviewer ready as ${client.user?.name} in workspace ${client.user?.workspaceId}`,
  );
  const fixerId = process.env.FIXER_BOT_USER_ID?.trim();
  console.log(
    fixerId
      ? `Using fixer bot userId ${fixerId} to find PR/Branch lines.`
      : "FIXER_BOT_USER_ID is unset — will use the latest PR/Branch in the thread.",
  );
  console.log(
    "When a ticket moves to In review, I will verify the checker repro, regression-check related areas from the diff, and post verification screenshots.",
  );
  void backfillInReviewTickets();
});

client.on("ticketUpdate", (event) => {
  const botUserId = client.user?.userId;
  if (!botUserId) return;
  if (!shouldStartReviewFromEvent(event, botUserId)) return;

  const ticketId = ticketIdFromEvent(event);
  debouncer.schedule(ticketId, () => {
    void maybeStartReview(ticketId);
  });
});

client.on("messageCreate", (message) => {
  void handleMention(message);
});

async function handleMention(message) {
  if (!message) return;
  const botUserId = client.user?.userId;
  if (message.sender?.isBot || message.senderId === botUserId) return;
  const botName = client.user?.name ?? "";
  if (!botName || !isBotMentioned(message.content, botName)) return;

  const args = stripBotMentions(message.content, botName);
  const command = parseReviewerCommand(args);
  const ticketId = message.channelId;

  if (command.name === "help") {
    await client.send(ticketId, helpText(botName));
    return;
  }
  if (command.name === "status") {
    await client.send(
      ticketId,
      formatReviewStatus({
        run: runs.get(ticketId),
        busy: reviewing.has(ticketId),
        queued: debouncer.has(ticketId),
      }),
    );
    return;
  }
  if (command.name === "retry") {
    void runReview(ticketId, { forceRetry: true });
    return;
  }
  if (command.name === "note") {
    await client.send(
      ticketId,
      formatAccessNoteAck(command.text, botName),
    );
    return;
  }
  if (command.name === "unknown") {
    await client.send(ticketId, helpText(botName));
  }
}

async function maybeStartReview(ticketId) {
  if (reviewing.has(ticketId)) return;
  try {
    const ticket = await loadTicket(ticketId);
    if (ticket.status !== "in_review") return;
    await runReview(ticketId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("maybeStartReview failed", error);
    await client.send(ticketId, `Review could not start: ${detail}`);
  }
}

async function runReview(ticketId, options = {}) {
  const forceRetry = Boolean(options.forceRetry);
  if (reviewing.has(ticketId)) {
    await client.send(
      ticketId,
      "I am already reviewing this ticket. I will skip this extra run.",
    );
    return;
  }

  reviewing.add(ticketId);
  debouncer.cancel(ticketId);
  let agentRef = null;
  try {
    const ticket = await loadTicket(ticketId);
    if (ticket.status !== "in_review") {
      if (forceRetry) {
        await client.send(
          ticketId,
          "This ticket is not **In review**. Move it to In review first.",
        );
      }
      return;
    }

    const git = await resolveTicketGitContext(
      client,
      ticket,
      process.env.FIXER_BOT_USER_ID,
    );
    if (!git?.branch && !git?.prUrl) {
      await client.send(
        ticketId,
        "Waiting for a linked **GitHub PR** on this ticket (GitHub panel), or a `PR:` / `Branch:` line in the thread from the fixer/code-bot.",
      );
      return;
    }

    if (!forceRetry && git.prUrl) {
      const done = alreadyReviewedPr(
        ticket.messageRows,
        client.user?.userId,
        git.prUrl,
      );
      if (done) {
        await client.send(ticketId, alreadyReviewedMessage(done));
        return;
      }
    }

    if (!ticket.parentId) {
      await client.send(ticketId, "This channel is not a ticket board child.");
      return;
    }

    ticket.repoUrl = await resolveRepoUrl(
      client,
      ticket.workspaceId,
      ticket.parentId,
    );
    ticket.pageUrl = ticketPageUrl(ticket);

    const check = latestCheckVerdict(ticket.messageRows, {
      checkerUserId: process.env.CHECKER_BOT_USER_ID,
      fixerUserId: process.env.FIXER_BOT_USER_ID,
    });
    if (check?.message) {
      ticket.checkReport = checkReportFromMessage(check.message).content;
    }

    ticket.accessContext = collectAccessContext(ticket, {
      botName: client.user?.name,
      botUserId: client.user?.userId,
    });

    const summary = await verifyTicket(ticket, git, {
      onAgent(agent) {
        agentRef = agent;
      },
      onRunStarted({ agentId }) {
        runs.start(ticketId, {
          agentId,
          branch: git.branch,
          prUrl: git.prUrl,
        });
        const url = cursorAgentUrl(agentId);
        void client.send(
          ticketId,
          [
            `In review — checking ${git.branch ? `\`${git.branch}\`` : "the PR"}${git.prUrl ? ` (${git.prUrl})` : ""}.`,
            url
              ? `Cursor agent: ${url} (cloud reviews often take **10–25 min**).`
              : "Cursor cloud review started (often **10–25 min**).",
            `Use \`@${client.user?.name ?? "Review Bot"} status\` for elapsed time.`,
          ].join("\n"),
        );
      },
    });

    if (
      postVerificationScreenshotsEnabled() &&
      agentRef &&
      typeof agentRef.listArtifacts === "function"
    ) {
      const files = await downloadVerificationArtifacts(agentRef);
      if (files.length > 0) {
        await sendMessageWithAttachments(
          client,
          ticketId,
          summary,
          files,
        );
        return;
      }
    }

    await client.send(ticketId, summary);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("review failed", error);
    await client.send(ticketId, `Review failed: ${detail}`);
  } finally {
    runs.end(ticketId);
    reviewing.delete(ticketId);
  }
}

async function loadTicket(ticketId) {
  const workspaceId = client.user.workspaceId;
  const ticket = await client.get(
    `/workspaces/${workspaceId}/channels/${ticketId}`,
  );

  let ticketPrefix = ticket.ticketKey ?? null;
  if (!ticketPrefix && ticket.parentId) {
    try {
      const parent = await client.get(
        `/workspaces/${workspaceId}/channels/${ticket.parentId}`,
      );
      ticketPrefix = parent.ticketKey ?? null;
    } catch (error) {
      console.error("could not load parent channel for ticket prefix", error);
    }
  }

  const page = await client.get(`/channels/${ticketId}/messages?limit=100`);
  const messageRows = page.data ?? [];

  return {
    id: ticket.id,
    workspaceId,
    parentId: ticket.parentId,
    status: ticket.status ?? "todo",
    ticketNumber: ticket.ticketNumber ?? null,
    ticketPrefix,
    displayId: formatTicketDisplayId({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketPrefix,
    }),
    name: ticket.name,
    description: ticket.description,
    messageRows,
  };
}

async function backfillInReviewTickets() {
  const workspaceId = client.user?.workspaceId;
  if (!workspaceId) return;

  try {
    const channels = await client.get(`/workspaces/${workspaceId}/channels`);
    const rows = Array.isArray(channels) ? channels : channels?.data ?? [];
    const inReview = rows.filter((row) => row?.status === "in_review");
    if (inReview.length > 0) {
      console.log(`Backfill: ${inReview.length} ticket(s) already In review.`);
    }
    for (const row of inReview) {
      debouncer.schedule(row.id, () => {
        void maybeStartReview(row.id);
      });
    }
  } catch (error) {
    console.error("in-review backfill failed", error);
  }
}

await client.login(token);
