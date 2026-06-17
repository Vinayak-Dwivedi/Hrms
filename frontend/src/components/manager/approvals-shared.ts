export const approveBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer";

export const rejectBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#ff014f] text-[#ff014f] bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

export const APPROVAL_STATUS_CLASS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Forwarded: "bg-blue-100 text-blue-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtDayMonth(d: Date, includeYear = false) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  if (includeYear) {
    return `${day} ${month} ${d.getFullYear()}`;
  }
  return `${day} ${month}`;
}

function fmtDaysLabel(days: string) {
  const n = Number(days);
  if (!Number.isFinite(n)) return `${days} Days`;
  const display = Number.isInteger(n) ? n.toFixed(1) : String(n);
  const unit = n <= 1 ? "Day" : "Days";
  return `${display} ${unit}`;
}

export function fmtRange(from: string, to: string, days: string) {
  const f = parseYmd(from);
  const t = parseYmd(to);
  const daysLabel = fmtDaysLabel(days);

  if (from === to) {
    return `${fmtDayMonth(f, true)} (${daysLabel})`;
  }

  if (f.getFullYear() === t.getFullYear()) {
    return `${fmtDayMonth(f)} – ${fmtDayMonth(t)} ${t.getFullYear()} (${daysLabel})`;
  }

  return `${fmtDayMonth(f, true)} – ${fmtDayMonth(t, true)} (${daysLabel})`;
}

export const approveIconBtnClass =
  "text-green-700 hover:text-green-800 bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const rejectIconBtnClass =
  "text-[#ff014f] hover:text-[#eb0249] bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const forwardIconBtnClass =
  "text-gray-600 hover:text-gray-800 bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function fmtAppliedOn(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

export function fmtRegDateShort(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtRegDateFull(date: string) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-GB", { weekday: "long" });
  return `${fmtRegDateShort(date)} (${day})`;
}

export const PAGE_SIZE = 10;
