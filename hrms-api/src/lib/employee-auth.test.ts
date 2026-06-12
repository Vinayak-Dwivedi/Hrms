import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_INACTIVE_CODE,
  ACCOUNT_INACTIVE_MESSAGE,
} from "@/lib/employee-auth";

describe("employee-auth", () => {
  it("exposes inactive account error metadata", () => {
    assert.equal(ACCOUNT_INACTIVE_CODE, "ACCOUNT_INACTIVE");
    assert.match(ACCOUNT_INACTIVE_MESSAGE, /not active/i);
  });
});
