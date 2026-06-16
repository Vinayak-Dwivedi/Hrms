export function formatDayCount(days: number) {
  const rounded = Math.round(days * 10) / 10;
  const display = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
  const unit = Math.abs(rounded) <= 1 ? "Day" : "Days";
  return `${display} ${unit}`;
}
