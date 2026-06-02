import type { LeaveType } from "@/lib/dashboard";

interface LeaveBalanceProps {
  leaves: LeaveType[];
}

function LeaveRing({ used, total }: { used: number; total: number }) {
  const r = 26;
  const cx = 32;
  const cy = 32;
  const circumference = 2 * Math.PI * r;
  const ratio = total === 0 ? 0 : used / total;
  const dashoffset = circumference * (1 - ratio);

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth="4" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#be185d"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="700"
        fill="#1f2937"
      >
        {used}/{total}
      </text>
    </svg>
  );
}

export default function LeaveBalance({ leaves }: LeaveBalanceProps) {
  const totalLeaves = leaves.reduce((sum, l) => sum + l.total, 0);
  const usedLeaves = leaves.reduce((sum, l) => sum + l.used, 0);
  const balanceLeaves = leaves.reduce((sum, l) => sum + l.available, 0);

  const rows = [
    { id: "total", name: "Total Leaves", code: "TOT", used: usedLeaves, total: totalLeaves, days: totalLeaves },
    { id: "used", name: "Used Leaves", code: "USD", used: usedLeaves, total: totalLeaves, days: usedLeaves },
    { id: "balance", name: "Balance Leaves", code: "BAL", used: balanceLeaves, total: totalLeaves, days: balanceLeaves },
  ];

  return (
    <div
      className="flex-1 bg-white rounded-2xl p-6"
      style={{
        border: "1px solid #f3f4f6",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[17px] font-semibold text-gray-900">Leave Balance</h2>
        <a href="#" className="text-sm font-medium no-underline" style={{ color: "#be185d" }}>
          View all →
        </a>
      </div>

      <div>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="flex items-center gap-4 py-4"
            style={{ borderBottom: index < rows.length - 1 ? "1px solid #f3f4f6" : undefined }}
          >
            <LeaveRing used={row.used} total={row.total} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{row.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                {row.days} days
              </p>
            </div>

            <span
              className="text-xs font-semibold rounded-md shrink-0"
              style={{
                padding: "4px 10px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                color: "#6b7280",
              }}
            >
              {row.code}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
