export function formatDayCount(days: number) {
  const display = roundDays(days);
  const unit = Math.abs(Number(display)) <= 1 ? "Day" : "Days";
  return `${display} ${unit}`;
}

/**
 * Clean numeric day value for compact UI (rings, donut centre, legends):
 * at most 1 decimal, no trailing ".0". e.g. 14.59 -> "14.6", 19 -> "19".
 */
export function roundDays(days: number): string {
  const rounded = Math.round(days * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
