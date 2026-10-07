export function cursorAgentOptions(overrides = {}) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY is missing. Create one at https://cursor.com/dashboard/integrations",
    );
  }

  const model = { id: process.env.CURSOR_MODEL?.trim() || "composer-2.5" };
  const repoUrl =
    overrides.repoUrl?.trim() || process.env.CURSOR_REPO_URL?.trim();
  const startingRef =
    overrides.startingRef?.trim() ||
    process.env.CURSOR_REPO_REF?.trim() ||
    "main";
  const runtime =
    process.env.CURSOR_RUNTIME?.trim() || (repoUrl ? "cloud" : "local");

  if (runtime === "cloud") {
    if (!repoUrl) {
      throw new Error(
        "CURSOR_REPO_URL is required when CURSOR_RUNTIME=cloud (or pass repoUrl per ticket)",
      );
    }
    const cloudEnvName = process.env.CURSOR_CLOUD_ENVIRONMENT?.trim();
    const cloud = {
      repos: [
        {
          url: repoUrl,
          startingRef,
        },
      ],
      autoCreatePR: false,
      skipReviewerRequest: true,
    };
    if (cloudEnvName) {
      cloud.env = { type: "cloud", name: cloudEnvName };
    }
    return {
      apiKey,
      model,
      cloud,
    };
  }

  const cwd = process.env.CURSOR_REPO_PATH?.trim();
  if (!cwd) {
    throw new Error("CURSOR_REPO_PATH is required when CURSOR_RUNTIME=local");
  }
  return {
    apiKey,
    model,
    local: { cwd },
  };
}
