"use client";

import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchUpcomingHolidays,
  type UpcomingHoliday,
} from "@/lib/hrms-client";

function formatLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function typeStyles(type: UpcomingHoliday["type"]) {
  if (type === "National") return { bg: "#dbeafe", color: "#1d4ed8" };
  if (type === "Regional") return { bg: "#dcfce7", color: "#15803d" };
  return { bg: "#f3f4f6", color: "#6b7280" };
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<UpcomingHoliday[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchUpcomingHolidays(50);
        if (cancelled) return;
        setHolidays(data);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {loadError && (
        <div
          className="mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Failed to load holidays: {loadError}
        </div>
      )}

      <div
        className="rounded-2xl bg-white"
        style={{ border: "1px solid #e5e7eb" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div
            className="rounded-xl flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              background:
                "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
            }}
          >
            <Calendar size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
              Upcoming Holidays
            </h2>
            <p className="text-[11px]" style={{ color: "#9ca3af" }}>
              National, regional and optional holidays you can plan around.
            </p>
          </div>
        </div>

        {holidays === null && (
          <p
            className="text-center py-10 text-[12px]"
            style={{ color: "#9ca3af" }}
          >
            Loading holidays…
          </p>
        )}

        {holidays !== null && holidays.length === 0 && (
          <p
            className="text-center py-10 text-[12px]"
            style={{ color: "#9ca3af" }}
          >
            No upcoming holidays.
          </p>
        )}

        {holidays && holidays.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {holidays.map((h) => {
              const t = typeStyles(h.type);
              const d = new Date(`${h.date}T00:00:00`);
              const month = d
                .toLocaleString(undefined, { month: "short" })
                .toUpperCase();
              const day = String(d.getDate());
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-4 px-5 py-3"
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <div
                    className="flex flex-col items-center justify-center rounded-lg text-center shrink-0"
                    style={{
                      width: 48,
                      height: 48,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      className="text-[9px] font-bold"
                      style={{ color: "#dc143c" }}
                    >
                      {month}
                    </p>
                    <p className="text-[16px] font-bold text-gray-900 leading-none">
                      {day}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">
                      {h.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "#9ca3af" }}>
                      {formatLong(h.date)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{ background: t.bg, color: t.color }}
                  >
                    {h.type}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
