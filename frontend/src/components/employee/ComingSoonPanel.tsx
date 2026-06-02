import type { LucideIcon } from "lucide-react";

interface ComingSoonPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
}

// Themed placeholder for sections we haven't built backing endpoints for yet.
// Same visual language as the dashboard cards so the navigation feels
// consistent — no half-finished placeholder UI.
export default function ComingSoonPanel({
  icon: Icon,
  title,
  description,
  details,
}: ComingSoonPanelProps) {
  return (
    <div
      className="rounded-2xl bg-white"
      style={{
        border: "1px solid #e5e7eb",
        padding: 40,
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="rounded-2xl flex items-center justify-center mb-4"
          style={{
            width: 64,
            height: 64,
            background:
              "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
          }}
        >
          <Icon size={28} style={{ color: "#fff" }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p
          className="text-sm max-w-md"
          style={{ color: "#6b7280", lineHeight: 1.5 }}
        >
          {description}
        </p>

        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mt-4"
          style={{ background: "#fff1f2", color: "#be185d" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#ec4899" }}
          />
          COMING SOON
        </div>

        {details && details.length > 0 && (
          <ul
            className="mt-6 text-left"
            style={{
              listStyle: "none",
              padding: 0,
              maxWidth: 380,
              width: "100%",
            }}
          >
            {details.map((d) => (
              <li
                key={d}
                className="flex items-start gap-2 py-1.5 text-[13px]"
                style={{ color: "#374151" }}
              >
                <span
                  className="mt-1.5 rounded-full shrink-0"
                  style={{
                    width: 5,
                    height: 5,
                    background: "#be185d",
                  }}
                />
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
