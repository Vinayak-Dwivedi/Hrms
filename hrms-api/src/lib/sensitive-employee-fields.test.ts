import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { initSensitiveFieldCrypto } from "@/lib/sensitive-field-crypto";
import { isEncryptedValue } from "@/lib/sensitive-field-crypto";
import {
  decryptBankRow,
  decryptEmployeeLegacyRow,
  decryptIdentityRow,
  encryptBankSensitive,
  encryptEmployeeLegacySensitive,
  encryptIdentitySensitive,
  hashForSensitiveLookup,
  IDENTITY_SENSITIVE_FIELDS,
} from "@/lib/sensitive-employee-fields";

const TEST_KEYS = {
  encryptionKey:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  indexKey:
    "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
};

describe("sensitive-employee-fields", () => {
  before(() => {
    initSensitiveFieldCrypto(TEST_KEYS);
  });

  it("encrypts employee legacy fields for storage", () => {
    const stored = encryptEmployeeLegacySensitive({
      panNo: "ABCPD1234E",
      aadhaarNo: "123456789012",
      uanNo: null,
      esicNo: null,
    });
    assert.ok(isEncryptedValue(String(stored.panNo)));
    assert.ok(isEncryptedValue(String(stored.aadhaarNo)));
    assert.equal(stored.uanNo, null);
    assert.match(String(stored.panNoHash), /^[0-9a-f]{64}$/);
  });

  it("decrypts employee legacy rows for authorized reads", () => {
    const stored = encryptEmployeeLegacySensitive({
      panNo: "ABCPD1234E",
      aadhaarNo: "123456789012",
    });
    const plain = decryptEmployeeLegacyRow({
      id: 1,
      ...stored,
    });
    assert.equal(plain.panNo, "ABCPD1234E");
    assert.equal(plain.aadhaarNo, "123456789012");
    assert.equal("panNoHash" in plain, false);
  });

  it("encrypts and decrypts identity rows", () => {
    const stored = encryptIdentitySensitive({
      panNumber: "ABCPD1234E",
      aadhaarNumber: "123456789012",
      passportNumber: "P1234567",
      uanNumber: "123456789012",
      esicNumber: null,
    });
    const plain = decryptIdentityRow({
      employeeId: 1,
      ...stored,
    });
    assert.equal(plain.panNumber, "ABCPD1234E");
    assert.equal(plain.passportNumber, "P1234567");
  });

  it("encrypts bank account numbers", () => {
    const stored = encryptBankSensitive({
      accountNumber: "123456789012",
      accountName: "Test User",
    });
    const plain = decryptBankRow({
      id: 1,
      employeeId: 1,
      ...stored,
    });
    assert.equal(plain.accountNumber, "123456789012");
    assert.ok(isEncryptedValue(String(stored.accountNumber)));
  });

  it("stores normalized plaintext when hash columns are not available", () => {
    const stored = encryptBankSensitive(
      { accountNumber: "123456789012" },
      { includeHashes: false },
    );
    assert.equal(stored.accountNumber, "123456789012");
    assert.equal("accountNumberHash" in stored, false);
    assert.ok(!isEncryptedValue(String(stored.accountNumber)));
  });

  it("builds duplicate lookup hashes from plaintext PAN", () => {
    const panField = IDENTITY_SENSITIVE_FIELDS[0];
    assert.ok(panField);
    const hash = hashForSensitiveLookup(panField, "ABCPD1234E");
    const hashAgain = hashForSensitiveLookup(panField, "abcpd1234e");
    assert.equal(hash, hashAgain);
  });
});
