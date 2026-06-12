import assert from "node:assert/strict";
import test from "node:test";
import {
  optionalPasswordFieldSchema,
  passwordFieldSchema,
} from "@/lib/password-policy";

test("passwordFieldSchema rejects passwords shorter than 8 characters", () => {
  const result = passwordFieldSchema.safeParse("short");
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /at least 8/i);
  }
});

test("passwordFieldSchema accepts 8 character passwords", () => {
  const result = passwordFieldSchema.safeParse("12345678");
  assert.equal(result.success, true);
});

test("optionalPasswordFieldSchema treats blank passwords as omitted", () => {
  assert.equal(optionalPasswordFieldSchema.safeParse("").success, true);
  assert.equal(optionalPasswordFieldSchema.safeParse("   ").success, true);
  assert.equal(optionalPasswordFieldSchema.safeParse(undefined).success, true);
});

test("optionalPasswordFieldSchema rejects short non-empty passwords", () => {
  const result = optionalPasswordFieldSchema.safeParse("123456");
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /at least 8/i);
  }
});
