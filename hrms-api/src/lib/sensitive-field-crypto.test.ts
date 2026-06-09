import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import {
  computeSensitiveFieldHash,
  decryptSensitiveField,
  encryptSensitiveField,
  initSensitiveFieldCrypto,
  isEncryptedValue,
  ENC_PREFIX,
} from "@/lib/sensitive-field-crypto";

const TEST_KEYS = {
  encryptionKey:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  indexKey:
    "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
};

describe("sensitive-field-crypto", () => {
  before(() => {
    initSensitiveFieldCrypto(TEST_KEYS);
  });

  it("round-trips encrypt and decrypt", () => {
    const plain = "ABCPD1234E";
    const enc = encryptSensitiveField(plain);
    assert.ok(enc);
    assert.ok(isEncryptedValue(enc.ciphertext));
    assert.equal(decryptSensitiveField(enc.ciphertext), plain);
  });

  it("produces different ciphertext for the same plaintext", () => {
    const plain = "123456789012";
    const a = encryptSensitiveField(plain);
    const b = encryptSensitiveField(plain);
    assert.ok(a && b);
    assert.notEqual(a.ciphertext, b.ciphertext);
    assert.equal(a.hash, b.hash);
  });

  it("returns legacy plaintext when value is not encrypted", () => {
    assert.equal(decryptSensitiveField("ABCPD1234E"), "ABCPD1234E");
  });

  it("returns null for empty values", () => {
    assert.equal(encryptSensitiveField(null), null);
    assert.equal(decryptSensitiveField(null), null);
  });

  it("throws on tampered ciphertext", () => {
    const enc = encryptSensitiveField("123456789012");
    assert.ok(enc);
    const tampered = enc.ciphertext.replace(
      ENC_PREFIX,
      `${ENC_PREFIX}`,
    ).concat("x");
    assert.throws(() => decryptSensitiveField(tampered));
  });

  it("computes stable blind indexes", () => {
    const hash = computeSensitiveFieldHash("ABCPD1234E");
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hash, computeSensitiveFieldHash("ABCPD1234E"));
  });
});
