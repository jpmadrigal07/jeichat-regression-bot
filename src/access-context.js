import { isBotMentioned, stripBotMentions } from "./mention.js";

const CREDS_LINE =
  /^(?:test\s+credentials|credentials|login|auth)\s*[:\-]\s*(.+)$/im;

const AUTH_NOTE =
  /\b(needs?|requires?|must)\s+(?:an?\s+)?(account|login|sign[- ]?in|authentication)\b/i;

const COMMAND_ONLY = /^(?:bot\s+)?(?:help|status|retry|go|start)\.?$/i;

/**
 * @param {string | null | undefined} description
 */
export function parseTestCredentialsFromDescription(description) {
  const match = String(description ?? "").match(CREDS_LINE);
  const value = match?.[1]?.trim();
  return value || null;
}

export function messageLooksLikeAuthNote(text) {
  const plain = String(text ?? "");
  return (
    AUTH_NOTE.test(plain) ||
    /\b(login required|auth required|must be logged in|signed in)\b/i.test(plain)
  );
}

function isReviewerCommandBody(body) {
  const trimmed = String(body ?? "").trim();
  if (!trimmed) return true;
  return COMMAND_ONLY.test(trimmed);
}

/**
 * Human notes for the Cursor reviewer (description + thread).
 * @param {{ description?: string; messageRows?: Array<{ content?: string; sender?: { isBot?: boolean }; senderId?: string }> }} ticket
 * @param {{ botName?: string; botUserId?: string }} options
 */
export function collectAccessContext(ticket, options = {}) {
  const botName = options.botName ?? "";
  const botUserId = options.botUserId ?? "";
  const lines = [];

  const creds = parseTestCredentialsFromDescription(ticket.description);
  if (creds) {
    lines.push(
      `- Ticket description includes test credentials (use for browser login when needed): \`${creds}\``,
    );
  }

  const humanNotes = [];
  const rows = Array.isArray(ticket.messageRows) ? ticket.messageRows : [];
  for (const row of rows) {
    if (row?.sender?.isBot || row?.senderId === botUserId) continue;
    const text = String(row.content ?? "").trim();
    if (!text) continue;

    let note = null;
    if (botName && isBotMentioned(text, botName)) {
      const body = stripBotMentions(text, botName).trim();
      if (body && !isReviewerCommandBody(body)) note = body;
    } else if (messageLooksLikeAuthNote(text)) {
      note = text;
    }
    if (note) humanNotes.push(note);
  }

  const recent = humanNotes.slice(0, 5).reverse();
  for (const note of recent) {
    lines.push(`- Thread note: ${note}`);
  }

  if (lines.length === 0) return null;
  return lines.join("\n");
}

export function formatAccessNoteAck(noteText, botName) {
  const tag = `@${String(botName ?? "Review Bot").trim() || "Review Bot"}`;
  const quoted = String(noteText ?? "").trim() || "login may be required";
  return [
    `Noted: **${quoted}**`,
    "",
    "On the next review I will treat this as **login / account required** when checking the UI.",
    "",
    "Also do one of the following so the cloud agent can sign in:",
    "- Add `Test credentials: email / password` to the **ticket description**, or",
    "- Set **REVIEWER_TEST_EMAIL** and **REVIEWER_TEST_PASSWORD** in your **Cursor cloud environment** (`CURSOR_CLOUD_ENVIRONMENT`).",
    "",
    `Then \`${tag} retry\` (ticket must be **In review**).`,
  ].join("\n");
}
