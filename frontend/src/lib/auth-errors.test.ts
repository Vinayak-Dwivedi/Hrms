import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapAuthError } from "./auth-errors";

describe("mapAuthError", () => {
  it("maps known auth error codes", () => {
    assert.equal(
      mapAuthError({ error: { code: "INVALID_CREDENTIALS" } }, 401),
      "Login ID or password is incorrect.",
    );
    assert.equal(
      mapAuthError({ error: { code: "PERSONAL_EMAIL_LOGIN" } }, 401),
      "Personal email cannot be used to sign in. Use your work email or employee ID.",
    );
    assert.equal(
      mapAuthError({ error: { code: "RATE_LIMITED" } }, 429),
      "Too many attempts. Please wait a moment and try again.",
    );
    assert.equal(
      mapAuthError({ error: { code: "ACCOUNT_INACTIVE" } }, 403),
      "Your account is not active. Please contact HR.",
    );
  });

  it("falls back to status-based messages", () => {
    assert.equal(mapAuthError({}, 422), "Please enter both login ID and password.");
    assert.equal(mapAuthError({}, 429), "Too many attempts. Please wait a moment and try again.");
    assert.equal(
      mapAuthError({}, 500),
      "Unable to reach the server. Check your connection and try again.",
    );
  });
});
