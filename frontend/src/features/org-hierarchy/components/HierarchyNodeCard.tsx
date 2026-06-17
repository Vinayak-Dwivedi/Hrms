"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarClassFor } from "@/components/manager/team-attendance-shared";
import { employeeIconXs } from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

export type HierarchyNodeKind = "department" | "subDepartment" | "employee";

type Props = {
  kind: HierarchyNodeKind;
  title: string;
  subtitle?: string | null;
  count?: number;
  selected?: boolean;
  highlighted?: boolean;
  empId?: string;
  profilePhotoUrl?: string | null;
  employeeId?: number;
  onClick?: () => void;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 shrink-0">
      {count}
    </span>
  );
}

export default function HierarchyNodeCard({
  kind,
  title,
  subtitle,
  count,
  selected = false,
  highlighted = false,
  empId,
  profilePhotoUrl,
  employeeId,
  onClick,
}: Props) {
  const isEmployee = kind === "employee";
  const initial = initialsFromName(title);

  return (
    <div
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
        selected
          ? "border-blue-500 bg-blue-50/80 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80",
        highlighted && !selected && "ring-2 ring-amber-300 ring-offset-1",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer text-left"
      >
        {isEmployee ? (
          <Avatar size="sm" className="size-9 shrink-0">
            {profilePhotoUrl ? (
              <AvatarImage src={profilePhotoUrl} alt={title} />
            ) : null}
            <AvatarFallback
              className={cn(
                "text-[11px] font-semibold text-white",
                empId ? avatarClassFor(empId) : "bg-gray-400",
              )}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-[13px] font-semibold text-gray-700",
              selected && "border-blue-200 bg-blue-100/60 text-blue-800",
            )}
          >
            {initial.slice(0, 1)}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-gray-900">
            {title}
          </span>
          {subtitle ? (
            <span className="block truncate text-[11px] text-gray-500 mt-0.5">
              {subtitle}
            </span>
          ) : null}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {count != null ? <CountBadge count={count} /> : null}
        {isEmployee && employeeId != null ? (
          <Link
            href={`/employees/${employeeId}`}
            title="Open employee profile"
            className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-blue-600 group-hover:opacity-100 focus:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className={employeeIconXs} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
