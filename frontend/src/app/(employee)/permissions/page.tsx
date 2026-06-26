
"use client";

import { useState } from "react";
import { Shield, ShieldPlus } from "lucide-react";
import { employeeCardClass } from "@/features/employees/employee-theme";
import AddPermissionPage from "@/app/(employee)/add-permission/page";
import UserRolesPage from "@/app/(employee)/user-roles/page";

type Tab = "add-permission" | "system-roles";
const TABS: { key: Tab; label: string; Icon: typeof Shield }[] = [
  { key: "add-permission", label: "Add Permission", Icon: ShieldPlus },
  { key: "system-roles", label: "System Access Roles", Icon: Shield },
];

export default function PermissionsPage() {
  const [tab, setTab] = useState<Tab>("add-permission");

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tab header */}
      <div className={`${employeeCardClass} px-2 py-2 inline-flex gap-1 self-start`}>
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-[13px] font-medium transition-colors border-0 cursor-pointer",
                active
                  ? "bg-[lab(36.9089%_35.0961_-85.6872)] text-white"
                  : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100",
              ].join(" ")}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div key={tab} className="animate-fade-in">
        {tab === "add-permission" && <AddPermissionPage />}
        {tab === "system-roles" && <UserRolesPage />}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 200ms ease-out both;
        }
      `}</style>
    </div>
  );
}
