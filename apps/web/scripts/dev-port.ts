import { once } from "node:events";
import { createServer } from "node:net";
import { parseArgs } from "node:util";

import { Predicate, Schema } from "effect";

export const devOptions = (
  args: string[],
  env: NodeJS.ProcessEnv = process.env
) => {
  const { values, tokens } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      hostname: { short: "H", type: "string" },
      port: { short: "p", type: "string" },
    },
    strict: false,
    tokens: true,
  });

  const rawPort = values.port ?? env.PORT ?? "3000";

  if (
    !Predicate.isString(rawPort) ||
    !/^\d+$/u.test(rawPort) ||
    Number(rawPort) > 65_535
  ) {
    throw new Error(`Invalid development port: ${rawPort}. Use 0–65535.`);
  }

  const portIndexes = new Set<number>();

  for (const token of tokens) {
    if (token.kind === "option" && token.name === "port") {
      portIndexes.add(token.index);

      if (token.inlineValue !== true) {
        portIndexes.add(token.index + 1);
      }
    }
  }

  return {
    args: args.filter((_, index) => !portIndexes.has(index)),
    hostname: Schema.decodeUnknownSync(Schema.String)(
      values.hostname ?? "0.0.0.0"
    ),
    port: Number(rawPort),
  };
};

const probePort = async (port: number, host: string) => {
  const server = createServer();
  const controller = new AbortController();

  try {
    const listening = once(server, "listening", { signal: controller.signal });

    try {
      server.listen({ host, port });
    } catch (error) {
      controller.abort();
      await listening.catch(() => false);
      throw error;
    }

    await listening;
    const address = server.address();
    await server[Symbol.asyncDispose]();

    if (address === null || Predicate.isString(address)) {
      throw new Error("Could not determine the development port.");
    }

    return address.port;
  } finally {
    controller.abort();
  }
};

const probeHosts = async (port: number, hosts: string[]): Promise<number> => {
  const [host, ...remaining] = hosts;

  if (host === undefined) {
    return port;
  }

  const selected = await probePort(port, host);

  return await probeHosts(selected, remaining);
};

export const findAvailablePort = async (
  preferredPort: number,
  hostname = "0.0.0.0"
) => {
  const hosts = hostname === "0.0.0.0" ? [hostname, "127.0.0.1"] : [hostname];

  const findPort = async (port: number): Promise<number> => {
    if (port > 65_535) {
      throw new Error(
        `No available development port from ${preferredPort} to 65535.`
      );
    }

    try {
      return await probeHosts(port, hosts);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EADDRINUSE"
      ) {
        throw error;
      }

      return await findPort(port === 0 ? 0 : port + 1);
    }
  };

  return await findPort(preferredPort);
};
