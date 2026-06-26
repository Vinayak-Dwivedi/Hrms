export type StandardShiftTiming = {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  timingDisplay: string;
};

export const DEFAULT_STANDARD_SHIFT_TIMINGS: StandardShiftTiming[] = [
  {
    key: "morning",
    label: "Morning Shift",
    startTime: "09:00",
    endTime: "19:00",
    timingDisplay: "09:00 AM – 07:00 PM",
  },
  {
    key: "evening",
    label: "Evening Shift",
    startTime: "13:00",
    endTime: "22:00",
    timingDisplay: "01:00 PM – 10:00 PM",
  },
  {
    key: "night",
    label: "Night Shift",
    startTime: "22:00",
    endTime: "07:00",
    timingDisplay: "10:00 PM – 07:00 AM",
  },
];

/** Parse "09:00 AM" / "07:00 PM" or "09:00" into 24-hour HH:mm. */
export function parseClockTo24h(raw: string): string | null {
  const trimmed = raw.trim();
  const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = ampm[2];
    const period = ampm[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  const plain = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (!plain) return null;
  return `${plain[1]!.padStart(2, "0")}:${plain[2]}`;
}

function format24hDisplay(t: string): string {
  const [hhStr, mm] = t.split(":");
  let hh = Number(hhStr);
  if (!Number.isFinite(hh)) return t;
  const period = hh >= 12 ? "PM" : "AM";
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return `${String(hh).padStart(2, "0")}:${mm ?? "00"} ${period}`;
}

function normalizeEntry(
  key: string,
  entry: unknown,
): StandardShiftTiming | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as {
    label?: unknown;
    login?: unknown;
    logout?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };
  const loginRaw =
    typeof row.login === "string"
      ? row.login
      : typeof row.startTime === "string"
        ? row.startTime
        : "";
  const logoutRaw =
    typeof row.logout === "string"
      ? row.logout
      : typeof row.endTime === "string"
        ? row.endTime
        : "";
  const startTime = parseClockTo24h(loginRaw);
  const endTime = parseClockTo24h(logoutRaw);
  if (!startTime || !endTime) return null;
  const label =
    typeof row.label === "string" && row.label.trim()
      ? row.label.trim()
      : key.charAt(0).toUpperCase() + key.slice(1);
  return {
    key,
    label,
    startTime,
    endTime,
    timingDisplay: `${format24hDisplay(startTime)} – ${format24hDisplay(endTime)}`,
  };
}

/** Parse SHIFT_TIMINGS from env (JSON object or array). */
export function parseShiftTimingsEnv(
  raw: string | undefined,
): StandardShiftTiming[] {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_STANDARD_SHIFT_TIMINGS;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      const options = parsed
        .map((entry, index) => {
          if (entry && typeof entry === "object" && "key" in entry) {
            const row = entry as { key?: unknown };
            const key =
              typeof row.key === "string" ? row.key.trim() : `shift-${index + 1}`;
            return normalizeEntry(key, entry);
          }
          return normalizeEntry(`shift-${index + 1}`, entry);
        })
        .filter((row): row is StandardShiftTiming => row != null);
      return options.length > 0 ? options : DEFAULT_STANDARD_SHIFT_TIMINGS;
    }
    if (parsed && typeof parsed === "object") {
      const options = Object.entries(parsed as Record<string, unknown>)
        .map(([key, entry]) => normalizeEntry(key, entry))
        .filter((row): row is StandardShiftTiming => row != null);
      return options.length > 0 ? options : DEFAULT_STANDARD_SHIFT_TIMINGS;
    }
  } catch {
    return DEFAULT_STANDARD_SHIFT_TIMINGS;
  }

  return DEFAULT_STANDARD_SHIFT_TIMINGS;
}

export function findMatchingStandardShift(
  startTime: string,
  endTime: string,
  standards: StandardShiftTiming[],
): StandardShiftTiming | null {
  const start = parseClockTo24h(startTime) ?? startTime.slice(0, 5);
  const end = parseClockTo24h(endTime) ?? endTime.slice(0, 5);
  return (
    standards.find((s) => s.startTime === start && s.endTime === end) ?? null
  );
}
