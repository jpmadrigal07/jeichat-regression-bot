export function createRunTracker() {
  const runs = new Map();

  return {
    start(ticketId, info = {}) {
      const id = String(ticketId ?? "").trim();
      if (!id) return;
      runs.set(id, { startedAt: Date.now(), ...info });
    },
    update(ticketId, patch) {
      const id = String(ticketId ?? "").trim();
      const current = runs.get(id);
      if (!current) return;
      runs.set(id, { ...current, ...patch });
    },
    get(ticketId) {
      return runs.get(String(ticketId ?? "").trim()) ?? null;
    },
    end(ticketId) {
      runs.delete(String(ticketId ?? "").trim());
    },
  };
}

export function cursorAgentUrl(agentId) {
  const id = String(agentId ?? "").trim();
  if (!id) return null;
  return `https://cursor.com/agents/${id}`;
}

export function formatElapsed(startedAt, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function reviewRunTimeoutMs() {
  const raw = process.env.REVIEWER_RUN_TIMEOUT_MS?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 20 * 60 * 1000;
}

export function formatReviewStatus({ run, busy, queued, now = Date.now() } = {}) {
  if (run?.startedAt) {
    const elapsed = formatElapsed(run.startedAt, now);
    const lines = [
      `Cursor review in progress (running for **${elapsed}**). Cloud runs often take **10–25 minutes** when tests, \`bun run dev\`, and browser checks are included.`,
    ];
    const url = cursorAgentUrl(run.agentId);
    if (url) lines.push(`Track progress: ${url}`);
    if (run.branch) lines.push(`Branch: \`${run.branch}\``);
    return lines.join("\n");
  }
  if (busy) {
    return "Starting a Cursor review (cloning repo and creating agent)…";
  }
  if (queued) {
    return "Review queued — waiting ~15s for the PR message to land in the thread.";
  }
  return "No Cursor review in progress on this ticket.";
}
