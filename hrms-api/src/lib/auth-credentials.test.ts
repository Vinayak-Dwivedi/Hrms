import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREDENTIAL_PROVIDER,
  isEmailLoginId,
  normalizeEmailLoginId,
  PERSONAL_EMAIL_LOGIN_CODE,
  PERSONAL_EMAIL_LOGIN_MESSAGE,
} from "@/lib/auth-credentials";

function credentialRowFromDb(row: {
  userId: string;
  email: string;
  name: string;
  role: string;
  password: string | null;
}) {
  if (!row.password) return null;
  return {
    userId: row.userId,
    email: row.email,
    name: row.name,
    role: row.role,
    password: row.password,
  };
}

describe("auth-credentials helpers", () => {
  it("detects email login ids", () => {
    assert.equal(isEmailLoginId("user@example.com"), true);
    assert.equal(isEmailLoginId("IASPL00001"), false);
  });

  it("normalizes email login ids", () => {
    assert.equal(normalizeEmailLoginId("  User@Example.COM "), "user@example.com");
  });

  it("uses credential provider constant", () => {
    assert.equal(CREDENTIAL_PROVIDER, "credential");
  });

  it("exposes personal-email login error metadata", () => {
    assert.equal(PERSONAL_EMAIL_LOGIN_CODE, "PERSONAL_EMAIL_LOGIN");
    assert.match(
      PERSONAL_EMAIL_LOGIN_MESSAGE,
      /work email or employee ID/i,
    );
  });

  it("drops credential rows without a password hash", () => {
    assert.equal(
      credentialRowFromDb({
        userId: "u1",
        email: "a@b.com",
        name: "Test",
        role: "user",
        password: null,
      }),
      null,
    );
    assert.deepEqual(
      credentialRowFromDb({
        userId: "u1",
        email: "a@b.com",
        name: "Test",
        role: "user",
        password: "$2a$10$hash",
      }),
      {
        userId: "u1",
        email: "a@b.com",
        name: "Test",
        role: "user",
        password: "$2a$10$hash",
      },
    );
  });
});
