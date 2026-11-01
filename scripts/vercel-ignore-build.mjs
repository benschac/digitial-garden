process.exitCode = 1;

const {
  VERCEL_ENV: environment,
  VERCEL_GIT_COMMIT_REF: branch,
  VERCEL_GIT_REPO_OWNER: owner,
  VERCEL_GIT_REPO_SLUG: repository,
} = process.env;

if (environment === "preview" && branch && owner && repository) {
  if (branch.startsWith("graphite-base/")) {
    process.exitCode = 0;
  } else {
    try {
      const url = new URL(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/pulls`
      );

      url.search = new URLSearchParams({
        base: branch,
        per_page: "100",
        state: "open",
      }).toString();

      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) {
        const pulls = await response.json();

        if (
          Array.isArray(pulls) &&
          pulls.some(
            (pull) =>
              pull?.state === "open" &&
              pull.base?.ref === branch &&
              pull.base?.repo?.full_name === `${owner}/${repository}` &&
              pull.head?.repo?.full_name === `${owner}/${repository}`
          )
        ) {
          process.exitCode = 0;
        }
      }
    } catch {
      process.stdout.write(
        "Stack lookup failed; continuing the preview build.\n"
      );
    }
  }
}
