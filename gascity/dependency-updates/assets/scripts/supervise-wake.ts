import { createHash, randomUUID } from "node:crypto";
import { open, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BunRuntime } from "@effect/platform-bun";
import { Cause, Config, DateTime, Effect, Runtime, Schema } from "effect";
import { execa, ExecaError } from "execa";

const metadataSchema = Schema.optional(
  Schema.Union([
    Schema.Record(Schema.String, Schema.Unknown),
    Schema.Literal(false),
    Schema.Null,
  ])
);

const beadSchema = Schema.Struct({
  assignee: Schema.optional(Schema.Unknown),
  id: Schema.String,
  metadata: metadataSchema,
  status: Schema.String,
});

const queueSchema = Schema.Array(
  Schema.Struct({
    ...beadSchema.fields,
    labels: Schema.optional(
      Schema.Union([
        Schema.Array(Schema.Unknown),
        Schema.Literal(false),
        Schema.Null,
      ])
    ),
  })
).check(
  Schema.makeFilter(
    (beads) => new Set(beads.map((bead) => bead.id)).size === beads.length,
    { expected: "unique bead IDs" }
  )
);

const stateSchema = Schema.Struct({
  sent_at: Schema.Finite.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.makeFilter(Number.isInteger)
  ),
  snapshot: Schema.Array(Schema.Unknown),
});

const pendingSchema = Schema.Struct({
  in_flight: Schema.Array(Schema.Struct({ message: Schema.String })),
  pending: Schema.Array(Schema.Struct({ message: Schema.String })),
  schema_version: Schema.Literal("1"),
});

const receiptFields = {
  delivery: Schema.Literal("wait-idle"),
  ok: Schema.Literal(true),
  schema_version: Schema.Literal("1"),
};

const receiptSchema = Schema.Union([
  Schema.Struct({
    ...receiptFields,
    outcome: Schema.Literal("queued"),
    queued: Schema.Literal(true),
  }),
  Schema.Struct({
    ...receiptFields,
    outcome: Schema.Literal("delivered"),
    queued: Schema.Literal(false),
  }),
]);

const dependencyLabels = new Set([
  "dependency-update",
  "dependency-review",
  "dependency-remediation",
]);

const dependencyStatusSchema = Schema.Literals([
  "open",
  "in_progress",
  "blocked",
  "deferred",
  "closed",
]);

const trackedMetadata =
  /^dependency_(?:package|target|phase|commit|remediation|blocker|decision|disposition)(?:$|_)/u;

const selectDependencies = (beads: typeof queueSchema.Type) =>
  beads
    .map((entry) => ({
      ...entry,
      labels: entry.labels === false ? [] : (entry.labels ?? []),
      metadata: entry.metadata === false ? {} : (entry.metadata ?? {}),
    }))
    .filter((entry) => {
      const dependencyPackage = entry.metadata.dependency_package;

      return (
        (dependencyPackage !== null &&
          dependencyPackage !== undefined &&
          dependencyPackage !== false &&
          dependencyPackage !== "") ||
        entry.labels.some(
          (label) =>
            Schema.is(Schema.String)(label) && dependencyLabels.has(label)
        )
      );
    });

const snapshotSchema = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    metadata: Schema.Record(Schema.String, Schema.Unknown),
    status: dependencyStatusSchema,
  })
);

class WakeOperationError extends Schema.TaggedError<
  WakeOperationError,
  { readonly brand: unique symbol }
>()("WakeOperationError", {
  cause: Schema.Defect(),
  operation: Schema.String,
}) {
  override get message() {
    return `${this.operation}: ${String(this.cause)}`;
  }

  get [Runtime.errorExitCode]() {
    return this.cause instanceof ExecaError ? (this.cause.exitCode ?? 1) : 1;
  }
}

const attempt = <A>(operation: string, action: () => PromiseLike<A>) =>
  Effect.tryPromise({
    catch: (cause) => new WakeOperationError({ cause, operation }),
    try: action,
  });

const command = Effect.fn("supervision.command")(
  (program: "gc" | "jq", args: string[], input?: string) =>
    Effect.acquireUseRelease(
      Effect.try({
        catch: (cause) => new WakeOperationError({ cause, operation: program }),
        try: () => ({
          child: execa(program, args, {
            cleanup: false,
            forceKillAfterDelay: false,
            input,
            stdio: [
              input === undefined ? "inherit" : "pipe",
              "pipe",
              "inherit",
              "ignore",
              "ignore",
              "ignore",
              "ignore",
              "ignore",
              "ignore",
              9,
            ],
          }),
        }),
      }),
      ({ child }) =>
        attempt(program, async () => await child).pipe(
          Effect.map((result) => result.stdout)
        ),
      ({ child }) =>
        Effect.sync(() => child.kill()).pipe(
          Effect.andThen(
            Effect.exit(attempt(program, async () => await child))
          ),
          Effect.asVoid
        )
    )
);

const decodeJson = <S extends Schema.Constraint>(schema: S, value: string) =>
  Schema.decodeEffect(Schema.fromJsonString(schema))(value);

