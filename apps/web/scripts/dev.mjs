import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { devOptions, findAvailablePort } from "./dev-port.mjs";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

try {
  let nextArgs = args;

  if (!args.includes("--help") && !args.includes("-h")) {
    const options = devOptions(args);
    const port = await findAvailablePort(options.port, options.hostname);

    if (options.port !== 0 && port !== options.port) {
      console.log(
        `Port ${options.port} is in use; using port ${port} instead.`
      );
    }

    nextArgs = [
      "--port",
      String(port),
      "--hostname",
      options.hostname,
      ...options.args,
    ];
  }

  const child = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", ...nextArgs],
    { stdio: "inherit" }
  );

  const interrupt = () => child.kill("SIGINT");
  const terminate = () => child.kill("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  child.once("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.once("close", (code, signal) => {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
