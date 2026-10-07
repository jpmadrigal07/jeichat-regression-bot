export function parseCheckVerdict(text) {
  const plain = String(text ?? "").replace(/\*/g, "");
  if (/\bverdict\s*:\s*refute\b/i.test(plain)) return "REFUTE";
  if (/\bverdict\s*:\s*confirm\b/i.test(plain)) return "CONFIRM";
  return null;
}

/**
 * `messages` must be newest-first.
 */
export function latestCheckVerdict(messages, options = {}) {
  const checkerUserId = options.checkerUserId?.trim() || "";
  const fixerUserId = options.fixerUserId?.trim() || "";

  for (const row of messages) {
    if (!row?.sender?.isBot) continue;
    if (fixerUserId && row.senderId === fixerUserId) continue;
    if (checkerUserId && row.senderId !== checkerUserId) continue;
    const verdict = parseCheckVerdict(row.content);
    if (verdict) return { verdict, message: row };
  }
  return null;
}

export function checkReportFromMessage(message) {
  const attachments = Array.isArray(message?.attachments)
    ? message.attachments
    : [];
  const screenshotNames = attachments
    .map((file) => file?.filename)
    .filter(Boolean);
  return {
    content: String(message?.content ?? "").trim(),
    screenshotNames,
  };
}
