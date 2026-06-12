import assert from "node:assert/strict";
import test from "node:test";
import {
  extractDbErrorMessage,
  extractPostgresError,
  mapDbErrorToApiError,
} from "@/lib/db-error";

test("extractPostgresError walks Drizzle cause chain", () => {
  const pg = {
    code: "23505",
    message: 'duplicate key value violates unique constraint "employees_pan_no_hash_key"',
    detail:
      "Key (pan_no_hash)=(ecfd3ab6) already exists.",
    constraint_name: "employees_pan_no_hash_key",
  };
  const wrapped = {
    message: "Failed query: update employees ...",
    cause: pg,
  };

  assert.deepEqual(extractPostgresError(wrapped), pg);
  assert.equal(extractPostgresError(pg)?.code, "23505");
});

test("mapDbErrorToApiError maps nested PAN duplicate to DUPLICATE_PAN", () => {
  const err = {
    message: "Failed query: update employees set ...",
    cause: {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "employees_pan_no_hash_key"',
      constraint_name: "employees_pan_no_hash_key",
    },
  };

  const apiErr = mapDbErrorToApiError(err);
  assert.equal(apiErr.status, 409);
  assert.equal(apiErr.code, "DUPLICATE_PAN");
  assert.match(apiErr.message, /PAN/i);
  assert.match(extractDbErrorMessage(err), /duplicate key/i);
});
