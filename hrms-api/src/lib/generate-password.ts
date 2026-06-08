import { randomBytes } from "node:crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const ALL = `${UPPER}${LOWER}${DIGITS}`;

/** Generate a random password that satisfies the minimum length policy (8+ chars). */
export function generatePassword(length = 14): string {
  const size = Math.max(8, length);
  // String indexing with `noUncheckedIndexedAccess` returns `string | undefined`.
  // `.charAt()` returns `string` always, and the modulo guarantees a valid index.
  const chars: string[] = [
    UPPER.charAt(randomBytes(1)[0]! % UPPER.length),
    LOWER.charAt(randomBytes(1)[0]! % LOWER.length),
    DIGITS.charAt(randomBytes(1)[0]! % DIGITS.length),
  ];

  for (let i = chars.length; i < size; i++) {
    chars.push(ALL.charAt(randomBytes(1)[0]! % ALL.length));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join("");
}
