import { isProxy } from "node:util/types";

import { Predicate, Result, Schema } from "effect";

const nonblankString = Schema.String.check(Schema.isPattern(/\S/u));

const commit = Schema.String.check(
  Schema.isBetweenLength(40, 40),
  Schema.isPattern(/^[\da-f]{40}$/iu)
);

const identity = Schema.Struct({
  baseCommit: commit,
  candidateCommit: commit,
  candidateTree: commit,
  taskId: nonblankString,
  verifierCommit: commit,
});

const check = Schema.Struct({
  exitCode: Schema.Literal(0),
  name: nonblankString,
});

const evidence = Schema.Struct({
  ...identity.fields,
  attemptId: nonblankString,
  checks: Schema.NonEmptyArray(check),
});

const identityFields = Object.keys(identity.fields);
const evidenceFields = Object.keys(evidence.fields);
const checkFields = Object.keys(check.fields);
const decodeIdentity = Schema.decodeUnknownResult(identity, { errors: "all" });
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

export const validateEvidence = (record, expected) => {
  const errors = [];
  const recordData = ownData(record, evidenceFields);

  if (recordData !== undefined) {
    const { checks } = recordData;
    recordData.checks =
      isProxy(checks) || !Array.isArray(checks)
        ? undefined
        : Array.from({ length: checks.length }, (_, index) =>
            ownData(ownValue(checks, String(index)), checkFields)
          );
  }

  const decodedRecord = decodeEvidence(recordData);
  const decodedExpected = decodeIdentity(ownData(expected, identityFields));

  for (const [label, decoded] of [
    ["record", decodedRecord],
    ["expected", decodedExpected],
  ]) {
    if (Result.isFailure(decoded)) {
      errors.push(`${label}: ${decoded.failure.message}`);
    }
  }

  if (Result.isSuccess(decodedRecord) && Result.isSuccess(decodedExpected)) {
    for (const field of identityFields) {
      if (decodedRecord.success[field] !== decodedExpected.success[field]) {
        errors.push(`record.${field} does not match expected.${field}`);
      }
    }
  }

  return { errors, ok: errors.length === 0 };
};
