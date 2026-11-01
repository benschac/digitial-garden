export const shouldSkipStackCI = async (github, context, core) => {
  const pull = context.payload.pull_request;
  const repository = `${context.repo.owner}/${context.repo.repo}`;

  if (
    context.eventName !== "pull_request" ||
    pull?.state !== "open" ||
    pull.head?.repo?.full_name !== repository ||
    !pull.head.ref
  ) {
    return false;
  }

  try {
    const pulls = await github.paginate(github.rest.pulls.list, {
      ...context.repo,
      base: pull.head.ref,
      per_page: 100,
      request: { timeout: 30_000 },
      state: "open",
    });

    return pulls.some(
      (candidate) =>
        candidate.number !== pull.number &&
        candidate.state === "open" &&
        candidate.base?.ref === pull.head.ref &&
        candidate.base?.repo?.full_name === repository &&
        candidate.head?.repo?.full_name === repository
    );
  } catch {
    core.warning("Stack lookup failed; running verification.");

    return false;
  }
};