const reconcileWake = Effect.fn("supervision.reconcileWake")(
  function* reconcileWake() {
    const city = yield* Config.NonEmptyString("GC_CITY");

    const packRoot = path.resolve(
      fileURLToPath(new URL("../..", import.meta.url))
    );

    const stateDirectory = path.join(
      city,
      ".gc/dependency-updates/supervision"
    );

    const stateFile = path.join(stateDirectory, "wake.json");
    const message = `Reconcile the personal-site dependency queue using ${packRoot}/SUPERVISION.md. Read current beads and ownership first. Continue scoped remediation until verified landed or explicitly deferred by the user.`;

    const gc = (...args: string[]) => command("gc", ["--city", city, ...args]);

    const queue = yield* gc(
      "--rig",
      "personal-site",
      "bd",
      "list",
      "--all",
      "--limit",
      "0",
      "--json"
    );

    const beads = yield* decodeJson(queueSchema, queue);

    const snapshot = yield* Schema.decodeUnknownEffect(snapshotSchema)(
      selectDependencies(beads)
    );

    const canonical = yield* command(
      "jq",
      [
        "-cS",
        "--argjson",
        "ids",
        JSON.stringify(snapshot.map((entry) => entry.id)),
        "--arg",
        "tracked",
        trackedMetadata.source,
        `map(select(.id as $id | $ids | index($id)))
      | map({id, status, assignee: (.assignee // ""),
          metadata: ((.metadata // {}) | with_entries(select(.key | test($tracked))))})
      | sort_by(.id)`,
      ],
      queue
    );

    const snapshotId = createHash("sha256").update(canonical).digest("hex");

    if (process.argv[2] === "--snapshot") {
      yield* Effect.sync(() =>
        process.stdout.write(
          `{"snapshot":${canonical},"snapshot_id":${JSON.stringify(snapshotId)}}\n`
        )
      );

      return;
    }

    const now = Math.floor(DateTime.toEpochMillis(yield* DateTime.now) / 1000);

    const stateExists = yield* attempt(
      "inspect wake state",
      async () => await stat(stateFile)
    ).pipe(
      Effect.map((information) => information.isFile()),
      Effect.catchIf(
        (error) =>
          Schema.is(Schema.Struct({ code: Schema.Literal("ENOENT") }))(
            error.cause
          ),
        () => Effect.succeed(false)
      )
    );

    const previousText = stateExists
      ? yield* attempt(
          "read wake state",
          async () => await readFile(stateFile, "utf-8")
        )
      : '{"sent_at":0,"snapshot":[]}';

    const previous = yield* decodeJson(stateSchema, previousText);

    if (snapshot.length === 0 && !stateExists) {
      return;
    }

    const finished = snapshot.every(
      (entry) =>
        entry.status === "closed" ||
        (entry.status === "deferred" &&
          entry.metadata.dependency_disposition === "deferred" &&
          entry.metadata.dependency_decision_by === "human" &&
          Schema.is(Schema.NonEmptyString)(
            entry.metadata.dependency_decision_reference
          ))
    );

    if (finished) {
      const records = yield* decodeJson(
        Schema.Array(beadSchema),
        yield* gc(
          "bd",
          "list",
          "--all",
          "--limit",
          "0",
          "--label",
          "dependency-supervision",
          "--json"
        )
      );

      const acknowledgements = records.filter(
        (entry) => entry.status === "in_progress" && entry.assignee === "mayor"
      );

      if (
        acknowledgements.length === 1 &&
        (acknowledgements[0]?.metadata === false
          ? undefined
          : acknowledgements[0]?.metadata
        )?.dependency_supervision_ack === snapshotId
      ) {
        return;
      }
    }

    const elapsed = now - previous.sent_at;

    if (elapsed >= 0 && elapsed < 900) {
      const unchanged = yield* command(
        "jq",
        ["--argjson", "snapshot", canonical, ".snapshot == $snapshot"],
        previousText
      );

      if (unchanged === "true") {
        return;
      }
    }

    const pending = yield* decodeJson(
      pendingSchema,
      yield* gc("nudge", "status", "mayor", "--json")
    );

    if (
      [...pending.pending, ...pending.in_flight].some(
        (entry) => entry.message === message
      )
    ) {
      return;
    }

    const receiptText = yield* gc(
      "session",
      "nudge",
      "mayor",
      "--delivery",
      "wait-idle",
      message,
      "--json"
    );

    yield* decodeJson(receiptSchema, receiptText);

    const temporaryFile = path.join(stateDirectory, `wake.${randomUUID()}`);

    yield* Effect.acquireUseRelease(
      attempt(
        "create temporary wake receipt",
        async () => await open(temporaryFile, "wx", 0o600)
      ),
      (handle) =>
        attempt("write wake receipt", async () => {
          await handle.writeFile(
            `{"snapshot":${canonical},"snapshot_id":${JSON.stringify(snapshotId)},"sent_at":${JSON.stringify(now)},"receipt":${receiptText}}\n`
          );
        }).pipe(
          Effect.andThen(
            attempt("close wake receipt", async () => {
              await handle.close();
            })
          ),
          Effect.andThen(
            attempt("publish wake receipt", async () => {
              await rename(temporaryFile, stateFile);
            })
          ),
          Effect.uninterruptible
        ),
      (handle) =>
        Effect.gen(function* releaseReceipt() {
          const closed = yield* Effect.exit(
            attempt("close wake receipt", async () => {
              await handle.close();
            })
          );

          yield* attempt("remove temporary wake receipt", async () => {
            await rm(temporaryFile, { force: true });
          });
          yield* closed;
        })
    );

    yield* Effect.sync(() => process.stdout.write(`${receiptText}\n`));
  }
);

BunRuntime.runMain(
  reconcileWake().pipe(
    Effect.tapCause((cause) =>
      Cause.hasInterruptsOnly(cause)
        ? Effect.void
        : Effect.sync(() => process.stderr.write(`${Cause.pretty(cause)}\n`))
    )
  ),
  { disableErrorReporting: true }
);
