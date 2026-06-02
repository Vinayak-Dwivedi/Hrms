import Redis from "ioredis";
import { env } from "@/env";

// Single shared client, lazily created on first use. We don't auto-connect at
// boot because:
//   - Dev on Windows may not have Redis installed.
//   - Tests should be able to import this module without a live connection.
let client: Redis | null = null;
let warnedUnavailable = false;

function logUnavailable(reason: string) {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  console.warn(
    `[redis] unavailable (${reason}). Refresh-token revocation is a no-op; rate-limit falls back to memory.`,
  );
}

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) {
    logUnavailable("REDIS_URL not set");
    return null;
  }
  if (client) return client;

  client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    // Don't crash the process on transient connection issues — log once and
    // let the per-operation try/catch wrappers fail-open.
    retryStrategy: (times) => Math.min(times * 200, 2000),
    reconnectOnError: () => true,
  });

  client.on("error", (err: Error) => {
    logUnavailable(err.message);
  });

  return client;
}

// ── refresh-token revocation list ────────────────────────────────────────────
// We track JWTs by their `jti` claim with a TTL matching the refresh-token
// lifetime, so the denylist auto-prunes. Access tokens are short-lived (15m)
// and not tracked — the cost of a Redis hit on every authenticated request
// isn't worth it for a 15-minute blast radius.

const REVOKED_PREFIX = "hrms:jwt:revoked:";

export async function revokeJti(jti: string, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return; // graceful no-op
  try {
    await r.set(`${REVOKED_PREFIX}${jti}`, "1", "EX", Math.max(ttlSeconds, 1));
  } catch (err) {
    console.warn(`[redis] revokeJti failed: ${(err as Error).message}`);
  }
}

export async function isJtiRevoked(jti: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return false; // graceful no-op — treat as not revoked
  try {
    const v = await r.get(`${REVOKED_PREFIX}${jti}`);
    return v !== null;
  } catch (err) {
    console.warn(`[redis] isJtiRevoked failed: ${(err as Error).message}`);
    // Fail-open: better to let a request through than to lock everyone out
    // if Redis hiccups. The token still has to pass JWT signature + expiry.
    return false;
  }
}
