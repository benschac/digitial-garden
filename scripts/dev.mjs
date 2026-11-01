import { constants } from "node:os";

import { execa, ExecaError } from "execa";

const getExitCode = (error) => {
  if (!(error instanceof ExecaError)) {
    return 1;
  }

  if (error.exitCode !== undefined) {
    return error.exitCode;
  }

  if (error.signal !== undefined) {
    return 128 + constants.signals[error.signal];
  }

  if (error.code === "EACCES") {
    return 126;
  }

  return error.code === "ENOENT" ? 127 : 1;
};

const runDevelopmentSession = async (args) => {
  const stdio = [
    "inherit",
    "inherit",
    "inherit",
    ...Array.from({ length: 6 }, () => "ignore"),
    9,
  ];

  const command = execa({
    forceKillAfterDelay: false,
    killDescendants: true,
    preferLocal: true,
    stdio,
  });

  const controller = new AbortController();
  const cancellation = { cancelSignal: controller.signal };
  const city = ["--city", ".tools/gascity"];
  let ownedCity = false;
  let exitCode = 0;
  let interruptedExitCode = 0;

  const interrupt = (code) => {
    interruptedExitCode ||= code;
    controller.abort();
  };

  const onInterrupt = () => interrupt(130);
  const onTerminate = () => interrupt(143);
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onTerminate);

  try {
    const { stdout } = await command("gc", [...city, "status", "--json"], {
      ...cancellation,
      stdio: stdio.with(1, "pipe"),
    });

    const running = JSON.parse(stdout)?.controller?.running;

    if (running !== true && running !== false) {
      throw new TypeError("Missing Gas City controller state.");
    }

    if (!running) {
      ownedCity = true;
      await command("gc", [...city, "start"], cancellation);
    }

    await command(
      "turbo",
      ["run", "dev", "--ui=stream", ...args],
      cancellation
    );
  } catch (error) {
    exitCode = getExitCode(error);

    if (!(error instanceof ExecaError && error.isCanceled)) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  } finally {
    if (ownedCity) {
      try {
        await command("gc", [...city, "stop"]);
      } catch (error) {
        process.stderr.write(
          `${error instanceof Error ? error.message : String(error)}\n`
        );
        exitCode ||= 1;
      }
    }

    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
  }

  return interruptedExitCode || exitCode;
};

process.exitCode = await runDevelopmentSession(process.argv.slice(2));
