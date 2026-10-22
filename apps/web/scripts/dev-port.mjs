import { createServer } from "node:net";
import { parseArgs } from "node:util";

export function devOptions(args, env = process.env) {
  const { values, tokens } = parseArgs({
    args,
    options: {
      port: { type: "string", short: "p" },
      hostname: { type: "string", short: "H" },
    },
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  const rawPort = values.port ?? env.PORT ?? "3000";
  if (!/^\d+$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new Error(`Invalid development port: ${rawPort}. Use 0–65535.`);
  }
  const portIndexes = new Set();
  for (const token of tokens) {
    if (token.kind === "option" && token.name === "port") {
      portIndexes.add(token.index);
      if (!token.inlineValue) portIndexes.add(token.index + 1);
    }
  }
  return {
    port: Number(rawPort),
    hostname: values.hostname ?? "0.0.0.0",
    args: args.filter((_, index) => !portIndexes.has(index)),
  };
}

export async function findAvailablePort(preferredPort, hostname = "0.0.0.0") {
  let port = preferredPort;
  while (port <= 65535) {
    try {
      const hosts =
        hostname === "0.0.0.0" ? [hostname, "127.0.0.1"] : [hostname];
      let selectedPort = port;
      for (const host of hosts) {
        selectedPort = await new Promise((resolve, reject) => {
          const server = createServer();
          server.once("error", reject);
          server.listen({ port: selectedPort, host }, () => {
            const address = server.address();
            server.close((error) => {
              if (error) reject(error);
              else if (address && typeof address === "object")
                resolve(address.port);
              else
                reject(new Error("Could not determine the development port."));
            });
          });
        });
      }
      return selectedPort;
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
      if (port !== 0) port += 1;
    }
  }
  throw new Error(
    `No available development port from ${preferredPort} to 65535.`,
  );
}
