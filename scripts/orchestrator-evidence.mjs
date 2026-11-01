import { isDeepStrictEqual } from "node:util";
import { isProxy } from "node:util/types";

import { Predicate, Result, Schema } from "effect";

const nonblankString = Schema.String.check(Schema.isPattern(/\S/u));

const commit = Schema.String.check(
  Schema.isBetweenLength(40, 40),
  Schema.isPattern(/^[\da-f]{40}$/iu)
);

const identity = Schema.Struct({
  attemptId: nonblankString,
  baseCommit: commit,
  candidateCommit: commit,
  candidateTree: commit,
  taskId: nonblankString,
  verifierCommit: commit,
});

const toolchain = Schema.Struct({
  arch: nonblankString,
  bun: nonblankString,
  node: nonblankString,
  platform: nonblankString,
});

const check = Schema.Struct({
  command: Schema.TupleWithRest(Schema.Tuple([nonblankString]), [
    Schema.String,
  ]),
  logArtifactId: nonblankString,
  name: nonblankString,
});

const successfulCheck = Schema.Struct({
  ...check.fields,
  exitCode: Schema.Literal(0),
});

const artifact = Schema.Struct({
  id: nonblankString,
  path: nonblankString,
  sha256: Schema.String.check(
    Schema.isBetweenLength(64, 64),
    Schema.isPattern(/^[\da-f]{64}$/iu)
  ),
});

const expectedEvidence = Schema.Struct({
  ...identity.fields,
  artifacts: Schema.NonEmptyArray(artifact),
  checks: Schema.NonEmptyArray(check),
  toolchain,
});

const evidence = Schema.Struct({
  ...expectedEvidence.fields,
  checks: Schema.NonEmptyArray(successfulCheck),
});

const identityFields = Object.keys(identity.fields);
const evidenceFields = Object.keys(evidence.fields);
const checkFields = Object.keys(successfulCheck.fields);
const artifactFields = Object.keys(artifact.fields);
const toolchainFields = Object.keys(toolchain.fields);

const decodeExpected = Schema.decodeUnknownResult(expectedEvidence, {
  errors: "all",
});

const decodeEvidence = Schema.decodeUnknownResult(evidence, { errors: "all" });

const ownValue = (record, key) =>
  Object.getOwnPropertyDescriptor(record, key)?.value;

const ownData = (value, fields) => {
  if (isProxy(value) || Array.isArray(value) || !Predicate.isObject(value)) {
    return;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return;
  }

  return Object.fromEntries(
    fields.map((field) => [field, ownValue(value, field)])
  );
};

const ownArray = (value, snapshot) => {
  if (isProxy(value) || !Array.isArray(value)) {
    return;
  }

  const items = [];
  const length = ownValue(value, "length");

  for (let index = 0; index < length; index += 1) {
    const item = snapshot(ownValue(value, String(index)));

    if (item === undefined) {
      return;
    }

    items.push(item);
  }

  return items;
};

const snapshotEvidence = (value) => {
  const data = ownData(value, evidenceFields);

  if (data === undefined) {
    return;
  }

  data.toolchain = ownData(data.toolchain, toolchainFields);
  data.artifacts = ownArray(data.artifacts, (item) =>
    ownData(item, artifactFields)
  );
  data.checks = ownArray(data.checks, (item) => {
    const checkData = ownData(item, checkFields);

    if (checkData !== undefined) {
      checkData.command = ownArray(checkData.command, (argument) => argument);
    }

    return checkData;
  });

  return data;
};

const validateReferences = (data, label, errors) => {
  const artifactIds = new Set();
  const checkNames = new Set();

  for (const item of data.artifacts) {
    if (artifactIds.has(item.id)) {
      errors.push(`${label}.artifacts contains duplicate ids`);
    }

    artifactIds.add(item.id);
  }

  for (const item of data.checks) {
    if (checkNames.has(item.name)) {
      errors.push(`${label}.checks contains duplicate names`);
    }

    checkNames.add(item.name);

    if (!artifactIds.has(item.logArtifactId)) {
      errors.push(`${label}.checks has an unresolved logArtifactId`);
    }
  }
};

export const validateEvidence = (record, expected) => {
  const errors = [];
  const decodedRecord = decodeEvidence(snapshotEvidence(record));
  const decodedExpected = decodeExpected(snapshotEvidence(expected));

  for (const [label, decoded] of [
    ["record", decodedRecord],
    ["expected", decodedExpected],
  ]) {
    if (Result.isFailure(decoded)) {
      errors.push(`${label}: ${decoded.failure.message}`);
    } else {
      validateReferences(decoded.success, label, errors);
    }
  }

  if (Result.isSuccess(decodedRecord) && Result.isSuccess(decodedExpected)) {
    const actual = decodedRecord.success;
    const wanted = decodedExpected.success;

    for (const field of identityFields) {
      if (actual[field] !== wanted[field]) {
        errors.push(`record.${field} does not match expected.${field}`);
      }
    }

    for (const field of ["toolchain", "artifacts"]) {
      if (!isDeepStrictEqual(actual[field], wanted[field])) {
        errors.push(`record.${field} does not match expected.${field}`);
      }
    }

    const actualChecks = actual.checks.map(
      ({ command, logArtifactId, name }) => ({
        command,
        logArtifactId,
        name,
      })
    );

    if (!isDeepStrictEqual(actualChecks, wanted.checks)) {
      errors.push("record.checks does not match expected.checks");
    }
  }

  return { errors, ok: errors.length === 0 };
};
