import { once } from "node:events";
import { createServer } from "node:net";
import { parseArgs, promisify } from "node:util";

export const devOptions = (args, env = process.env) => {
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

  if (!/^\d+$/u.test(rawPort) || Number(rawPort) > 65_535) {
    throw new Error(`Invalid development port: ${rawPort}. Use 0–65535.`);
  }

  const portIndexes = new Set();

  for (const token of tokens) {
    if (token.kind === "option" && token.name === "port") {
      portIndexes.add(token.index);

      if (!token.inlineValue) {
        portIndexes.add(token.index + 1);
      }
    }
  }

  return {
    args: args.filter((_, index) => !portIndexes.has(index)),
    hostname: values.hostname ?? "0.0.0.0",
    port: Number(rawPort),
  };
};

const probePort = async (port, host) => {
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
    await promisify(server.close.bind(server))();

    if (!address || !Object.hasOwn(address, "port")) {
      throw new Error("Could not determine the development port.");
    }

    return address.port;
  } finally {
    controller.abort();
  }
};

const probeHosts = async (port, hosts) => {
  const [host, ...remaining] = hosts;

  if (host === undefined) {
    return port;
  }

  const selected = await probePort(port, host);

  return probeHosts(selected, remaining);
};

export const findAvailablePort = (preferredPort, hostname = "0.0.0.0") => {
  const hosts = hostname === "0.0.0.0" ? [hostname, "127.0.0.1"] : [hostname];

  const findPort = async (port) => {
    if (port > 65_535) {
      throw new Error(
        `No available development port from ${preferredPort} to 65535.`
      );
    }

    try {
      return await probeHosts(port, hosts);
    } catch (error) {
      if (error.code !== "EADDRINUSE") {
        throw error;
      }

      return findPort(port === 0 ? 0 : port + 1);
    }
  };

  return findPort(preferredPort);
};
