export function helpText(botName) {
  const tag = `@${String(botName ?? "Review Bot").trim() || "Review Bot"}`;
  return [
    "Move the ticket to **In review** (or assign me on an In review ticket) after the fixer posts `PR:` / `Branch:`. I reproduce the checker report and spot-check related flows from the diff.",
    `\`${tag} retry\` — run verification again`,
    `\`${tag} status\` — am I busy on this ticket?`,
    `\`${tag} needs an account to access\` — note login required (then retry)`,
    `\`${tag} help\` — this list`,
  ].join("\n");
}

const COMMAND_WORDS = new Set(["help", "retry", "status", "go", "start"]);

export function parseReviewerCommand(text) {
  let trimmed = String(text ?? "").trim();
  if (!trimmed) return { name: "help" };

  // "@Echo bot status" → "bot status"
  trimmed = trimmed.replace(/^bot\s+/i, "");

  const tokens = trimmed.split(/\s+/).map((part) =>
    part.toLowerCase().replace(/[.,!?]+$/g, ""),
  );

  for (const name of tokens) {
    if (name === "help") return { name: "help" };
    if (name === "retry") return { name: "retry" };
    if (name === "status") return { name: "status" };
    if (name === "go" || name === "start") return { name: "retry" };
  }

  const head = tokens[0];
  if (head && COMMAND_WORDS.has(head)) return { name: head };

  if (trimmed) return { name: "note", text: trimmed };
  return { name: "unknown", raw: trimmed };
}
