function parseRepoMap() {
  const raw = process.env.CURSOR_REPO_MAP?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore invalid JSON
  }
  return {};
}

function repoUrlFromOwnerRepo(owner, repo) {
  const o = String(owner ?? "").trim();
  const r = String(repo ?? "").trim();
  if (!o || !r) return null;
  return `https://github.com/${o}/${r}`;
}

function assertAllowedRepo(repoUrl) {
  const allowed = process.env.CURSOR_ALLOWED_REPOS?.trim();
  if (!allowed) return repoUrl;
  const list = allowed
    .split(",")
    .map((part) => part.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const normalized = String(repoUrl ?? "").trim().replace(/\/$/, "");
  if (!list.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
    throw new Error(
      `Repo ${repoUrl} is not in CURSOR_ALLOWED_REPOS. Ask an admin to allow it or update the board link.`,
    );
  }
  return repoUrl;
}

/**
 * @param {import("./client.js").JeiChat} client
 * @param {string} workspaceId
 * @param {string} boardChannelId
 */
export async function resolveRepoUrl(client, workspaceId, boardChannelId) {
  const map = parseRepoMap();
  const mapped = map[boardChannelId]?.trim();
  if (mapped) {
    return assertAllowedRepo(mapped);
  }

  try {
    const link = await client.get(
      `/integrations/github/workspaces/${workspaceId}/channels/${boardChannelId}/link`,
    );
    if (link?.owner && link?.repo) {
      const url = repoUrlFromOwnerRepo(link.owner, link.repo);
      if (url) return assertAllowedRepo(url);
    }
  } catch (error) {
    console.error("could not load board GitHub link", error);
  }

  const fallback = process.env.CURSOR_REPO_URL?.trim();
  if (fallback) return assertAllowedRepo(fallback);

  throw new Error(
    "No GitHub repo for this ticket board. Connect the board in JeiChat (Settings → GitHub) or set CURSOR_REPO_URL / CURSOR_REPO_MAP.",
  );
}
