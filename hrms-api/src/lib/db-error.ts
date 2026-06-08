/** Unwrap Drizzle / postgres-js nested errors to the underlying Postgres message. */
export function extractDbErrorMessage(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  const seen = new Set<unknown>();

  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const row = cur as { message?: unknown; cause?: unknown; detail?: unknown };
    if (typeof row.message === "string" && row.message.length > 0) {
      parts.push(
        typeof row.detail === "string" && row.detail.length > 0
          ? `${row.message} (${row.detail})`
          : row.message,
      );
    }
    cur = row.cause;
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (!/^Failed query:/i.test(parts[i]!)) return parts[i]!;
  }

  if (e instanceof Error) return e.message;
  return String(e);
}
